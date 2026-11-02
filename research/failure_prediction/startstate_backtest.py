"""Feasibility study, step 4: does the registry record as it stood at the start add to the base rate?

Each trial gets the latest quarterly AACT snapshot dated on or before its start. A trial that was
not yet registered then gets the first snapshot within six months after its start, flagged as late.
Planned enrollment is used only while the record still calls it anticipated/estimated; a record that
already shows the trial finished is not used at all.

Walk-forward as before, test years 2018-2021 (snapshots begin in January 2017). Models:
  baseline        phase x area rate
  +genetics       baseline logit + Open Targets genetic evidence (as in genetics_backtest.py)
  +start record   the above + start-of-trial record features (logistic, cross-fitted baseline)
  boosting        gradient boosting on everything, including the baseline logit
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import KFold
from sklearn.preprocessing import StandardScaler

trials = pd.read_pickle(sys.argv[1])
ot = json.loads(Path(sys.argv[2]).read_text())
snap_dir = Path(sys.argv[3])
out_path = Path(sys.argv[4])
rng = np.random.default_rng(7)

# --- start-of-trial record ---------------------------------------------------------------------
snaps = sorted(snap_dir.glob("*.pkl"))
frames = [pd.read_pickle(p).reset_index() for p in snaps]
allsnap = pd.concat(frames, ignore_index=True)
allsnap = allsnap.sort_values(["nct_id", "snapshot"])
start = trials.set_index("nct_id")["start"]
allsnap["start"] = allsnap["nct_id"].map(start)
allsnap = allsnap[allsnap["start"].notna()]
before = allsnap[allsnap["snapshot"] <= allsnap["start"]].groupby("nct_id").tail(1).assign(late=0)
after = allsnap[(allsnap["snapshot"] > allsnap["start"]) &
                (allsnap["snapshot"] <= allsnap["start"] + pd.DateOffset(months=6))].groupby("nct_id").head(1).assign(late=1)
after = after[~after["nct_id"].isin(before["nct_id"])]
rec = pd.concat([before, after]).set_index("nct_id")
finished = rec["status_at"].str.upper().isin(["COMPLETED", "TERMINATED", "WITHDRAWN", "SUSPENDED"])
rec = rec[~finished]
planned = rec["enrollment_type"].isin(["ANTICIPATED", "ESTIMATED"])
MASK = {"NONE": 0, "NONE (OPEN LABEL)": 0, "OPEN LABEL": 0, "SINGLE": 1, "DOUBLE": 2, "TRIPLE": 3, "QUADRUPLE": 4}
feat = pd.DataFrame({
    "rec_present": 1,
    "rec_late": rec["late"],
    "log_planned_enrollment": np.where(planned, np.log1p(rec["enrollment"].astype(float)), np.nan),
    "log_facilities": np.log1p(rec["n_facilities"].astype(float)),
    "us_facility": rec["has_us_facility"].astype(float),
    "n_arms": rec["n_arms"].astype(float).clip(upper=8),
    "dmc": rec["has_dmc"].astype(float),
    "fda_regulated": rec["fda_regulated"].astype(float),
    "masking": rec["masking"].map(lambda m: MASK.get(str(m).upper(), np.nan)),
    "single_group": (rec["intervention_model"] == "SINGLE_GROUP").astype(float),
    "purpose_treatment": (rec["primary_purpose"] == "TREATMENT").astype(float),
    "n_primary": rec.get("n_primary", pd.Series(dtype=float)).astype(float).clip(upper=6),
    "primary_survival": rec.get("primary_survival", pd.Series(dtype=float)).astype(float),
    "primary_response": rec.get("primary_response", pd.Series(dtype=float)).astype(float),
}, index=rec.index)
REC_COLS = list(feat.columns)

df = trials.merge(feat, left_on="nct_id", right_index=True, how="left")
df["rec_present"] = df["rec_present"].fillna(0)
df["mapped"] = df.nct_id.map(lambda n: (ot.get(n) or {}).get("ot_mapped", 0))
df["gen"] = (df.nct_id.map(lambda n: (ot.get(n) or {}).get("ot_genetic_association", 0.0)) > 0).astype(int)
df["gen_nononc"] = df["gen"] * (df["area"] != "Oncology")


def rates(train, test, label, k=20):
    phase_rate = train.groupby("phase")[label].mean()
    overall = train[label].mean()
    cell = train.groupby(["phase", "area"])[label].agg(["sum", "count"])
    out = []
    for p, a in zip(test["phase"], test["area"]):
        prior = phase_rate.get(p, overall)
        if (p, a) in cell.index:
            s, n = cell.loc[(p, a)]
            out.append((s + k * prior) / (n + k))
        else:
            out.append(prior)
    return np.array(out)


def logit(p):
    p = np.clip(p, 1e-3, 1 - 1e-3)
    return np.log(p / (1 - p))


def rec_matrix(frame, fill):
    m = frame[REC_COLS].astype(float)
    miss = m.isna().astype(float).add_suffix("_missing")
    return pd.concat([m.fillna(fill).fillna(0.0), miss[[c + "_missing" for c in ("log_planned_enrollment", "log_facilities", "masking")]]], axis=1)


def run(sub, label, known, name, years=range(2018, 2022)):
    pooled = {k: [] for k in ("y", "base", "gen", "rec", "gb", "covered")}
    coverage = []
    for year in years:
        cut = pd.Timestamp(f"{year}-01-01")
        train = sub[sub[label].notna() & (sub.start < cut) & (sub[known] < cut)]
        test = sub[sub[label].notna() & (sub.start_year == year)]
        if len(test) < 50:
            continue
        cf = np.zeros(len(train))
        for tr_i, va_i in KFold(5, shuffle=True, random_state=year).split(train):
            cf[va_i] = rates(train.iloc[tr_i], train.iloc[va_i], label)
        base = rates(train, test, label)
        y_tr = train[label].astype(int)

        g_cols = lambda f, b: np.column_stack([logit(b), f["mapped"], f["gen"], f["gen_nononc"]])
        m_gen = LogisticRegression(max_iter=1000).fit(g_cols(train, cf), y_tr)

        fill = train[REC_COLS].astype(float).median()
        R_tr, R_te = rec_matrix(train, fill), rec_matrix(test, fill)
        sc = StandardScaler().fit(R_tr)
        X_tr = np.column_stack([g_cols(train, cf), sc.transform(R_tr)])
        X_te = np.column_stack([g_cols(test, base), sc.transform(R_te)])
        m_rec = LogisticRegression(max_iter=2000, C=0.3).fit(X_tr, y_tr)

        gb = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.04, max_leaf_nodes=15, min_samples_leaf=40,
                                            l2_regularization=1.0, random_state=7)
        G_tr = np.column_stack([g_cols(train, cf), train[REC_COLS].astype(float)])
        G_te = np.column_stack([g_cols(test, base), test[REC_COLS].astype(float)])
        keep = ~np.all(np.isnan(G_tr), axis=0)   # a column with no value in training cannot be binned
        G_tr, G_te = G_tr[:, keep], G_te[:, keep]
        gb.fit(G_tr, y_tr)

        pooled["y"].append(test[label].astype(int).to_numpy())
        pooled["base"].append(base)
        pooled["gen"].append(m_gen.predict_proba(g_cols(test, base))[:, 1])
        pooled["rec"].append(m_rec.predict_proba(X_te)[:, 1])
        pooled["gb"].append(gb.predict_proba(G_te)[:, 1])
        pooled["covered"].append((test["rec_present"] == 1).to_numpy())
        coverage.append({"year": year, "n_test": len(test), "covered": float((test["rec_present"] == 1).mean()),
                         "train_covered": float((train["rec_present"] == 1).mean()), "n_train": len(train)})
    P = {k: np.concatenate(v) for k, v in pooled.items()}
    y, cov = P["y"], P["covered"]

    def gain(a, b, mask=None):
        yy, pa, pb = (y, P[a], P[b]) if mask is None else (y[mask], P[a][mask], P[b][mask])
        g = []
        for _ in range(1000):
            i = rng.integers(0, len(yy), len(yy))
            if yy[i].min() == yy[i].max():
                continue
            g.append(roc_auc_score(yy[i], pa[i]) - roc_auc_score(yy[i], pb[i]))
        return [round(float(np.mean(g)), 4), round(float(np.percentile(g, 2.5)), 4), round(float(np.percentile(g, 97.5)), 4)]

    res = {"task": name, "n_test": int(len(y)), "fail_rate": float(y.mean()), "coverage": coverage,
           "auc": {k: round(float(roc_auc_score(y, P[k])), 4) for k in ("base", "gen", "rec", "gb")},
           "brier": {k: round(float(brier_score_loss(y, P[k])), 4) for k in ("base", "gen", "rec", "gb")},
           "auc_covered": {k: round(float(roc_auc_score(y[cov], P[k][cov])), 4) for k in ("base", "gen", "rec", "gb")},
           "gain_rec_vs_base": gain("rec", "base"), "gain_gb_vs_base": gain("gb", "base"),
           "gain_rec_vs_gen": gain("rec", "gen"),
           "gain_rec_vs_base_covered": gain("rec", "base", cov)}
    # Coefficients of the final year's start-record model, for reading which fields carry weight.
    names = ["base_logit", "mapped", "gen", "gen_nononc"] + list(rec_matrix(sub.head(5), sub[REC_COLS].astype(float).median()).columns)
    res["last_year_coefficients"] = dict(zip(names, np.round(m_rec.coef_[0], 3).tolist()))
    print(json.dumps(res, indent=1))
    return res


cov_all = df[df.label_a.notna() & (df.randomized == 1) & df.start_year.between(2018, 2021)]["rec_present"].mean()
print(f"start record found for {cov_all:.1%} of randomized task-A trials started 2018-2021")
results = {
    "A": run(df[df.randomized == 1], "label_a", "known_a", "Randomized: fails on biology vs meets endpoint"),
    "A_endpoint": run(df[(df.randomized == 1) & (df.source_a == "endpoint")], "label_a", "known_a",
                      "Randomized, posted results: missed vs met"),
    "B": run(df, "label_b", "known_b", "Biological stop among closed trials"),
}
out_path.write_text(json.dumps(results, indent=1))
