#!/usr/bin/env python3
import json
import hashlib
import os
import shutil
from collections import Counter
from datetime import datetime, timezone

try:
    from classification_v2 import CLASSIFIER_VERSION
except ImportError:
    from scripts.classification_v2 import CLASSIFIER_VERSION

ROOT_ALL_JSON = "data/all_stopped_trials.json"
ROOT_ALL_CSV = "data/all_stopped_trials.csv"

ROOT_BIO_JSON = "data/biological_failure_trials.json"
ROOT_BIO_CSV = "data/biological_failure_trials.csv"
ROOT_CHANGES_JSON = "data/ingest_changes.json"
ROOT_QUALITY_JSON = "data/classification_v2_quality.json"
ROOT_HELDOUT_JSON = "validation/heldout_v2_metrics.json"

PUBLIC_DIR = os.path.join("web", "public")

PUBLIC_ALL_JSON = os.path.join(PUBLIC_DIR, "all_stopped_trials.json")
PUBLIC_ALL_CSV = os.path.join(PUBLIC_DIR, "all_stopped_trials.csv")

PUBLIC_BIO_JSON = os.path.join(PUBLIC_DIR, "biological_failure_trials.json")
PUBLIC_BIO_CSV = os.path.join(PUBLIC_DIR, "biological_failure_trials.csv")

PUBLIC_META = os.path.join(PUBLIC_DIR, "dataset_meta.json")
PUBLIC_CHANGES_JSON = os.path.join(PUBLIC_DIR, "ingest_changes.json")

PUBLIC_SPECIALNESS = os.path.join(PUBLIC_DIR, "specialness_index.json")


def _load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _validate_rows(rows, path: str):
    if not isinstance(rows, list) or not rows:
        raise ValueError(f"{path} must contain a non-empty JSON array")
    ids = [str(row.get("nct_id") or "").strip().upper() for row in rows]
    if "" in ids:
        raise ValueError(f"{path} contains a row without nct_id")
    if len(ids) != len(set(ids)):
        raise ValueError(f"{path} contains duplicate nct_id values")
    return set(ids)


