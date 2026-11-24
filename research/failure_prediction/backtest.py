"""Feasibility study, step 2: features known at start, history as of the start date, and a
walk-forward backtest against a phase x disease-area baseline.

For test year Y the model is trained only on trials that started before Y *and* whose outcome was
knowable before 1 January Y. It is then scored on trials that started in Y. History features
(prior failures of the same target, molecule, sponsor) count only outcomes knowable before each
trial's own start date, so no feature can see the future.
"""
from __future__ import annotations

import bisect
import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DATA = Path(sys.argv[1])
OUT = Path(sys.argv[2])
RNG = np.random.default_rng(7)

CATEGORICAL = ["phase", "area", "sponsor_class", "modality"]
OT_COLS = ["ot_mapped", "ot_genetic_association", "ot_somatic_mutation", "ot_animal_model",
           "ot_affected_pathway", "ot_rna_expression"]
NUMERIC_DESIGN = ["randomized", "placebo_arm", "active_comparator", "n_conditions", "n_interventions",
                  "n_experimental", "resolved_share", "has_target", "start_year"]


def history_features(df: pd.DataFrame, label: str, known: str, prefix: str) -> pd.DataFrame:
    """For every trial: outcomes of earlier trials sharing a target / molecule / sponsor that were
    knowable before this trial started."""
    events: dict[tuple, list] = defaultdict(list)
    lab = df[df[label].notna() & df[known].notna()]
    for kind, col in (("tgt", "targets"), ("mol", "molecules")):
        for keys, t, y in zip(lab[col], lab[known], lab[label]):
            for k in keys:
                events[(kind, k)].append((t, y))
    for s, t, y in zip(lab["sponsor"], lab[known], lab[label]):
        if s:
            events[("spo", s)].append((t, y))
    index = {}
    for key, ev in events.items():
        ev.sort(key=lambda e: e[0])
        times = [e[0] for e in ev]
        cum = np.cumsum([e[1] for e in ev])
        index[key] = (times, cum)

    def counts(key, start):
        if key not in index:
            return 0, 0
        times, cum = index[key]
        i = bisect.bisect_left(times, start)
        return i, (int(cum[i - 1]) if i else 0)

    out = defaultdict(list)
    for targets, molecules, sponsor, start in zip(df["targets"], df["molecules"], df["sponsor"], df["start"]):
        for kind, keys in (("tgt", targets), ("mol", molecules), ("spo", [sponsor] if sponsor else [])):
            n_tot, n_fail = 0, 0
            best_rate = np.nan
            for k in keys:
                n, f = counts((kind, k), start)
                n_tot += n
                n_fail += f
                if n:
                    rate = (f + 1) / (n + 2)
                    best_rate = rate if np.isnan(best_rate) else max(best_rate, rate)
            out[f"{prefix}{kind}_n"].append(n_tot)
            out[f"{prefix}{kind}_fail"].append(n_fail)
            out[f"{prefix}{kind}_rate"].append(best_rate)
    return pd.DataFrame(out, index=df.index)


def crowding(df: pd.DataFrame) -> pd.Series:
    """How many trials with the same target had started before this one (any outcome)."""
    starts = defaultdict(list)
    for keys, s in zip(df["targets"], df["start"]):
        for k in keys:
            starts[k].append(s)
    for v in starts.values():
        v.sort()
    return pd.Series([sum(bisect.bisect_left(starts[k], s) for k in keys) for keys, s in
                      zip(df["targets"], df["start"])], index=df.index)


def baseline_rates(train: pd.DataFrame, test: pd.DataFrame, label: str) -> np.ndarray:
    """Phase x disease-area failure rate from the training years, shrunk toward the phase rate."""
    phase_rate = train.groupby("phase")[label].mean()
    overall = train[label].mean()
    cell = train.groupby(["phase", "area"])[label].agg(["sum", "count"])
    k = 20
    preds = []
    for p, a in zip(test["phase"], test["area"]):
        prior = phase_rate.get(p, overall)
        if (p, a) in cell.index:
            s, n = cell.loc[(p, a)]
            preds.append((s + k * prior) / (n + k))
        else:
            preds.append(prior)
    return np.array(preds)


def evaluate(y, p) -> dict:
    p = np.clip(p, 1e-4, 1 - 1e-4)
    return {"auc": roc_auc_score(y, p), "brier": brier_score_loss(y, p), "logloss": log_loss(y, p)}


