#!/usr/bin/env python3
"""Turn SEC filing evidence (scripts/sources/sec_stop_evidence.py) into a review batch.

Each case shows the registry stop reason next to the sponsor's own words from its filings, with a
link to each filing. The reviewer says whether the filing is about this trial (step 0 of the tool)
and labels the cause. Nothing here changes a label: accepted answers become per-trial decisions
in a later step.

Writes, like build_batch.py:
  <out>/cases/<case_id>.json             documents for the page's `cases` collection
  <out>/qa_<batch>-labels.json           our label now and the rules' reading of each passage
                                         (owner-only qa/ in the page's database, never this repo)
  tools/clinician-review/batches/<batch>.json   which trials, drawn how (no labels)

  python tools/clinician-review/build_evidence_batch.py --evidence <dir>/sec_evidence.json \\
      --batch sec-evidence-2026-11 --label "SEC filings: trials with no stated cause" --priority 5 --out /tmp/b
"""
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--evidence", type=Path, required=True)
    ap.add_argument("--batch", required=True)
    ap.add_argument("--label", required=True)
    ap.add_argument("--priority", type=int, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--passages", type=int, default=2, help="passages shown per trial")
    args = ap.parse_args()
    ev = json.loads(args.evidence.read_text())
    trials = sorted(ev["trials"], key=lambda t: (-t["passages"][0]["score"], t["nct_id"]))
    (args.out / "cases").mkdir(parents=True, exist_ok=True)
    frozen, qa = [], {}
    for i, t in enumerate(trials, 1):
        cid = f"{args.batch}-{i:03d}"
        shown = t["passages"][: args.passages]
        doc = {"order": args.priority * 10000 + i, "batch": args.batch, "batch_label": args.label,
               "batch_priority": args.priority, "case_id": cid, "nct_id": t["nct_id"], "why_stopped": t["why_stopped"],
               "title": t["brief_title"], "status": t["overall_status"], "phases": t["phases"], "conditions": t["conditions"],
               "interventions": t["intervention_names"], "registry_url": t["registry_url"],
               "evidence": [{"form": p["form"], "filed": p["filed"], "url": p["url"], "sentence": p["sentence"][:700],
                             "window": p["window"][:900]} for p in shown],
               "suggested": shown[0]["suggested"]}
        (args.out / "cases" / f"{cid}.json").write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
        frozen.append({"case_id": cid, "nct_id": t["nct_id"], "why_stopped": t["why_stopped"], "ticker": t["ticker"],
                       "filings": [p["url"] for p in shown]})
        qa[cid] = {"label_now": t["label_now"], "suggested": shown[0]["suggested"], "score": shown[0]["score"],
                   "programme_level": shown[0]["programme_level"], "identity_strong": shown[0]["identity_strong"],
                   "identity_weak": shown[0]["identity_weak"]}
    (ROOT / "tools/clinician-review/batches" / f"{args.batch}.json").write_text(json.dumps({
        "batch": args.batch, "label": args.label, "priority": args.priority, "drawn_on": date.today().isoformat(),
        "mode": "blind, with SEC evidence (step 0: is the filing about this trial)",
        "design": f"every trial labelled CAUSE_NOT_STATED or UNRESOLVED whose lead sponsor is an SEC registrant and whose "
                  f"filings hold an identity-matched stop passage (scripts/sources/sec_stop_evidence.py): "
                  f"{ev['with_evidence']} of {ev['searched']} searched",
        "labels_at_draw": f"owner-only document qa/{args.batch}-labels in the review page's database",
        "cases": frozen}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    (args.out / f"qa_{args.batch}-labels.json").write_text(json.dumps(
        {"batch": args.batch, "drawn_on": date.today().isoformat(), "labels": qa}, ensure_ascii=False), encoding="utf-8")
    print(f"{args.batch}: {len(trials)} cases; wrote {args.out}/cases and batches/{args.batch}.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
