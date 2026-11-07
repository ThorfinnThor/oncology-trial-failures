#!/usr/bin/env python3
"""Score the held-out validation against a second model family.

The published reference labels (validation/heldout_v2_reference_labels.jsonl) came from two
Claude models with a Claude adjudicator, and the classifier rules were written in Claude
sessions. A shared blind spot would be invisible in the published precision. This re-labels
the same 600 texts with a model from another family (validation/crosscheck_gpt61/) and reports:

  * how often the two reference sets agree;
  * the same weighted estimates as the main report, with the cross-check labels as reference;
  * every text where the two disagree on whether the stop is biological, for a person to decide.

Inputs:   validation/crosscheck_gpt61/labels.jsonl, meta.json
          validation/crosscheck_gpt61/decisions.json (optional: reviewer verdicts, kept across runs)
Outputs:  validation/crosscheck_gpt61/metrics.json   (weighted estimates, cross-check as reference)
          validation/crosscheck_gpt61/summary.json   (agreement + disputed cases)
          docs/validation_crosscheck_gpt61.md

It never changes the published reference labels or the published estimates.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import evaluate_heldout_validation_v2 as evaluate  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
VAL = ROOT / "validation"
CC = VAL / "crosscheck_gpt61"
BIO_REASONS = {"EFFICACY_FUTILITY", "SAFETY", "BIOLOGICAL_UNSPECIFIED"}
PAIRS = {
    "BIOLOGICAL_FAILURE": BIO_REASONS,
    "NON_BIOLOGICAL": {"REGULATORY", "RECRUITMENT", "FUNDING", "SUPPLY_MANUFACTURING", "STAFFING_RESOURCES",
                       "BUSINESS_STRATEGY", "PROTOCOL_FEASIBILITY", "SUPPORT_WITHDRAWAL", "EXTERNAL_DISRUPTION",
                       "OPERATIONAL_OTHER"},
    "MIXED_CAUSES": {"MULTIPLE"},
    "NON_FAILURE_TRANSITION": {"PLANNED_MILESTONE", "REPLACEMENT_TRANSITION", "NOT_INITIATED"},
    "CAUSE_NOT_STATED": {"DECISION_WITHOUT_STATED_CAUSE", "PROGRAM_ACTION_WITHOUT_STATED_CAUSE"},
    "UNKNOWN": {"UNSPECIFIED"},
}


def load(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def has_bio(r: dict) -> bool:
    return r["outcome"] == "BIOLOGICAL_FAILURE" or (
        r["outcome"] == "MIXED_CAUSES" and bool(BIO_REASONS & set(r.get("secondary_reasons") or [])))


def main() -> int:
    ref = {r["sample_id"]: r for r in load(VAL / "heldout_v2_reference_labels.jsonl")}
    key = {r["sample_id"]: r for r in load(VAL / "heldout_v2_key.jsonl")}
    cc = {r["sample_id"]: r for r in load(CC / "labels.jsonl")}
    meta = json.loads((CC / "meta.json").read_text(encoding="utf-8"))

    # The cross-check file must be complete and well-formed before anything is scored.
    assert set(cc) == set(ref), f"cross-check covers {len(cc)} of {len(ref)} samples"
    for sid, r in cc.items():
        assert r["outcome"] in PAIRS, f"{sid}: outcome {r['outcome']!r}"
        assert r["primary_reason"] in PAIRS[r["outcome"]], f"{sid}: {r['primary_reason']} with {r['outcome']}"

    n = len(ref)
    same_outcome = sum(cc[s]["outcome"] == ref[s]["outcome"] for s in ref)
    same_full = sum(cc[s]["outcome"] == ref[s]["outcome"] and cc[s]["primary_reason"] == ref[s]["primary_reason"]
                    for s in ref)
    same_bio = sum(has_bio(cc[s]) == has_bio(ref[s]) for s in ref)
    transitions = Counter((ref[s]["outcome"], cc[s]["outcome"]) for s in ref if cc[s]["outcome"] != ref[s]["outcome"])

    # Weighted estimates exactly as published, with the cross-check as reference.
    evaluate.main(reference=CC / "labels.jsonl", metrics_out=CC / "metrics.json", report_out=None)
    cc_metrics = json.loads((CC / "metrics.json").read_text())
    pub = json.loads((VAL / "heldout_v2_metrics.json").read_text())

    decisions_path = CC / "decisions.json"
    decisions = json.loads(decisions_path.read_text()) if decisions_path.exists() else {}
    disputed = []
    for sid in sorted(ref):
        if has_bio(cc[sid]) == has_bio(ref[sid]):
            continue
        d = decisions.get(sid, {})
        disputed.append({
            "sample_id": sid,
            "nct_id": ref[sid]["nct_id"],
            "why_stopped": ref[sid]["why_stopped"],
            "reference": {"outcome": ref[sid]["outcome"], "primary_reason": ref[sid]["primary_reason"]},
            "crosscheck": {"outcome": cc[sid]["outcome"], "primary_reason": cc[sid]["primary_reason"],
                           "note": cc[sid].get("note", "")},
            "classifier": {"outcome": key[sid]["predicted_outcome"], "primary_reason": key[sid]["predicted_primary_reason"]},
            "biological_per_reference": has_bio(ref[sid]),
            "biological_per_crosscheck": has_bio(cc[sid]),
            "review_status": d.get("status", "AWAITING_CLINICIAN_REVIEW"),
            "review_verdict": d.get("verdict"),
        })

    keys = ("biological_precision", "biological_recall", "biological_domain_precision", "assertion_outcome_precision",
            "outcome_accuracy_all_records")
    summary = {
        "schema_version": 1,
        "annotator": meta["annotator"],
        "labelled_at": meta["labelled_at"],
        "sample_size": n,
        "agreement_with_reference": {
            "outcome": same_outcome / n, "outcome_count": same_outcome,
            "outcome_and_primary_reason": same_full / n, "outcome_and_primary_reason_count": same_full,
            "biological_yes_no": same_bio / n, "biological_yes_no_count": same_bio,
        },
        "outcome_transitions_reference_to_crosscheck": [
            {"reference": a, "crosscheck": b, "count": c} for (a, b), c in transitions.most_common()
        ],
        "estimates_published_reference": {k: pub["weighted_estimates"][k] for k in keys},
        "estimates_crosscheck_reference": {k: cc_metrics["weighted_estimates"][k] for k in keys},
        "estimates_crosscheck_reference_ci95": {k: cc_metrics["weighted_estimates_ci95"][k] for k in keys},
        "disputed_biological": disputed,
        "disputed_awaiting_review": sum(d["review_status"] == "AWAITING_CLINICIAN_REVIEW" for d in disputed),
    }
    (CC / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    pct = lambda x: f"{100 * x:.1f}%"
    a = summary["agreement_with_reference"]
    L = ["# Cross-check of the held-out validation with a second model family", "",
         f"Annotator: {meta['annotator']['model']} ({meta['annotator']['reasoning_setting']}), "
         f"{meta['annotator']['model_family']} · labelled {meta['labelled_at']} · {n} texts, blind to the classifier "
         "and to the published reference labels, same written guidelines.", "",
         "## Why", "",
         "The published reference labels came from Claude Opus and Claude Sonnet with a Claude Opus adjudicator, and the "
         "classifier rules were written in Claude sessions. If both share a blind spot, the published precision cannot "
         "show it. A model from another family labelling the same texts can.", "",
         "## Agreement with the published reference labels", "",
         "| | Agreement |", "| --- | ---: |",
         f"| Outcome | {pct(a['outcome'])} ({a['outcome_count']}/{n}) |",
         f"| Outcome + primary reason | {pct(a['outcome_and_primary_reason'])} ({a['outcome_and_primary_reason_count']}/{n}) |",
         f"| Biological cause yes/no | {pct(a['biological_yes_no'])} ({a['biological_yes_no_count']}/{n}) |", "",
         "## The published estimates under either reference", "",
         "Same sample, same weighting, same bootstrap; only the reference labels differ.", "",
         "| Metric | Published reference (Claude) | Cross-check reference (GPT) | 95% CI (cross-check) |",
         "| --- | ---: | ---: | ---: |"]
    names = {"biological_precision": "Biological-failure precision", "biological_recall": "Biological-failure recall",
             "biological_domain_precision": "Biological-cause precision (incl. mixed)",
             "assertion_outcome_precision": "Precision of asserted outcomes",
             "outcome_accuracy_all_records": "Outcome accuracy, all eligible records"}
    for k in keys:
        lo, hi = summary["estimates_crosscheck_reference_ci95"][k]
        L.append(f"| {names[k]} | {pct(summary['estimates_published_reference'][k])} | "
                 f"{pct(summary['estimates_crosscheck_reference'][k])} | {pct(lo)}–{pct(hi)} |")
    L += ["", "Neither reference is clinical ground truth. Where they differ, the true value is not known until the "
          "disputed texts below have been decided by a person.", "",
          f"## Disputed: biological or not ({len(disputed)} texts, {summary['disputed_awaiting_review']} awaiting clinician review)",
          "", "| Sample | Stop reason | Published reference | Cross-check | Classifier | Status |",
          "| --- | --- | --- | --- | --- | --- |"]
    for d in disputed:
        txt = d["why_stopped"].replace("|", "/")
        txt = txt if len(txt) <= 160 else txt[:157] + "…"
        L.append(f"| {d['sample_id']} | {txt} | {d['reference']['outcome']} | {d['crosscheck']['outcome']} | "
                 f"{d['classifier']['outcome']} | {d['review_status']} |")
    L += ["", "To record a reviewer's decision, add it to `validation/crosscheck_gpt61/decisions.json` and re-run: "
          '`{"HV-0056": {"status": "DECIDED", "verdict": {"outcome": "UNKNOWN", "primary_reason": "UNSPECIFIED", '
          '"reviewer": "clinician", "decided_at": "YYYY-MM-DD"}}}`. Decisions are kept across runs.']
    L += ["", "The other disagreements are between non-biological classes (e.g. not initiated vs. recruitment, cause "
          "not stated vs. unknown) and do not affect the biological rates.", "",
          "Reproduce: `python scripts/crosscheck_heldout_v2.py`"]
    (ROOT / "docs/validation_crosscheck_gpt61.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L[10:30]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