def run(df: pd.DataFrame, label: str, known: str, years: list[int], name: str, only=None) -> dict:
    # History is always built from every trial with this label; `only` restricts who is trained and
    # scored, so a narrower population still sees the full record of what failed before it.
    hist = history_features(df, label, known, "h_")
    feats = pd.concat([df, hist], axis=1)
    feats["has_target"] = feats["targets"].map(bool).astype(int)
    feats["tgt_crowding"] = crowding(df)
    if OT is not None:
        for c in OT_COLS:
            feats[c] = feats["nct_id"].map(lambda n, c=c: (OT.get(n) or {}).get(c, 0.0))
    if only is not None:
        feats = feats[only(feats)]
    numeric = NUMERIC_DESIGN + list(hist.columns) + ["tgt_crowding"] + (OT_COLS if OT is not None else [])

    pre = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore", min_frequency=20), CATEGORICAL),
        ("num", make_pipeline(StandardScaler()), numeric),
    ])
    rows, pooled = [], defaultdict(list)
    for year in years:
        cutoff = pd.Timestamp(f"{year}-01-01")
        train = feats[feats[label].notna() & (feats["start"] < cutoff) & (feats[known] < cutoff)]
        test = feats[feats[label].notna() & (feats["start_year"] == year)]
        if len(test) < 50 or train[label].nunique() < 2:
            continue
        ytr, yte = train[label].astype(int), test[label].astype(int)
        base = baseline_rates(train, test, label)

        Xtr_lr = train[CATEGORICAL + numeric].copy()
        Xte_lr = test[CATEGORICAL + numeric].copy()
        med = Xtr_lr[numeric].median()
        Xtr_lr[numeric] = Xtr_lr[numeric].fillna(med)
        Xte_lr[numeric] = Xte_lr[numeric].fillna(med)
        lr = make_pipeline(pre, LogisticRegression(max_iter=2000, C=0.5, class_weight=None))
        lr.fit(Xtr_lr, ytr)
        p_lr = lr.predict_proba(Xte_lr)[:, 1]

        Xtr = train[CATEGORICAL + numeric].copy()
        Xte = test[CATEGORICAL + numeric].copy()
        for c in CATEGORICAL:
            cats = pd.CategoricalDtype(sorted(Xtr[c].astype(str).unique()))
            Xtr[c] = Xtr[c].astype(str).astype(cats)
            Xte[c] = Xte[c].astype(str).astype(cats)
        gb = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.05, max_leaf_nodes=15,
                                            min_samples_leaf=40, l2_regularization=1.0,
                                            categorical_features="from_dtype", random_state=7)
        gb.fit(Xtr, ytr)
        p_gb = gb.predict_proba(Xte)[:, 1]

        # Lean model: the baseline as the starting point, adjusted only by what happened before to the
        # same target, molecule and sponsor. Missing history means "no evidence", i.e. the baseline.
        # The baseline for training rows is fitted on the training rows themselves (in-sample), which
        # is what the model will see at prediction time too: a rate from earlier years.
        def lean_X(frame, base_p):
            logit = np.log(np.clip(base_p, 1e-3, 1 - 1e-3) / (1 - np.clip(base_p, 1e-3, 1 - 1e-3)))
            cols = [logit]
            for c in ("h_tgt_rate", "h_mol_rate", "h_spo_rate"):
                r = frame[c].to_numpy(dtype=float)
                cols.append(np.where(np.isnan(r), 0.0, np.log(np.clip(r, 1e-3, 1 - 1e-3) / (1 - np.clip(r, 1e-3, 1 - 1e-3))) - logit))
                cols.append(np.log1p(frame[c.replace("_rate", "_n")].to_numpy(dtype=float)))
            if "ot_genetic_association" in frame:
                cols += [frame["ot_mapped"].to_numpy(dtype=float), frame["ot_genetic_association"].to_numpy(dtype=float),
                         frame["ot_somatic_mutation"].to_numpy(dtype=float)]
            return np.column_stack(cols)
        base_tr = baseline_rates(train, train, label)
        lean = LogisticRegression(max_iter=2000, C=1.0)
        lean.fit(lean_X(train, base_tr), ytr)
        p_lean = lean.predict_proba(lean_X(test, base))[:, 1]

        row = {"year": year, "n_train": len(train), "n_test": len(test), "test_rate": float(yte.mean())}
        for key, p in (("baseline", base), ("logistic", p_lr), ("boosting", p_gb), ("lean", p_lean)):
            m = evaluate(yte, p)
            row.update({f"{key}_{k}": v for k, v in m.items()})
            pooled[key].append(p)
        pooled["y"].append(yte.to_numpy())
        pooled["has_hist"].append(((test["ot_mapped"] if "ot_mapped" in test else test["h_tgt_n"]) > 0).to_numpy())
        rows.append(row)

    y = np.concatenate(pooled["y"])
    has_hist = np.concatenate(pooled["has_hist"])
    summary = {"task": name, "years": rows, "n_test": int(len(y)), "test_rate": float(y.mean())}
    for key in ("baseline", "logistic", "boosting", "lean"):
        p = np.concatenate(pooled[key])
        summary[key] = evaluate(y, p)
        summary[key]["auc_with_target_history"] = roc_auc_score(y[has_hist], p[has_hist]) if has_hist.sum() > 50 else None
        # Lift: failure rate among the 10 % the model ranks riskiest, against the overall rate.
        top = p >= np.quantile(p, 0.9)
        summary[key]["top_decile_rate"] = float(y[top].mean())
        summary[key]["bottom_decile_rate"] = float(y[p <= np.quantile(p, 0.1)].mean())
        # Calibration by quintile.
        q = pd.qcut(p, 5, labels=False, duplicates="drop")
        summary[key]["calibration"] = [{"pred": float(p[q == i].mean()), "obs": float(y[q == i].mean()),
                                        "n": int((q == i).sum())} for i in sorted(set(q))]
    # Is the best model's AUC gain over the baseline more than resampling noise?
    pb, pm = np.concatenate(pooled["baseline"]), np.concatenate(pooled["boosting"])
    pl = np.concatenate(pooled["logistic"])
    pn = np.concatenate(pooled["lean"])
    diffs = {"boosting": [], "logistic": [], "lean": []}
    for _ in range(1000):
        i = RNG.integers(0, len(y), len(y))
        if y[i].min() == y[i].max():
            continue
        b = roc_auc_score(y[i], pb[i])
        diffs["boosting"].append(roc_auc_score(y[i], pm[i]) - b)
        diffs["logistic"].append(roc_auc_score(y[i], pl[i]) - b)
        diffs["lean"].append(roc_auc_score(y[i], pn[i]) - b)
    summary["auc_gain_vs_baseline"] = {k: {"mean": float(np.mean(v)), "ci95": [float(np.percentile(v, 2.5)),
                                                                                 float(np.percentile(v, 97.5))]}
                                       for k, v in diffs.items()}
    # Which inputs carry the signal: permutation-free proxy via standalone AUC of history features.
    tested = feats[feats[label].notna() & feats["start_year"].isin([r["year"] for r in rows])]
    single = {}
    for col in ["h_tgt_rate", "h_mol_rate", "h_spo_rate", "h_tgt_fail", "tgt_crowding", "randomized", "placebo_arm",
                "ot_genetic_association", "ot_somatic_mutation", "ot_animal_model"]:
        if col not in tested:
            continue
        v = tested[col]
        ok = v.notna()
        if ok.sum() > 100 and tested.loc[ok, label].nunique() == 2:
            single[col] = {"auc": float(roc_auc_score(tested.loc[ok, label].astype(int), v[ok])), "n": int(ok.sum())}
    summary["single_feature_auc"] = single
    return summary


