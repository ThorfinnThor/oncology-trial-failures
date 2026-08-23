#!/usr/bin/env python3
"""Materialize the completed semantic audit as row-level JSONL fixtures.

The historical audit lives on a documentation-only branch.  This script reads
both the audit document and its frozen canonical oncology snapshot through
``git show`` and turns records 1-4000 into a testable dataset.  Rows omitted
from the error lists are the records counted as correct in each batch.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any, Dict, Iterable, Optional, Tuple


AUDIT_REF = "origin/audit/batch-3"
AUDIT_DOC = "docs/classification_audit.md"
AUDIT_DATA = "data/all_oncology_stopped_trials.json"
NCT_PATTERN = re.compile(r"`(NCT\d{8})`")
BATCH_PATTERN = re.compile(r"(?:# Classification Audit — Batch|## Batch)\s+(\d+)")
SECTION_PATTERN = re.compile(r"^#{2,3}\s+[A-G]\.\s+(.+?)\s*$")


def git_text(ref: str, path: str) -> str:
    result = subprocess.run(
        ["git", "show", f"{ref}:{path}"],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return result.stdout


def section_target(heading: str, note: str = "") -> Tuple[str, Optional[str], Optional[str]]:
    text = heading.lower()
    note_lower = note.lower()
    if "ambiguous" in text or "mixed-cause" in text or "non-failure" in text:
        return "REVIEW", None, None
    if "other/unknown" in text and "operational" in text and "should be" in text:
        if text.index("other/unknown") < text.index("operational"):
            return "MISCLASSIFIED", "NON_BIOLOGICAL", "OPERATIONAL"
        return "MISCLASSIFIED", "UNCLEAR", "OTHER/UNKNOWN"
    if "missed `efficacy/futility`" in text:
        return "MISCLASSIFIED", "BIOLOGICAL_FAILURE", "EFFICACY/FUTILITY"
    if "missed `safety`" in text:
        return "MISCLASSIFIED", "BIOLOGICAL_FAILURE", "SAFETY"
    if "missed `regulatory`" in text or "should be `regulatory`" in text:
        return "MISCLASSIFIED", "NON_BIOLOGICAL", "REGULATORY"
    if "inverse biological" in text:
        if "should be `other/unknown`" in text or "`other/unknown`" in note_lower:
            return "MISCLASSIFIED", "UNCLEAR", "OTHER/UNKNOWN"
        if "`operational`" in note_lower:
            return "MISCLASSIFIED", "NON_BIOLOGICAL", "OPERATIONAL"
        # The historical audit counted all inverse biological cases as definite
        # errors.  Where it did not name a replacement bucket, the conservative
        # legacy representation is unknown rather than another asserted cause.
        return "MISCLASSIFIED", "UNCLEAR", "OTHER/UNKNOWN"
    raise ValueError(f"Unsupported audit section: {heading!r}")


def parse_annotations(markdown: str) -> Dict[str, Dict[str, Any]]:
    annotations: Dict[str, Dict[str, Any]] = {}
    batch: Optional[int] = None
    section: Optional[str] = None

    for line in markdown.splitlines():
        batch_match = BATCH_PATTERN.search(line)
        if batch_match:
            batch = int(batch_match.group(1))
            section = None
            continue

        section_match = SECTION_PATTERN.match(line)
        if section_match:
            section = section_match.group(1)
            continue

        if batch is None or batch > 20 or section is None or not line.startswith("-"):
            continue

        nct_match = NCT_PATTERN.search(line)
        if not nct_match:
            continue
        nct_id = nct_match.group(1)
        result, label, reason = section_target(section, line)
        if nct_id in annotations:
            raise ValueError(f"Duplicate audit annotation for {nct_id}")
        annotations[nct_id] = {
            "audit_result": result,
            "expected_label": label,
            "expected_reason": reason,
            "audit_note": line[2:].strip(),
            "source_batch": batch,
            "source_section": section,
        }
    return annotations


def iter_gold_rows(
    source_rows: Iterable[Dict[str, Any]],
    annotations: Dict[str, Dict[str, Any]],
) -> Iterable[Dict[str, Any]]:
    seen_annotations = set()
    for record_number, row in enumerate(source_rows, start=1):
        if record_number > 4000:
            break
        nct_id = str(row.get("nct_id") or "").strip().upper()
        if not nct_id:
            raise ValueError(f"Canonical record {record_number} has no NCT ID")
        annotation = annotations.get(nct_id)
        if annotation:
            seen_annotations.add(nct_id)
        else:
            annotation = {
                "audit_result": "CORRECT",
                "expected_label": row.get("classification_label"),
                "expected_reason": row.get("classification_reason"),
                "audit_note": "Counted as correct in the completed batch summary.",
                "source_batch": ((record_number - 1) // 200) + 1,
                "source_section": "Correct (not individually listed)",
            }

        yield {
            "nct_id": nct_id,
            "canonical_record": record_number,
            "why_stopped": row.get("why_stopped") or "",
            "original_label": row.get("classification_label") or "",
            "original_reason": row.get("classification_reason") or "",
            "original_confidence": row.get("classification_confidence") or "",
            **annotation,
        }

    missing = sorted(set(annotations) - seen_annotations)
    if missing:
        raise ValueError(f"Audit annotations absent from canonical records 1-4000: {missing[:10]}")


def write_jsonl(path: Path, rows: Iterable[Dict[str, Any]]) -> Counter:
    path.parent.mkdir(parents=True, exist_ok=True)
    counts: Counter = Counter()
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
            counts[row["audit_result"]] += 1
    return counts


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit-ref", default=AUDIT_REF)
    parser.add_argument("--output", default="tests/classification_gold_v2.jsonl")
    parser.add_argument("--meta-output", default="tests/classification_gold_v2_meta.json")
    args = parser.parse_args()

    markdown = git_text(args.audit_ref, AUDIT_DOC)
    source_rows = json.loads(git_text(args.audit_ref, AUDIT_DATA))
    annotations = parse_annotations(markdown)
    counts = write_jsonl(Path(args.output), iter_gold_rows(source_rows, annotations))

    expected = Counter({"CORRECT": 2261, "MISCLASSIFIED": 1393, "REVIEW": 346})
    if counts != expected:
        raise ValueError(f"Audit arithmetic mismatch: expected {expected}, got {counts}")

    meta = {
        "schema_version": 1,
        "source_ref": args.audit_ref,
        "source_document": AUDIT_DOC,
        "source_dataset": AUDIT_DATA,
        "record_range": [1, 4000],
        "counts": dict(counts),
        "important_limitation": (
            "Rows marked CORRECT inherit the historical classifier output because the "
            "Markdown audit did not record their adjudicated label individually."
        ),
    }
    Path(args.meta_output).write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote {sum(counts.values())} gold rows to {args.output}: {dict(counts)}")


if __name__ == "__main__":
    main()
