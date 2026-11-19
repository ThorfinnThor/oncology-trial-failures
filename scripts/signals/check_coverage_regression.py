#!/usr/bin/env python3
"""Stop a release whose enrichment coverage fell far below the previous one.

On 2 Nov one ChEMBL search failed and the release went out with no target genes at all; the
build step was green. A source can fail partly and quietly (status PARTIAL), so the numbers
themselves are compared: this week's web/data/product_summary.json (just rebuilt) against the
one committed last week (git HEAD). A large drop fails the step, so the previous, checked
summary stays online and the run turns red.

  python scripts/signals/check_coverage_regression.py
  python scripts/signals/check_coverage_regression.py --previous old.json --current new.json
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUMMARY = "web/data/product_summary.json"

# (field, kind, allowed drop). "pp": share of trials, absolute drop in percentage points.
# "rel": a count, relative drop. Ordinary week-to-week movement is a point or two.
LIMITS = [
    ("trials_with_focus_target_gene", "pp", 0.10),     # ChEMBL targets and gene symbols
    ("trials_with_resolved_focus_asset", "pp", 0.10),  # ChEMBL / RxNorm molecule resolution
    ("trials_with_pubmed_publication", "pp", 0.15),
    ("unique_assets", "rel", 0.20),
    ("trial_count", "rel", 0.10),
]


def problems(previous: dict, current: dict) -> list[str]:
    out = []
    for field, kind, limit in LIMITS:
        old, new = previous.get(field), current.get(field)
        if not isinstance(old, (int, float)) or not isinstance(new, (int, float)) or old <= 0:
            continue
        if kind == "pp" and old - new > limit:
            out.append(f"{field}: {old:.1%} -> {new:.1%} (down {100 * (old - new):.1f} points; limit {100 * limit:.0f})")
        if kind == "rel" and (old - new) / old > limit:
            out.append(f"{field}: {old:,} -> {new:,} (down {(old - new) / old:.0%}; limit {limit:.0%})")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--previous", type=Path, help="default: the committed version (git HEAD)")
    ap.add_argument("--current", type=Path, default=ROOT / SUMMARY)
    args = ap.parse_args()
    if args.previous:
        previous = json.loads(args.previous.read_text())
    else:
        try:
            previous = json.loads(subprocess.check_output(["git", "show", f"HEAD:{SUMMARY}"], cwd=ROOT))
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            print("coverage check: no previous summary committed; nothing to compare")
            return 0
    current = json.loads(args.current.read_text())
    found = problems(previous, current)
    if found:
        print("coverage check FAILED: this release lost enrichment the previous one had:")
        for p in found:
            print("  " + p)
        print("Check source_status in product/oncology_failure_signals_v1_meta.json (ChEMBL, RxNorm, PubMed).")
        return 1
    print("coverage check passed: " + ", ".join(
        f"{f} {current[f]:.1%}" if k == "pp" else f"{f} {current[f]:,}"
        for f, k, _ in LIMITS if isinstance(current.get(f), (int, float))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
