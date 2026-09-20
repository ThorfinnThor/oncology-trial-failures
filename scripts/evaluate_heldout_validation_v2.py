#!/usr/bin/env python3
"""Evaluate Classification V2 against the held-out, independently labelled sample.

Inputs (validation/):
  heldout_v2_key.jsonl               classifier output for each sampled record
  heldout_v2_reference_labels.jsonl  blind reference labels (2 annotators + adjudication)
  heldout_v2_sample_meta.json        stratum sizes for population weighting

Outputs:
  validation/heldout_v2_metrics.json
  docs/validation_heldout_v2.md

Precision per predicted outcome is measured directly on the stratified sample
(Wilson 95% intervals). Population-level figures (overall precision, recall of
biological failures) are weighted back to the eligible record population with
stratum weights and 95% intervals from a stratified bootstrap.
"""
from __future__ import annotations

import json
import math
import random
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VAL = ROOT / "validation"
BIO = "BIOLOGICAL_FAILURE"
UNRESOLVED = {"UNKNOWN"}
BOOT = 2000
BIO_REASONS = {"EFFICACY_FUTILITY", "SAFETY", "BIOLOGICAL_UNSPECIFIED"}
NON_CAUSAL = {"MULTIPLE", "UNSPECIFIED", ""}


def reason_set(primary: str, secondary) -> set[str]:
    if isinstance(secondary, str):
        secondary = [x.strip() for x in secondary.split(";")]
    return ({primary} | set(secondary or [])) - NON_CAUSAL


def compatible(row: dict) -> bool:
    """No material disagreement: same outcome and primary reason, or a pure
    convention difference between NON_BIOLOGICAL-with-secondary-causes and
    MIXED_CAUSES where the biological domain and the stated causes agree."""
    if row["full_ok"]:
        return True
    pair = {row["pred_outcome"], row["ref_outcome"]}
    if pair == {"NON_BIOLOGICAL", "MIXED_CAUSES"} or pair == {"NON_BIOLOGICAL"}:
        if row["pred_bio"] or row["ref_bio_any_domain"]:
            return False
        return bool(row["pred_reasons"] & row["ref_reasons"])
    if pair == {"BIOLOGICAL_FAILURE", "MIXED_CAUSES"} or pair == {"BIOLOGICAL_FAILURE"}:
        return row["pred_bio"] and row["ref_bio_any_domain"] and bool(row["pred_reasons"] & row["ref_reasons"] & BIO_REASONS)
    return False
SEED = 20260915


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return (max(0.0, centre - half), min(1.0, centre + half))


def pct(x: float) -> str:
    return "n/a" if x != x else f"{100 * x:.1f}%"


