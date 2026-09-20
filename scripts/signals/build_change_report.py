#!/usr/bin/env python3
"""Diff the current Oncology Failure Signals release against the previous one.

Licensees update their own screens from this report instead of reprocessing the full
file. The previous release is kept as a snapshot in the enrichment cache, so the report
is produced by the same weekly job that builds the release.

Outputs product/oncology_failure_signals_change_report_v1.{json,md} and refreshes the
snapshot. With no snapshot (first run, or a cache miss) it writes an empty report that
says so rather than inventing changes.
"""
from __future__ import annotations

import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRODUCT = ROOT / "product"
CURRENT = PRODUCT / "oncology_failure_signals_v1.jsonl"
META = PRODUCT / "oncology_failure_signals_v1_meta.json"
SNAPSHOT = ROOT / ".cache/signals/previous_release.jsonl.gz"
SNAPSHOT_META = ROOT / ".cache/signals/previous_release_meta.json"
OUT_JSON = PRODUCT / "oncology_failure_signals_change_report_v1.json"
OUT_MD = PRODUCT / "oncology_failure_signals_change_report_v1.md"

# Which side a field belongs to. A registry field moving is news about the trial; one of our
# own fields moving while the registry text stands still is news about our pipeline, and a
# licensee who cannot tell the two apart will read an ontology update as competitive
# intelligence. Every changed record is attributed to one of these.
REGISTRY_FIELDS = {"overall_status", "why_stopped", "primary_completion_date"}
CLASSIFIER_FIELDS = {"failure_outcome", "failure_primary_reason", "failure_secondary_reasons"}
MAPPING_FIELDS = {"focus_assets", "focus_asset_ids", "focus_target_genes", "focus_mechanisms", "sponsor_group"}

ORIGIN_LABELS = {
    "registry_event": "The registry record changed: a status, a stop reason or a completion date. Real news about the trial.",
    "reclassification": "The registry text is unchanged; our classifier read it differently. Caused by a pipeline change, "
                        "not by anything the sponsor did.",
    "remapping": "The registry text is unchanged; the drug, target or sponsor mapping changed. Caused by an ontology or "
                 "index update, not by anything the sponsor did.",
    "mixed": "Both a registry field and one of ours moved in the same week.",
}


def origin(diffs: dict) -> str:
    """Attribute a changed record to what actually caused it to move."""
    fields = set(diffs)
    registry = bool(fields & REGISTRY_FIELDS)
    ours = bool(fields & (CLASSIFIER_FIELDS | MAPPING_FIELDS))
    if registry and ours:
        return "mixed"
    if registry:
        return "registry_event"
    if fields & CLASSIFIER_FIELDS:
        return "reclassification"
    return "remapping"


# Fields whose change is material to a licensee's screen. Enrichment coverage can move
# on any run, so only fields that change what a record *means* are tracked.
TRACKED = ["overall_status", "why_stopped", "failure_outcome", "failure_primary_reason",
           "failure_secondary_reasons", "focus_assets", "focus_asset_ids", "focus_target_genes",
           "focus_mechanisms", "sponsor_group", "primary_completion_date"]
KEEP = ["nct_id", "brief_title", "phases", "sponsor_group", "focus_assets", "overall_status",
        "why_stopped", "failure_outcome", "failure_primary_reason"] + TRACKED


def norm(value):
    return sorted(value) if isinstance(value, list) else value


