#!/usr/bin/env python3
"""The gate between the text-reading rules and anything a customer sees.

Runs on every push (web-checks.yml) and in the weekly data run before any report is rebuilt
(update-data.yml). If it fails, nothing downstream is published and GitHub emails the owner.

Four checks, each catching a different way MISTAKES.md #15 could happen again:

1. Golden cases. Real stop reasons judged by hand, including every one that was ever shown
   wrongly. A rule change that flips any of them fails.
2. No denied safety claim, over the whole database. Every stop whose evidence says "safety in
   this trial" must contain a safety statement that an independent reader (text_guards) accepts
   as affirmed. This is the bug that happened, checked on all ~22,000 real texts, not a sample.
3. Determinism. The same text read by the same rules gives the same verdict as last time. A
   verdict that changes although neither the text nor RULES_VERSION changed means the rules
   changed without anyone saying so — the silent kind of change that produced #15.
4. Declared changes are shown. When RULES_VERSION was bumped, every changed verdict is written to
   data/attribution_changes.md, so the effect of a rule change is read before it ships.

    python scripts/signals/check_text_readers.py                 # check
    python scripts/signals/check_text_readers.py --write-snapshot  # after a successful build
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.stop_attribution import RULES_VERSION, attribute  # noqa: E402
from scripts.signals.text_guards import affirms_safety  # noqa: E402

GOLDEN = ROOT / "scripts/signals/fixtures/attribution_golden.json"
SNAPSHOT = ROOT / "data/attribution_snapshot.json"
CHANGES = ROOT / "data/attribution_changes.md"
SOURCES = [ROOT / "web/public/all_stopped_trials.json", ROOT / "data/all_stopped_trials.json"]


def load_records() -> list[dict]:
    for path in SOURCES:
        if path.exists():
            return [r for r in json.loads(path.read_text()) if (r.get("why_stopped") or "").strip()]
    return []


def text_hash(text: str) -> str:
    return hashlib.sha1(" ".join(text.split()).encode()).hexdigest()[:12]


def check_golden() -> list[str]:
    problems = []
    for case in json.loads(GOLDEN.read_text())["cases"]:
        got = attribute({"nct_id": case["nct_id"], "why_stopped": case["why_stopped"]})
        evidence = got["own_data_evidence"] + got["cascade_evidence"]
        if case.get("attribution") and got["attribution"] != case["attribution"]:
            problems.append(f"{case['nct_id']}: expected {case['attribution']}, got {got['attribution']} — {case['why_stopped'][:90]}")
        if case.get("evidence_includes") and case["evidence_includes"] not in evidence:
            problems.append(f"{case['nct_id']}: evidence should include '{case['evidence_includes']}', got {evidence}")
        if case.get("evidence_excludes") and case["evidence_excludes"] in evidence:
            problems.append(f"{case['nct_id']}: evidence must not include '{case['evidence_excludes']}' — {case['why_stopped'][:90]}")
    return problems


def verdicts(records: list[dict]) -> dict[str, dict]:
    out = {}
    for r in records:
        a = attribute(r)
        out[r["nct_id"]] = {
            "h": text_hash(r["why_stopped"]),
            "v": a["attribution"],
            "e": (a["own_data_evidence"] + a["cascade_evidence"])[:3],
        }
    return out


def check_denials(records: list[dict], current: dict[str, dict]) -> list[str]:
    problems = []
    for r in records:
        if "safety in this trial" in current[r["nct_id"]]["e"] and not affirms_safety(r["why_stopped"]):
            problems.append(f"{r['nct_id']}: 'safety in this trial' from a text that only denies safety — {r['why_stopped'][:110]}")
    return problems


def check_drift(current: dict[str, dict]) -> tuple[list[str], list[tuple[str, dict, dict]]]:
    if not SNAPSHOT.exists():
        return [], []
    snap = json.loads(SNAPSHOT.read_text())
    before = snap.get("rows", {})
    changed = [(nct, before[nct], now) for nct, now in current.items()
               if nct in before and before[nct]["h"] == now["h"] and (before[nct]["v"], before[nct]["e"]) != (now["v"], now["e"])]
    if snap.get("rules_version") == RULES_VERSION and changed:
        lines = [f"{len(changed)} verdicts changed on unchanged text while RULES_VERSION stayed {RULES_VERSION}. "
                 "Either a rule changed without being declared (bump RULES_VERSION in stop_attribution.py and read "
                 "data/attribution_changes.md), or something non-deterministic crept in."]
        lines += [f"  {nct}: {b['v']} {b['e']} -> {n['v']} {n['e']}" for nct, b, n in changed[:20]]
        return lines, changed
    return [], changed


def write_changes(changed, records_by_id, old_version: str) -> None:
    tally = Counter((b["v"], n["v"]) for _, b, n in changed)
    lines = [f"# Attribution changes: rules {old_version} -> {RULES_VERSION}", "",
             f"{len(changed)} stop reasons read differently on unchanged text.", "",
             "| from | to | count |", "|---|---|---|"]
    lines += [f"| {a} | {b} | {c} |" for (a, b), c in tally.most_common()]
    lines += ["", "## Every change", ""]
    for nct, b, n in changed:
        text = records_by_id[nct]["why_stopped"].replace("|", "/")
        lines.append(f"- **{nct}** {b['v']} {b['e']} → **{n['v']}** {n['e']}  \n  {text[:300]}")
    CHANGES.write_text("\n".join(lines) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write-snapshot", action="store_true")
    args = ap.parse_args()

    records = load_records()
    problems = check_golden()
    current = verdicts(records) if records else {}
    problems += check_denials(records, current)
    drift, changed = check_drift(current)
    problems += drift

    if changed and not drift:
        old = json.loads(SNAPSHOT.read_text()).get("rules_version", "?")
        write_changes(changed, {r["nct_id"]: r for r in records}, old)
        print(f"rules {old} -> {RULES_VERSION}: {len(changed)} declared verdict changes written to {CHANGES.relative_to(ROOT)}")

    if problems:
        print("TEXT-READER GATE FAILED — nothing downstream should be published:\n" + "\n".join(problems))
        return 1

    print(f"text-reader gate passed: {len(json.loads(GOLDEN.read_text())['cases'])} golden cases, "
          f"{len(records)} stop reasons checked for denied safety claims, rules {RULES_VERSION}")
    if args.write_snapshot and current:
        SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
        SNAPSHOT.write_text(json.dumps({"rules_version": RULES_VERSION, "rows": current}, separators=(",", ":")) + "\n")
        print(f"snapshot written: {len(current)} verdicts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