def main() -> int:
    key = {r["sample_id"]: r for r in load_jsonl(VAL / "heldout_v2_key.jsonl")}
    ref = {r["sample_id"]: r for r in load_jsonl(VAL / "heldout_v2_reference_labels.jsonl")}
    meta = json.loads((VAL / "heldout_v2_sample_meta.json").read_text())
    assert set(key) == set(ref), "key and reference labels do not cover the same samples"

    rows = []
    for sid, k in key.items():
        r = ref[sid]
        rows.append({
            "sample_id": sid,
            "stratum": k["stratum"],
            "m": k["records_with_same_text"],
            "pred_outcome": k["predicted_outcome"],
            "pred_primary": k["predicted_primary_reason"],
            "ref_outcome": r["outcome"],
            "ref_primary": r["primary_reason"],
            "ref_secondary": r.get("secondary_reasons", []),
            "label_status": r["label_status"],
        })

    for row in rows:
        row["outcome_ok"] = row["pred_outcome"] == row["ref_outcome"]
        row["full_ok"] = row["outcome_ok"] and row["pred_primary"] == row["ref_primary"]
        row["asserted"] = row["pred_outcome"] not in UNRESOLVED
        # "Safe" = no unsupported claim: either exactly right, or the reference is
        # itself unresolved/not-stated and the classifier did not assert a cause domain.
        row["bio_pred"] = row["pred_outcome"] == BIO
        row["bio_ref"] = row["ref_outcome"] == BIO
        row["pred_reasons"] = reason_set(row["pred_primary"], key[row["sample_id"]].get("predicted_secondary_reasons", ""))
        row["ref_reasons"] = reason_set(row["ref_primary"], row["ref_secondary"])
        row["pred_bio"] = bool(row["pred_reasons"] & BIO_REASONS) and row["pred_outcome"] in {BIO, "MIXED_CAUSES"}
        row["ref_bio_any_domain"] = bool(row["ref_reasons"] & BIO_REASONS) and row["ref_outcome"] in {BIO, "MIXED_CAUSES"}
        row["compatible"] = compatible(row)
        row["bio_ref_any"] = row["bio_ref"] or (
            row["ref_outcome"] == "MIXED_CAUSES"
            and bool({"EFFICACY_FUTILITY", "SAFETY", "BIOLOGICAL_UNSPECIFIED"} & set(row["ref_secondary"]))
        )

    # --- Per-stratum (predicted outcome) precision, direct sample estimates
    strata = defaultdict(list)
    for row in rows:
        strata[row["stratum"]].append(row)
    per_stratum = {}
    for name, items in sorted(strata.items()):
        n = len(items)
        ok_o = sum(r["outcome_ok"] for r in items)
        ok_f = sum(r["full_ok"] for r in items)
        per_stratum[name] = {
            "sampled_texts": n,
            "eligible_texts": meta["eligible_unique_texts_by_outcome"][name],
            "eligible_records": meta["eligible_records_by_outcome"][name],
            "outcome_precision": ok_o / n,
            "outcome_precision_ci95": wilson(ok_o, n),
            "outcome_and_primary_reason_precision": ok_f / n,
            "outcome_and_primary_reason_precision_ci95": wilson(ok_f, n),
        }

    # --- Population-weighted estimates
    weights = {
        name: meta["eligible_unique_texts_by_outcome"][name] / len(items) for name, items in strata.items()
    }

    def estimate(sample: dict[str, list[dict]]) -> dict[str, float]:
        tot = defaultdict(float)
        for name, items in sample.items():
            w = weights[name]
            for r in items:
                rec = w * r["m"]
                if r["asserted"]:
                    tot["asserted"] += rec
                    tot["asserted_outcome_ok"] += rec * r["outcome_ok"]
                    tot["asserted_full_ok"] += rec * r["full_ok"]
                if r["bio_pred"]:
                    tot["bio_pred"] += rec
                    tot["bio_pred_ok"] += rec * r["bio_ref"]
                if r["bio_ref"]:
                    tot["bio_ref"] += rec
                    tot["bio_ref_found"] += rec * r["bio_pred"]
                if r["bio_ref_any"]:
                    tot["bio_ref_any"] += rec
                    tot["bio_ref_any_flagged"] += rec * (r["pred_outcome"] in {BIO, "MIXED_CAUSES"})
                if r["asserted"]:
                    tot["asserted_compatible"] += rec * r["compatible"]
                if r["pred_bio"]:
                    tot["bio_domain_pred"] += rec
                    tot["bio_domain_pred_ok"] += rec * r["ref_bio_any_domain"]
                if r["ref_bio_any_domain"]:
                    tot["bio_domain_ref"] += rec
                    tot["bio_domain_ref_found"] += rec * r["pred_bio"]
                tot["all"] += rec
                tot["all_outcome_ok"] += rec * r["outcome_ok"]
        div = lambda a, b: tot[a] / tot[b] if tot[b] else float("nan")
        return {
            "assertion_outcome_precision": div("asserted_outcome_ok", "asserted"),
            "assertion_outcome_and_primary_precision": div("asserted_full_ok", "asserted"),
            "assertion_no_material_disagreement": div("asserted_compatible", "asserted"),
            "biological_domain_precision": div("bio_domain_pred_ok", "bio_domain_pred"),
            "biological_domain_recall": div("bio_domain_ref_found", "bio_domain_ref"),
            "biological_precision": div("bio_pred_ok", "bio_pred"),
            "biological_recall": div("bio_ref_found", "bio_ref"),
            "biological_signal_recall_incl_mixed": div("bio_ref_any_flagged", "bio_ref_any"),
            "outcome_accuracy_all_records": div("all_outcome_ok", "all"),
        }

    point = estimate(strata)
    # The same numerators and denominators without the population weights: raw counts in the
    # drawn sample, so a reader can recompute every estimate by hand. They are NOT the
    # population estimates - the sample deliberately over-draws the rarer predicted outcomes -
    # but publishing them is the only way the weighting is checkable.
    raw = defaultdict(float)
    for items in strata.values():
        for r in items:
            m = r["m"]
            if r["asserted"]:
                raw["asserted"] += m
                raw["asserted_outcome_ok"] += m * r["outcome_ok"]
                raw["asserted_full_ok"] += m * r["full_ok"]
                raw["asserted_compatible"] += m * r["compatible"]
            if r["bio_pred"]:
                raw["bio_pred"] += m
                raw["bio_pred_ok"] += m * r["bio_ref"]
            if r["bio_ref"]:
                raw["bio_ref"] += m
                raw["bio_ref_found"] += m * r["bio_pred"]
            if r["bio_ref_any"]:
                raw["bio_ref_any"] += m
                raw["bio_ref_any_flagged"] += m * (r["pred_outcome"] in {BIO, "MIXED_CAUSES"})
            if r["pred_bio"]:
                raw["bio_domain_pred"] += m
                raw["bio_domain_pred_ok"] += m * r["ref_bio_any_domain"]
            if r["ref_bio_any_domain"]:
                raw["bio_domain_ref"] += m
                raw["bio_domain_ref_found"] += m * r["pred_bio"]
            raw["all"] += m
            raw["all_outcome_ok"] += m * r["outcome_ok"]
    pairs = {
        "assertion_outcome_precision": ("asserted_outcome_ok", "asserted"),
        "assertion_outcome_and_primary_precision": ("asserted_full_ok", "asserted"),
        "assertion_no_material_disagreement": ("asserted_compatible", "asserted"),
        "biological_domain_precision": ("bio_domain_pred_ok", "bio_domain_pred"),
        "biological_domain_recall": ("bio_domain_ref_found", "bio_domain_ref"),
        "biological_precision": ("bio_pred_ok", "bio_pred"),
        "biological_recall": ("bio_ref_found", "bio_ref"),
        "biological_signal_recall_incl_mixed": ("bio_ref_any_flagged", "bio_ref_any"),
        "outcome_accuracy_all_records": ("all_outcome_ok", "all"),
    }
    sample_counts = {k: {"k": round(raw[a]), "n": round(raw[b])} for k, (a, b) in pairs.items()}

    rng = random.Random(SEED)
    boots = defaultdict(list)
    for _ in range(BOOT):
        resampled = {name: [rng.choice(items) for _ in items] for name, items in strata.items()}
        for metric, value in estimate(resampled).items():
            if value == value:
                boots[metric].append(value)
    ci = {}
    for metric, values in boots.items():
        values.sort()
        ci[metric] = (values[int(0.025 * len(values))], values[int(0.975 * len(values)) - 1])

    confusion = Counter((r["pred_outcome"], r["ref_outcome"]) for r in rows)
    label_status = Counter(r["label_status"] for r in rows)
    errors = [
        {k: r[k] for k in ("sample_id", "pred_outcome", "pred_primary", "ref_outcome", "ref_primary")}
        | {"materially_different": not r["compatible"]}
        for r in rows if not r["full_ok"]
    ]

    result = {
        "schema_version": 1,
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dataset_version": meta["dataset_version"],
        "classifier_version": meta["classifier_version"],
        "sample_size": len(rows),
        "reference_label_status": dict(label_status),
        "population": {
            "records_total": meta["population_records_total"],
            "excluded_records": meta["excluded_records"],
            "eligible_records": sum(meta["eligible_records_by_outcome"].values()),
        },
        "weighted_estimates": point,
        "weighted_estimates_ci95": ci,
        "interval_method": {
            "method": "stratified bootstrap",
            "draws": BOOT,
            "seed": SEED,
            "note": "Resampled within each predicted-outcome stratum and re-weighted each draw. These are NOT Wilson "
                    "intervals: the estimates are population-weighted, so a binomial interval would not apply.",
        },
        "stratum_weights": {k: round(v, 4) for k, v in weights.items()},
        "sample_counts_unweighted": sample_counts,
        "per_predicted_outcome": per_stratum,
        "confusion_pred_vs_ref": [
            {"predicted": p, "reference": r, "count": c} for (p, r), c in sorted(confusion.items())
        ],
        "error_count_outcome_or_primary": len(errors),
        "errors": errors,
    }
    (VAL / "heldout_v2_metrics.json").write_text(json.dumps(result, indent=2) + "\n")

    # --- Markdown report
    ann = json.loads((VAL / "heldout_v2_annotation_meta.json").read_text()) if (VAL / "heldout_v2_annotation_meta.json").exists() else {}
    L = []
    L.append("# Held-out validation — Classification V2\n")
    L.append(f"Generated: {result['generated_at_utc']} · Dataset `{meta['dataset_version']}` · Classifier `{meta['classifier_version']}`\n")
    L.append("## Summary\n")
    L.append("| Metric (eligible population, weighted) | Estimate | 95% CI |\n| --- | ---: | ---: |")
    names = {
        "assertion_outcome_precision": "Precision of asserted outcomes",
        "assertion_outcome_and_primary_precision": "Precision of asserted outcome + primary reason",
        "assertion_no_material_disagreement": "Asserted records without material disagreement¹",
        "biological_domain_precision": "Biological-cause precision (incl. mixed)²",
        "biological_domain_recall": "Biological-cause recall (incl. mixed)²",
        "biological_precision": "Biological-failure precision",
        "biological_recall": "Biological-failure recall",
        "outcome_accuracy_all_records": "Outcome accuracy, all eligible records",
    }
    for metric, label in names.items():
        lo, hi = ci.get(metric, (float("nan"), float("nan")))
        L.append(f"| {label} | {pct(point[metric])} | {pct(lo)}–{pct(hi)} |")
    L.append("")
    L.append("¹ Exact outcome + primary reason, or only a convention difference between `NON_BIOLOGICAL` with secondary causes and "
             "`MIXED_CAUSES` (or `BIOLOGICAL_FAILURE` vs `MIXED_CAUSES`) where the stated causes and the biological domain agree.  ")
    L.append("² A record carries a biological cause if its outcome is `BIOLOGICAL_FAILURE`, or `MIXED_CAUSES` with an efficacy, safety or "
             "unspecified-biological reason.\n")
    L.append("## Design\n")
    L.append(f"- **Sample:** {len(rows)} unique stop-reason texts, stratified by predicted V2 outcome, fixed seed `{meta['seed']}` "
             "(`scripts/build_heldout_validation_sample_v2.py`).")
    L.append(f"- **Held out:** {meta['contaminated_text_hashes']:,} text hashes used for writing, auditing or adjudicating the rules were excluded "
             "(reviewed-reason index, 4,000-record audit gold set, golden tests, manual decisions, Open Targets adjudications), "
             f"as well as {meta['excluded_records'].get('reviewed_exact', 0):,} records classified by exact reviewed text "
             f"and {meta['excluded_records'].get('empty_stop_reason', 0):,} records without stop-reason text.")
    L.append(f"- **Eligible population:** {result['population']['eligible_records']:,} of {meta['population_records_total']:,} records "
             "(rule-classified records whose text was never used for tuning).")
    L.append("- **Reference labels:** two independent LLM annotators (different model families) labelled every text blind — "
             "without classifier output — using written guidelines (`validation/LABELING_GUIDELINES.md`). "
             "Disagreements on outcome or primary reason were resolved by a third, independent LLM adjudicator.")
    if ann:
        L.append(f"- **Inter-annotator agreement:** outcome {pct(ann['outcome_agreement'])} (Cohen's κ {ann['outcome_kappa']:.2f}); "
                 f"outcome + primary reason {pct(ann['outcome_and_primary_agreement'])}; {ann['adjudicated']} adjudicated.")
    L.append("- **Weighting:** per-stratum results are scaled to the eligible record population; intervals from a "
             f"{BOOT:,}-sample stratified bootstrap. Per-stratum intervals are Wilson score intervals.\n")
    L.append("## Precision by predicted outcome\n")
    L.append("| Predicted outcome | Eligible records | Sampled texts | Outcome precision | Outcome + primary reason |\n| --- | ---: | ---: | ---: | ---: |")
    for name, s in per_stratum.items():
        lo, hi = s["outcome_precision_ci95"]
        lo2, hi2 = s["outcome_and_primary_reason_precision_ci95"]
        L.append(f"| `{name}` | {s['eligible_records']:,} | {s['sampled_texts']} | {pct(s['outcome_precision'])} ({pct(lo)}–{pct(hi)}) | "
                 f"{pct(s['outcome_and_primary_reason_precision'])} ({pct(lo2)}–{pct(hi2)}) |")
    L.append("")
    L.append("## Confusion (sample counts, predicted → reference)\n")
    outs = ["BIOLOGICAL_FAILURE", "NON_BIOLOGICAL", "MIXED_CAUSES", "NON_FAILURE_TRANSITION", "CAUSE_NOT_STATED", "UNKNOWN"]
    L.append("| Predicted \\ Reference | " + " | ".join(f"`{o}`" for o in outs) + " |")
    L.append("| --- |" + " ---: |" * len(outs))
    for p in outs:
        L.append(f"| `{p}` | " + " | ".join(str(confusion.get((p, r), 0)) for r in outs) + " |")
    L.append("")
    L.append("## Limitations\n")
    L.append("- Reference labels are LLM-adjudicated, not expert-curated. They are independent of the classifier, but not a clinical ground truth.")
    L.append("- The registry stop-reason text is the only evidence; the true cause may differ from what the sponsor recorded.")
    L.append("- Records resolved via exact reviewed text and records without stop-reason text are outside this estimate.")
    L.append("- The `UNKNOWN` stratum measures how often a resolvable reason was left unresolved (conservatism), not a false claim.\n")
    L.append("Reproduce: `python scripts/build_heldout_validation_sample_v2.py && python scripts/evaluate_heldout_validation_v2.py`")
    (ROOT / "docs/validation_heldout_v2.md").write_text("\n".join(L) + "\n")
    print(json.dumps({"weighted": point, "ci95": ci, "per_stratum": {k: (round(v['outcome_precision'],3), round(v['outcome_and_primary_reason_precision'],3)) for k,v in per_stratum.items()}}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