OT = None


def main() -> None:
    global OT
    if len(sys.argv) > 3:
        OT = json.loads(Path(sys.argv[3]).read_text())
    df = pd.read_pickle(DATA)
    results = {
        # Meeting a primary endpoint needs a between-group comparison, so a single-arm trial can only
        # enter task A as a failure. Scoring on randomized trials only removes that shortcut.
        "A": run(df, "label_a", "known_a", list(range(2014, 2022)),
                 "Randomized trials: fails on biology vs meets primary endpoint",
                 only=lambda f: f["randomized"] == 1),
        # Only trials with a readable posted primary result, met against missed: no mix of stops
        # (visible for every trial) and endpoint verdicts (visible only where results were posted).
        "A_endpoint": run(df, "label_a", "known_a", list(range(2014, 2022)),
                          "Randomized trials with posted results: missed vs met primary endpoint",
                          only=lambda f: (f["randomized"] == 1) & (f["source_a"] == "endpoint")),
        "A_all": run(df, "label_a", "known_a", list(range(2014, 2022)),
                     "All trials (confounded by design): fails on biology vs meets primary endpoint"),
        "B": run(df, "label_b", "known_b", list(range(2014, 2022)), "Biological stop among closed trials"),
    }
    OUT.write_text(json.dumps(results, indent=1, default=float))
    for key, r in results.items():
        print(f"\n== Task {key}: {r['task']} | test n={r['n_test']:,} rate={r['test_rate']:.3f}")
        for m in ("baseline", "logistic", "boosting", "lean"):
            s = r[m]
            print(f"  {m:9} AUC {s['auc']:.3f}  Brier {s['brier']:.4f}  top10% {s['top_decile_rate']:.3f}  "
                  f"bottom10% {s['bottom_decile_rate']:.3f}  AUC(subset: mapped/target history) {s['auc_with_target_history']}")
        print("  gain vs baseline:", json.dumps(r["auc_gain_vs_baseline"]))
        print("  single-feature AUC:", json.dumps(r["single_feature_auc"]))
        for y in r["years"]:
            print(f"   {y['year']} n={y['n_test']:4d} rate={y['test_rate']:.2f} base={y['baseline_auc']:.3f} "
                  f"lr={y['logistic_auc']:.3f} gb={y['boosting_auc']:.3f} lean={y['lean_auc']:.3f}")


main()