def _sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    for p in [ROOT_ALL_JSON, ROOT_BIO_JSON]:
        if not os.path.exists(p):
            raise FileNotFoundError(f"Missing {p}. Run the data pipeline first.")

    os.makedirs(PUBLIC_DIR, exist_ok=True)

    all_rows = _load_json(ROOT_ALL_JSON)
    bio_rows = _load_json(ROOT_BIO_JSON)
    all_ids = _validate_rows(all_rows, ROOT_ALL_JSON)
    bio_ids = _validate_rows(bio_rows, ROOT_BIO_JSON)
    if not bio_ids.issubset(all_ids):
        raise ValueError(f"{ROOT_BIO_JSON} contains records absent from {ROOT_ALL_JSON}")

    def max_date(rows):
        m = ""
        for r in rows:
            d = (r.get("last_update_post_date") or "").strip()
            if d and d > m:
                m = d
        return m

    all_max = max_date(all_rows)
    bio_max = max_date(bio_rows)

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    source_snapshot_id = f"sha256:{_sha256(ROOT_ALL_JSON)}"
    changes = _load_json(ROOT_CHANGES_JSON) if os.path.exists(ROOT_CHANGES_JSON) else {}
    change_summary = changes.get("summary", {}) if isinstance(changes, dict) else {}
    has_content_changes = any(
        int(change_summary.get(field) or 0) > 0
        for field in (
            "new_records",
            "updated_records",
            "status_changes",
            "classification_changes",
            "removed_records",
        )
    )
    content_changed_at = changes.get("generated_at_utc") if has_content_changes else None

    version = all_max or generated_at

    # Top 10 disease areas (UX shortcut)
    counts = {}
    for r in all_rows:
        a = (r.get("disease_area") or "Other").strip() or "Other"
        counts[a] = counts.get(a, 0) + 1
    top_10 = sorted(counts.items(), key=lambda x: (-x[1], x[0]))[:10]
    top_areas = [{"area": a, "count": c} for a, c in top_10]
    v2_outcomes = Counter(
        (r.get("classification_outcome_v2") or "UNKNOWN").strip() or "UNKNOWN"
        for r in all_rows
    )
    v2_reasons = Counter(
        (r.get("classification_primary_reason_v2") or "UNSPECIFIED").strip()
        or "UNSPECIFIED"
        for r in all_rows
    )
    v2_review_count = sum(bool(r.get("classification_needs_review")) for r in all_rows)
    quality = _load_json(ROOT_QUALITY_JSON).get("metrics", {}) if os.path.exists(ROOT_QUALITY_JSON) else {}
    heldout = {}
    if os.path.exists(ROOT_HELDOUT_JSON):
        h = _load_json(ROOT_HELDOUT_JSON)
        est, ci = h.get("weighted_estimates", {}), h.get("weighted_estimates_ci95", {})
        heldout = {
            "method": "Held-out stratified sample; blind LLM double annotation with LLM adjudication",
            "generated_at_utc": h.get("generated_at_utc"),
            "classifier_version": h.get("classifier_version"),
            "sample_size": h.get("sample_size"),
            "eligible_records": h.get("population", {}).get("eligible_records"),
            "biological_precision": est.get("biological_precision"),
            "biological_precision_ci95": ci.get("biological_precision"),
            "biological_recall": est.get("biological_recall"),
            "biological_recall_ci95": ci.get("biological_recall"),
            "assertion_no_material_disagreement": est.get("assertion_no_material_disagreement"),
            "assertion_no_material_disagreement_ci95": ci.get("assertion_no_material_disagreement"),
            "assertion_outcome_and_primary_precision": est.get("assertion_outcome_and_primary_precision"),
            "assertion_outcome_and_primary_precision_ci95": ci.get("assertion_outcome_and_primary_precision"),
        }

    meta = {
        "version": version,
        "generated_at_utc": generated_at,
        "imported_at_utc": generated_at,
        "source_verified_at": generated_at,
        "latest_source_update_at": all_max,
        "content_changed_at": content_changed_at,
        "source_snapshot_id": source_snapshot_id,
        "source": "ClinicalTrials.gov API v2",
        "all": {
            "record_count": len(all_rows),
            "max_last_update_post_date": all_max,
        },
        "biological_failure": {
            "record_count": len(bio_rows),
            "max_last_update_post_date": bio_max,
        },
        "top_areas": top_areas,
        "classification_v2": {
            "version": CLASSIFIER_VERSION,
            "outcomes": dict(v2_outcomes.most_common()),
            "primary_reasons": dict(v2_reasons.most_common()),
            "needs_review": v2_review_count,
            "quality": quality,
            "heldout_validation": heldout,
            "review_policy": (
                "Mixed, content-free, and novel stop reasons are review-gated rather "
                "than forced into a failure bucket."
            ),
        },
        "notes": (
            "Disease areas are keyword-based mappings from conditions/MeSH terms; "
            "countries are trial site countries. Classifications are analytical "
            "screening signals and may require primary-source verification."
        ),
    }

    shutil.copyfile(ROOT_ALL_JSON, PUBLIC_ALL_JSON)
    shutil.copyfile(ROOT_BIO_JSON, PUBLIC_BIO_JSON)

    if os.path.exists(ROOT_ALL_CSV):
        shutil.copyfile(ROOT_ALL_CSV, PUBLIC_ALL_CSV)
    if os.path.exists(ROOT_BIO_CSV):
        shutil.copyfile(ROOT_BIO_CSV, PUBLIC_BIO_CSV)

    with open(PUBLIC_META, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    if os.path.exists(ROOT_CHANGES_JSON):
        shutil.copyfile(ROOT_CHANGES_JSON, PUBLIC_CHANGES_JSON)

    # Build and publish enrichment/outlier aggregates used by /outliers
    try:
        # When invoked as: python scripts/publish_public_assets.py
        from build_specialness_assets import build_specialness_index  # type: ignore
    except Exception:
        # When invoked as a module: python -m scripts.publish_public_assets
        from scripts.build_specialness_assets import build_specialness_index  # type: ignore

    specialness = build_specialness_index(all_rows)
    with open(PUBLIC_SPECIALNESS, "w", encoding="utf-8") as f:
        json.dump(specialness, f, ensure_ascii=False, indent=2)
    print(f"Wrote: {PUBLIC_SPECIALNESS}")

    print(f"Wrote: {PUBLIC_ALL_JSON}")
    print(f"Wrote: {PUBLIC_BIO_JSON}")
    if os.path.exists(ROOT_ALL_CSV):
        print(f"Wrote: {PUBLIC_ALL_CSV}")
    if os.path.exists(ROOT_BIO_CSV):
        print(f"Wrote: {PUBLIC_BIO_CSV}")
    print(f"Wrote: {PUBLIC_META}")
    if os.path.exists(ROOT_CHANGES_JSON):
        print(f"Wrote: {PUBLIC_CHANGES_JSON}")


if __name__ == "__main__":
    main()
