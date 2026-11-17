#!/usr/bin/env python3
"""Draw a batch of trials for the clinician review tool.

Writes:
  <out>/cases/<case_id>.json            one document per case, to load into the page's `cases`
                                        collection (nothing in it reveals our label)
  <out>/qa_<batch>-labels.json          the label we shipped for each case, frozen at draw time, so
                                        the clinicians' answers can be compared later even after
                                        the classifier changes. Load it into the page's owner-only
                                        `qa/<batch>-labels`; it never goes into this public repo,
                                        or a reviewer could look up our answer.
  tools/clinician-review/batches/<batch>.json
                                        the cases without labels: which trials, drawn how

The draw: interventional Phase 2/3 trials of one disease area that have a stop reason, one trial
per distinct stop-reason text (a text decided once is decided for every trial that uses it),
seeded. `--bio` cases come from trials we label biological (a biological failure, or several
causes including a biological one); `--other` from the rest, stratified by outcome, so recall can
be estimated too.

  python tools/clinician-review/build_batch.py --area Oncology --bio 100 --other 50 \\
      --batch oncology-2026-11 --label "Oncology" --priority 1 --out /tmp/batch
  python tools/clinician-review/build_batch.py --area Oncology --bio 100000 --other 0 --all-phases \\
      --exclude-batch oncology-2026-11 --batch oncology-bio-2026-11 --label "Oncology: every failure label" \\
      --priority 3 --out /tmp/batch2
"""
from __future__ import annotations

import argparse
import collections
import csv
import json
import random
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BIO = {"EFFICACY_FUTILITY", "SAFETY", "BIOLOGICAL_UNSPECIFIED"}


def is_bio(r: dict) -> bool:
    if r["classification_final_outcome"] == "BIOLOGICAL_FAILURE":
        return True
    secondary = set((r.get("classification_secondary_reasons_v2") or "").split("|"))
    return r["classification_final_outcome"] == "MIXED_CAUSES" and bool(BIO & secondary)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--area", required=True)
    ap.add_argument("--bio", type=int, default=100)
    ap.add_argument("--other", type=int, default=50)
    ap.add_argument("--batch", required=True, help="batch id, e.g. oncology-2026-11")
    ap.add_argument("--label", required=True, help="batch name shown to reviewers")
    ap.add_argument("--priority", type=int, required=True, help="1 is reviewed first")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--seed", type=int, default=20261116)
    ap.add_argument("--all-phases", action="store_true", help="every phase and study type, not only interventional Phase 2/3")
    ap.add_argument("--exclude-batch", action="append", default=[],
                    help="leave out texts already drawn into this batch (repeatable)")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    rows = list(csv.DictReader(open(ROOT / "data/all_stopped_trials.csv", encoding="utf-8")))
    meta = json.loads((ROOT / "web/public/dataset_meta.json").read_text())
    # Texts already used in the held-out validation are left out: they are judged there.
    held_out = {json.loads(l)["why_stopped"].strip().lower()
                for l in open(ROOT / "validation/heldout_v2_blind.jsonl", encoding="utf-8")}
    for other_batch in args.exclude_batch:
        prev = json.loads((ROOT / "tools/clinician-review/batches" / f"{other_batch}.json").read_text())
        held_out |= {c["why_stopped"].strip().lower() for c in prev["cases"]}

    pool, seen = [], set()
    candidates = [r for r in rows
                  if r["disease_area"] == args.area and r["why_stopped"].strip()
                  and (args.all_phases or (r["study_type"] == "INTERVENTIONAL"
                                           and ("PHASE2" in r["phases"] or "PHASE3" in r["phases"])))]
    rng.shuffle(candidates)
    for r in candidates:
        key = r["why_stopped"].strip().lower()
        if key in seen or key in held_out:
            continue
        seen.add(key)
        pool.append(r)

    bio = [r for r in pool if is_bio(r)][: args.bio]
    rest = [r for r in pool if not is_bio(r)]
    by_outcome = collections.defaultdict(list)
    for r in rest:
        by_outcome[r["classification_final_outcome"]].append(r)
    # The non-biological share in proportion to the pool, at least 3 per outcome that exists.
    total = len(rest)
    quota = {o: max(3, round(args.other * len(v) / total)) for o, v in by_outcome.items()} if args.other else {}
    while sum(quota.values()) > args.other:
        biggest = max(quota, key=quota.get)
        quota[biggest] -= 1
    other = [r for o, v in by_outcome.items() for r in v[: quota.get(o, 0)]]

    picked = bio + other
    rng.shuffle(picked)  # reviewers must not be able to tell the strata apart by position
    out_cases = args.out / "cases"
    out_cases.mkdir(parents=True, exist_ok=True)
    frozen, labels = [], {}
    base = args.priority * 10000
    for i, r in enumerate(picked, 1):
        case_id = f"{args.batch}-{i:03d}"
        doc = {"order": base + i, "batch": args.batch, "batch_label": args.label, "batch_priority": args.priority,
               "case_id": case_id, "nct_id": r["nct_id"], "why_stopped": r["why_stopped"], "title": r["brief_title"],
               "status": r["overall_status"], "phases": r["phases"], "conditions": r["conditions"],
               "interventions": r["intervention_names"], "registry_url": r["url"]}
        (out_cases / f"{case_id}.json").write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
        frozen.append({"case_id": case_id, "nct_id": r["nct_id"], "why_stopped": r["why_stopped"]})
        labels[case_id] = {"stratum": "biological" if is_bio(r) else "other",
                           "label_outcome": r["classification_final_outcome"],
                           "label_primary_reason": r["classification_final_category"],
                           "label_secondary_reasons": r["classification_secondary_reasons_v2"],
                           "label_source": r["classification_source"], "classifier_version": r["classification_version"]}

    batch_file = ROOT / "tools/clinician-review/batches" / f"{args.batch}.json"
    batch_file.parent.mkdir(parents=True, exist_ok=True)
    batch_file.write_text(json.dumps({
        "batch": args.batch, "label": args.label, "priority": args.priority, "drawn_on": date.today().isoformat(),
        "release": meta.get("version"), "seed": args.seed, "area": args.area,
        "design": f"{len(bio)} biological-labelled + {len(other)} other ({dict(quota)}), "
                  + ("all phases and study types" if args.all_phases else "interventional Phase 2/3")
                  + ", one trial per distinct stop-reason text, held-out validation texts excluded"
                  + (f", texts in {args.exclude_batch} excluded" if args.exclude_batch else ""),
        "pool": {"distinct_texts": len(pool), "biological": sum(is_bio(r) for r in pool), "other": len(rest)},
        "labels_at_draw": f"owner-only document qa/{args.batch}-labels in the review page's database",
        "cases": frozen}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    (args.out / f"qa_{args.batch}-labels.json").write_text(json.dumps(
        {"batch": args.batch, "release": meta.get("version"), "drawn_on": date.today().isoformat(), "labels": labels},
        ensure_ascii=False), encoding="utf-8")
    print(f"{args.batch}: {len(picked)} cases ({len(bio)} biological, {len(other)} other {dict(quota)}) "
          f"from {len(pool)} distinct texts; wrote {out_cases} and {batch_file.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
