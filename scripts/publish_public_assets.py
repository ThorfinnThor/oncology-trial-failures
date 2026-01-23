#!/usr/bin/env python3
import json
import os
import shutil
from datetime import datetime, timezone

ROOT_JSON = "data/biological_failure_oncology_trials.json"
ROOT_CSV = "data/biological_failure_oncology_trials.csv"

PUBLIC_DIR = os.path.join("web", "public")
PUBLIC_JSON = os.path.join(PUBLIC_DIR, "biological_failure_oncology_trials.json")
PUBLIC_CSV = os.path.join(PUBLIC_DIR, "biological_failure_oncology_trials.csv")
PUBLIC_META = os.path.join(PUBLIC_DIR, "dataset_meta.json")


def main() -> None:
    if not os.path.exists(ROOT_JSON):
        raise FileNotFoundError(f"Missing {ROOT_JSON}. Run the data pipeline first.")

    os.makedirs(PUBLIC_DIR, exist_ok=True)

    with open(ROOT_JSON, "r", encoding="utf-8") as f:
        rows = json.load(f)

    # Compute simple metadata
    record_count = len(rows)
    max_last_update = ""
    for r in rows:
        d = (r.get("last_update_post_date") or "").strip()
        if d and d > max_last_update:
            max_last_update = d

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Version: stable and meaningful for cache invalidation
    # If max_last_update is empty, fall back to generated_at.
    version = max_last_update or generated_at

    meta = {
        "version": version,
        "generated_at_utc": generated_at,
        "record_count": record_count,
        "max_last_update_post_date": max_last_update,
        "source": "ClinicalTrials.gov API v2",
        "notes": "Static export for the webapp; version changes when dataset updates.",
    }

    # Copy JSON (pretty large) and optional CSV
    shutil.copyfile(ROOT_JSON, PUBLIC_JSON)

    if os.path.exists(ROOT_CSV):
        shutil.copyfile(ROOT_CSV, PUBLIC_CSV)

    with open(PUBLIC_META, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"Wrote: {PUBLIC_JSON}")
    if os.path.exists(PUBLIC_CSV):
        print(f"Wrote: {PUBLIC_CSV}")
    print(f"Wrote: {PUBLIC_META}")


if __name__ == "__main__":
    main()
