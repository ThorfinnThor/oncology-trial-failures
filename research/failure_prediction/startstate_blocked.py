"""Feasibility study, step 4b: a fair test of the start-of-trial record.

The walk-forward test cannot judge these features: snapshots begin in 2017, so almost no training
trial with an outcome known before the test year has a start record. Here every model is trained on
the same trials (randomized, record present, started 2017-2019, outcome as known today) and tested on
trials started 2020-2021. The base rate is estimated from all trials started before 2020. Labels of
training trials may have become known after 2020: that is look-ahead in *label availability*, shared
by every model compared, not in the features.
"""
import json
import sys

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import KFold
from sklearn.preprocessing import StandardScaler

sys.argv = [sys.argv[0], "trials.pkl", "ot_cache/trial_features.json", "aact", "/dev/null"]
src = open("startstate_backtest.py").read().split("def run(")[0]
exec(src)
rng = np.random.default_rng(11)
out = {}


def evaluate(sub, label, name):
    pool = sub[sub[label].notna()]
    hist = pool[pool.start < pd.Timestamp("2020-01-01")]
    train = pool[(pool.rec_present == 1) & pool.start_year.between(2017, 2019)]
    test = pool[(pool.rec_present == 1) & pool.start_year.between(2020, 2021)]
    cf = np.zeros(len(train))
    for tr_i, va_i in KFold(5, shuffle=True, random_state=1).split(train):
        cf[va_i] = rates(pd.concat([hist[~hist.nct_id.isin(train.nct_id)], train.iloc[tr_i]]), train.iloc[va_i], label)
    base = rates(hist, test, label)
    y_tr, y = train[label].astype(int), test[label].astype(int).to_numpy()
    G = lambda f, b: np.column_stack([logit(b), f["mapped"], f["gen"], f["gen_nononc"]])
    fill = train[REC_COLS].astype(float).median()
    R_tr, R_te = rec_matrix(train, fill), rec_matrix(test, fill)
    sc = StandardScaler().fit(R_tr)
    P = {"base": base}
    P["gen"] = LogisticRegression(max_iter=1000).fit(G(train, cf), y_tr).predict_proba(G(test, base))[:, 1]
    lr = LogisticRegression(max_iter=2000, C=0.3).fit(np.column_stack([G(train, cf), sc.transform(R_tr)]), y_tr)
    P["rec"] = lr.predict_proba(np.column_stack([G(test, base), sc.transform(R_te)]))[:, 1]
    gb = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.04, max_leaf_nodes=15, min_samples_leaf=40,
                                        l2_regularization=1.0, random_state=7)
    gb.fit(np.column_stack([G(train, cf), train[REC_COLS].astype(float)]), y_tr)
    P["gb"] = gb.predict_proba(np.column_stack([G(test, base), test[REC_COLS].astype(float)]))[:, 1]

    def gain(a, b):
        g = []
        for _ in range(1000):
            i = rng.integers(0, len(y), len(y))
            g.append(roc_auc_score(y[i], P[a][i]) - roc_auc_score(y[i], P[b][i]))
        return [round(float(np.mean(g)), 4), round(float(np.percentile(g, 2.5)), 4), round(float(np.percentile(g, 97.5)), 4)]

    names = ["base_logit", "mapped", "gen", "gen_nononc"] + list(R_tr.columns)
    res = {"task": name, "n_train": len(train), "n_test": len(test), "test_rate": float(y.mean()),
           "auc": {k: round(float(roc_auc_score(y, p)), 4) for k, p in P.items()},
           "brier": {k: round(float(brier_score_loss(y, p)), 4) for k, p in P.items()},
           "gain_rec_vs_base": gain("rec", "base"), "gain_rec_vs_gen": gain("rec", "gen"),
           "gain_gb_vs_base": gain("gb", "base"), "gain_gen_vs_base": gain("gen", "base"),
           "coefficients_standardized": dict(zip(names, np.round(lr.coef_[0], 3).tolist()))}
    # Planned enrollment on its own, within phase: fail rate by tercile.
    t = pool[(pool.rec_present == 1) & pool.log_planned_enrollment.notna()].copy()
    t["tercile"] = t.groupby("phase")["log_planned_enrollment"].transform(lambda s: pd.qcut(s.rank(method="first"), 3, labels=["small", "mid", "large"]))
    res["fail_by_enrollment_tercile_within_phase"] = {f"{p}/{q}": [round(float(g[label].mean()), 3), int(len(g))]
                                                      for (p, q), g in t.groupby(["phase", "tercile"], observed=True) if p in ("2", "3")}
    out[name] = res
    print(json.dumps(res, indent=1))


evaluate(df[df.randomized == 1], "label_a", "A randomized")
evaluate(df[(df.randomized == 1) & (df.source_a == "endpoint")], "label_a", "A_endpoint")
evaluate(df, "label_b", "B biological stop")
open("results_startstate_blocked.json", "w").write(json.dumps(out, indent=1))
