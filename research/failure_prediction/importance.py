"""Task B: which inputs carry the gain. Train on starts before 2019 (outcome known before 2019),
test on starts 2019-2021, and measure the AUC drop when each input group is shuffled."""
import sys
import numpy as np, pandas as pd
from sklearn.metrics import roc_auc_score
sys.argv = [sys.argv[0], "trials.pkl", "/dev/null"]
src = open("backtest.py").read().split("def main()")[0]
exec(src)
df = pd.read_pickle("trials.pkl")
label, known = "label_b", "known_b"
hist = history_features(df, label, known, "h_")
f = pd.concat([df, hist], axis=1)
f["has_target"] = f["targets"].map(bool).astype(int)
f["tgt_crowding"] = crowding(df)
numeric = NUMERIC_DESIGN + list(hist.columns) + ["tgt_crowding"]
cut = pd.Timestamp("2019-01-01")
tr = f[f[label].notna() & (f.start < cut) & (f[known] < cut)]
te = f[f[label].notna() & f.start_year.isin([2019, 2020, 2021])]
pre = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore", min_frequency=20), CATEGORICAL),
                         ("num", make_pipeline(StandardScaler()), numeric)])
X = lambda d: d[CATEGORICAL + numeric].assign(**{c: d[c].fillna(tr[c].median()) for c in numeric})
m = make_pipeline(pre, LogisticRegression(max_iter=2000, C=0.5)).fit(X(tr), tr[label].astype(int))
y = te[label].astype(int).to_numpy()
base = roc_auc_score(y, m.predict_proba(X(te))[:, 1])
groups = {"phase": ["phase"], "disease area": ["area"], "sponsor class": ["sponsor_class"], "modality": ["modality"],
          "design (randomized, placebo, comparator)": ["randomized", "placebo_arm", "active_comparator"],
          "trial size of the protocol (conditions, interventions)": ["n_conditions", "n_interventions", "n_experimental"],
          "drug resolved to a target": ["has_target", "resolved_share"], "start year": ["start_year"],
          "target history": ["h_tgt_n", "h_tgt_fail", "h_tgt_rate", "tgt_crowding"],
          "molecule history": ["h_mol_n", "h_mol_fail", "h_mol_rate"], "sponsor history": ["h_spo_n", "h_spo_fail", "h_spo_rate"]}
rng = np.random.default_rng(1)
print(f"AUC {base:.3f} on {len(y):,} test trials")
for g, cols in groups.items():
    drops = []
    for _ in range(5):
        t = te.copy()
        perm = rng.permutation(len(t))
        for c in cols:
            t[c] = t[c].to_numpy()[perm]
        drops.append(base - roc_auc_score(y, m.predict_proba(X(t))[:, 1]))
    print(f"  {g:55} AUC drop {np.mean(drops):+.3f}")