def load(path, opener=open):
    rows = {}
    with opener(path, "rt", encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                r = json.loads(line)
                rows[r["nct_id"]] = r
    return rows


def summarize(rec: dict) -> dict:
    return {k: rec.get(k) for k in ("nct_id", "brief_title", "sponsor_group", "focus_assets",
                                    "failure_outcome", "failure_primary_reason", "why_stopped")}


def main() -> int:
    if not CURRENT.exists():
        print("No current release; nothing to diff.")
        return 0
    current = load(CURRENT)
    meta = json.loads(META.read_text())
    previous_version = None
    if SNAPSHOT_META.exists():
        previous_version = json.loads(SNAPSHOT_META.read_text()).get("dataset_version")

    if SNAPSHOT.exists():
        previous = load(SNAPSHOT, gzip.open)
        added = [summarize(current[n]) for n in sorted(set(current) - set(previous))]
        removed = [summarize(previous[n]) for n in sorted(set(previous) - set(current))]
        changed = []
        for nct in sorted(set(current) & set(previous)):
            diffs = {f: {"from": norm(previous[nct].get(f)), "to": norm(current[nct].get(f))}
                     for f in TRACKED if norm(previous[nct].get(f)) != norm(current[nct].get(f))}
            if diffs:
                changed.append({"nct_id": nct, "brief_title": current[nct].get("brief_title"),
                                "sponsor_group": current[nct].get("sponsor_group"),
                                "origin": origin(diffs), "changes": diffs})
        has_previous = True
    else:
        previous, added, removed, changed, has_previous = {}, [], [], [], False

    reclassified = [c for c in changed if "failure_outcome" in c["changes"] or "failure_primary_reason" in c["changes"]]
    relinked = [c for c in changed if "focus_asset_ids" in c["changes"] or "focus_target_genes" in c["changes"]]
    by_origin = {k: sum(1 for c in changed if c["origin"] == k) for k in ORIGIN_LABELS}
    previous_meta = json.loads(SNAPSHOT_META.read_text()) if SNAPSHOT_META.exists() else {}
    pipeline = {
        "classifier_version_previous": previous_meta.get("classifier_version"),
        "classifier_version_current": meta.get("classifier_version"),
        "pipeline_changed": bool(previous_meta.get("classifier_version")
                                 and previous_meta.get("classifier_version") != meta.get("classifier_version")),
    }
    report = {
        "schema_version": 1,
        "product": meta.get("product"),
        "dataset_version": meta.get("dataset_version"),
        "previous_dataset_version": previous_version,
        "has_previous_release": has_previous,
        "definition": "Changes between this release and the previous one, by NCT ID. "
                      "'added' are trials that entered the dataset, 'removed' left it (registry status or scope change), "
                      "'changed' had a tracked field move.",
        "counts": {"current_records": len(current), "previous_records": len(previous),
                   "added": len(added), "removed": len(removed), "changed": len(changed),
                   "reclassified": len(reclassified), "relinked": len(relinked),
                   "by_origin": by_origin},
        "change_origins": ORIGIN_LABELS,
        "pipeline": pipeline,
        "added": added,
        "removed": removed,
        "changed": changed,
    }
    OUT_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = [f"# Oncology Failure Signals — change report {meta.get('dataset_version')}", ""]
    if not has_previous:
        lines += ["No previous release snapshot was available, so this release has no diff.", ""]
    else:
        c = report["counts"]
        o = c["by_origin"]
        lines += [f"Against release {previous_version or 'unknown'}: "
                  f"**{c['added']} added**, **{c['removed']} removed**, **{c['changed']} changed**. "
                  f"{c['current_records']} records in this release.", "",
                  "Of the changed records, only the first row is news about a trial. The rest moved because "
                  "our own classifier or mappings changed, with the registry text standing still.", "",
                  "| What moved | Records | Meaning |", "| --- | ---: | --- |",
                  f"| Registry event | {o['registry_event']} | {ORIGIN_LABELS['registry_event']} |",
                  f"| Reclassification | {o['reclassification']} | {ORIGIN_LABELS['reclassification']} |",
                  f"| Re-mapping | {o['remapping']} | {ORIGIN_LABELS['remapping']} |",
                  f"| Both | {o['mixed']} | {ORIGIN_LABELS['mixed']} |", ""]
        if pipeline["pipeline_changed"]:
            lines += [f"> The classifier moved from {pipeline['classifier_version_previous']} to "
                      f"{pipeline['classifier_version_current']} this release, so reclassifications below are expected "
                      f"and are not sponsor activity.", ""]
        if added:
            lines += ["## Newly stopped trials", ""]
            lines += [f"- `{a['nct_id']}` — {a.get('sponsor_group') or 'unknown sponsor'}: "
                      f"{(a.get('why_stopped') or '').strip() or 'no reason recorded'}" for a in added[:50]]
            if len(added) > 50:
                lines += [f"- …and {len(added) - 50} more (see the JSON report)"]
            lines += [""]
        if reclassified:
            lines += ["## Reclassified", ""]
            for c_ in reclassified[:50]:
                moves = "; ".join(f"{f}: {d['from']} → {d['to']}" for f, d in c_["changes"].items()
                                  if f in ("failure_outcome", "failure_primary_reason"))
                lines += [f"- `{c_['nct_id']}` — {moves}"]
            lines += [""]
        if removed:
            lines += ["## Left the dataset", ""]
            lines += [f"- `{r['nct_id']}` — {r.get('sponsor_group') or 'unknown sponsor'}" for r in removed[:50]]
            lines += [""]
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")

    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(SNAPSHOT, "wt", encoding="utf-8") as fh:
        for nct in sorted(current):
            fh.write(json.dumps({k: current[nct].get(k) for k in KEEP if k in current[nct]}, ensure_ascii=False) + "\n")
    SNAPSHOT_META.write_text(json.dumps({"dataset_version": meta.get("dataset_version"),
                                         "record_count": len(current)}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["counts"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
