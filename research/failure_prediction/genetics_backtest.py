"""Feasibility study, step 3: does genetic evidence add to the phase x area base rate?

Same walk-forward design as backtest.py. The model is the base rate's logit plus three inputs:
whether target and indication could be mapped, whether there is Open Targets genetic evidence for the
pair, and the same outside oncology (germline genetics says little about tumours). For training rows
the base rate is cross-fitted (5 folds), so the model learns how much to trust a rate it did not see
its own outcome in, which is what it gets at prediction time.
"""
import json
import sys

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import KFold

df = pd.read_pickle(sys.argv[1])
ot = json.loads(open(sys.argv[2]).read())
out_path = sys.argv[3]
df["mapped"] = df.nct_id.map(lambda n: (ot.get(n) or {}).get("ot_mapped", 0))
df["gen"] = (df.nct_id.map(lambda n: (ot.get(n) or {}).get("ot_genetic_association", 0.0)) > 0).astype(int)
df["gen_nononc"] = df["gen"] * (df["area"] != "Oncology")
rng = np.random.default_rng(7)


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


def X(frame, base):
    return np.column_stack([logit(base), frame["mapped"], frame["gen"], frame["gen_nononc"]])


def run(sub, label, known, name):
    ys, pb, pm, mapped = [], [], [], []
    coefs = []
    for year in range(2014, 2022):
        cut = pd.Timestamp(f"{year}-01-01")
        train = sub[sub[label].notna() & (sub.start < cut) & (sub[known] < cut)]
        test = sub[sub[label].notna() & (sub.start_year == year)]
        if len(test) < 50:
            continue
        cf = np.zeros(len(train))
        for tr_i, va_i in KFold(5, shuffle=True, random_state=year).split(train):
            cf[va_i] = rates(train.iloc[tr_i], train.iloc[va_i], label)
        model = LogisticRegression(max_iter=1000, C=1.0).fit(X(train, cf), train[label].astype(int))
        coefs.append(model.coef_[0].tolist())
        base = rates(train, test, label)
        ys.append(test[label].astype(int).to_numpy())
        pb.append(base)
        pm.append(model.predict_proba(X(test, base))[:, 1])
        mapped.append(test["mapped"].to_numpy() == 1)
    y, pb, pm, mapped = map(np.concatenate, (ys, pb, pm, mapped))
    gains = []
    for _ in range(1000):
        i = rng.integers(0, len(y), len(y))
        gains.append(roc_auc_score(y[i], pm[i]) - roc_auc_score(y[i], pb[i]))
    sub_gain = []
    yi, bi, mi = y[mapped], pb[mapped], pm[mapped]
    for _ in range(1000):
        i = rng.integers(0, len(yi), len(yi))
        sub_gain.append(roc_auc_score(yi[i], mi[i]) - roc_auc_score(yi[i], bi[i]))
    res = {
        "task": name, "n": int(len(y)), "n_mapped": int(mapped.sum()),
        "auc_baseline": roc_auc_score(y, pb), "auc_model": roc_auc_score(y, pm),
        "brier_baseline": brier_score_loss(y, pb), "brier_model": brier_score_loss(y, pm),
        "gain": [float(np.mean(gains)), float(np.percentile(gains, 2.5)), float(np.percentile(gains, 97.5))],
        "auc_mapped_baseline": roc_auc_score(yi, bi), "auc_mapped_model": roc_auc_score(yi, mi),
        "gain_mapped": [float(np.mean(sub_gain)), float(np.percentile(sub_gain, 2.5)), float(np.percentile(sub_gain, 97.5))],
        "mean_coef[base_logit, mapped, genetic, genetic_non_oncology]": np.mean(coefs, axis=0).round(3).tolist(),
    }
    print(json.dumps(res, indent=1, default=float))
    return res


results = {
    "A": run(df[df.randomized == 1], "label_a", "known_a", "Randomized: fails on biology vs meets endpoint"),
    "A_endpoint": run(df[(df.randomized == 1) & (df.source_a == "endpoint")], "label_a", "known_a",
                      "Randomized, posted results: missed vs met"),
    "B": run(df, "label_b", "known_b", "Biological stop among closed trials"),
}
open(out_path, "w").write(json.dumps(results, indent=1, default=float))
