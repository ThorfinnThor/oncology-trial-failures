#!/usr/bin/env python3
"""Did the pipeline find the stop reason, or only fail to find it in the usual place?

The discontinuation rate reads one registry field. A trial whose sponsor recorded why it
stopped somewhere else — most often at the end of the detailed description — looks to us like
a termination with no stated cause: it sits in the denominator and never enters the numerator.
If those hidden reasons were mostly biological, every published rate would be too low, and the
validation page would be measuring the wrong thing entirely (it measures whether we read the
text correctly, not whether we found the text).

So this measures it. For every terminated trial whose stop-reason field states no cause we can
read, it fetches the study description, extracts any sentence that actually describes the
trial being stopped, and runs that sentence through the same Classification V2 rules the
registry field goes through.

The hard part is not finding the word "terminated". It is that protocols are full of stopping
rules — "the dose arm will be stopped if fewer than 3 of 5 subjects respond" — which describe
a plan, not an event. A sentence only counts here when it reports something that happened:
past or present-perfect, about this study, and not a conditional.

This never changes a published rate. The headline stays a statement about one registry field,
computed the same way every week and reproducible by anyone with the same field. What comes
out of here is a sensitivity analysis: how much the rate would move if the reasons recorded
elsewhere were counted too.

Writes .cache/signals/descriptions.jsonl.gz (resumable) and web/data/event_ascertainment.json.
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.classification_v2 import classify_reason_v2  # noqa: E402
from scripts.universe.discontinuation_rates import UNIVERSE, UNRESOLVED_TERMINATIONS  # noqa: E402

CACHE = ROOT / ".cache/signals/descriptions.jsonl.gz"
OUT = ROOT / "web/data/event_ascertainment.json"
API = "https://clinicaltrials.gov/api/v2/studies"
BATCH = 20
BIO = {"EFFICACY_FUTILITY", "SAFETY", "BIOLOGICAL_UNSPECIFIED"}

# A sentence reporting that this study was stopped. Past tense or present perfect only:
# "the study was terminated", "enrollment has been discontinued", "the sponsor halted".
STOPPED = re.compile(
    r"\b(?:study|trial|enroll\w*|recruit\w*|development|program\w*|protocol|sponsor)\b[^.]{0,120}?"
    r"\b(?:was|were|has been|have been|had been|is being|are being)\s+"
    r"(?:\w+\s+){0,3}?(?:terminated|stopped|halted|discontinued|closed|suspended|withdrawn)\b"
    r"|\b(?:sponsor|company|\w+\s+pharmaceuticals?|investigator)\b[^.]{0,60}?"
    r"\b(?:terminated|stopped|halted|discontinued)\s+(?:the\s+)?(?:study|trial|development|program\w*)\b"
    r"|\b(?:the\s+)?(?:decision|reason)\s+to\s+(?:terminate|stop|halt|discontinue)\b",
    re.I)

# Conditional, forward-looking or rule-like: a plan, not an event. "until" and "unless" catch
# treatment rules such as "patients are treated until ... unacceptable toxicity", which describe
# what happens to a patient, not why the trial ended.
PLANNED = re.compile(r"\b(?:will|would|may|might|shall|should|can|could|if|whether|in case|criteria|"
                     r"rule|until|unless|per protocol|eligible)\b", re.I)

# The stop verb itself negated: "as the development program was NOT being discontinued for safety
# reasons or due to a lack of efficacy" says the opposite of what a naive match reads.
NEGATED_STOP = re.compile(r"\b(?:not|never|no longer|neither|nor|without)\b[^.]{0,40}?"
                          r"\b(?:terminat|stopp|halt|discontinu|suspend)\w*", re.I)

# A sentence that runs on without punctuation is usually two sentences the registry ran together
# ("Study was terminated by Novartis Primary Objective for this study is to evaluate ..."). The
# stop clause is then glued to unrelated protocol text and must not be classified as one unit.
RUN_ON = re.compile(r"\b(?:primary|secondary)\s+(?:objective|endpoint|outcome)\b|\bthis study is to\b", re.I)


def sentences(text: str) -> list[str]:
    clean = re.sub(r"\s+", " ", text or "")
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", clean) if s.strip()]


def stop_sentences(text: str) -> list[str]:
    """Sentences that report this trial being stopped, with planned stopping rules removed."""
    out = []
    for s in sentences(text):
        if len(s) > 400 or not STOPPED.search(s):
            continue
        # A conditional clause anywhere in the sentence makes it a rule, not a report.
        if PLANNED.search(s) or NEGATED_STOP.search(s) or RUN_ON.search(s):
            continue
        out.append(s)
    return out


def unreadable_terminations() -> list[dict]:
    rows = []
    with gzip.open(UNIVERSE, "rt", encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            if r.get("overall_status") != "TERMINATED":
                continue
            if r.get("classification_outcome_v2") in UNRESOLVED_TERMINATIONS:
                rows.append({"nct_id": r["nct_id"], "why_stopped": r.get("why_stopped") or "",
                             "areas": r.get("disease_areas_matched") or r.get("disease_area") or ""})
    return rows


def cached() -> dict[str, dict]:
    if not CACHE.exists():
        return {}
    out = {}
    with gzip.open(CACHE, "rt", encoding="utf-8") as fh:
        for line in fh:
            d = json.loads(line)
            out[d["nct_id"]] = d
    return out


def fetch(ncts: list[str], budget_s: float) -> int:
    """Append descriptions to the cache. Resumable: run again to continue."""
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    started, added = time.time(), 0
    with gzip.open(CACHE, "at", encoding="utf-8") as out:
        for i in range(0, len(ncts), BATCH):
            if time.time() - started > budget_s:
                print(f"  time budget reached, {len(ncts) - i} left — run again to continue", file=sys.stderr)
                break
            batch = ncts[i:i + BATCH]
            url = (f"{API}?format=json&pageSize={BATCH}"
                   f"&fields=NCTId,BriefSummary,DetailedDescription&filter.ids={','.join(batch)}")
            try:
                with urllib.request.urlopen(url, timeout=40) as fh:
                    data = json.load(fh)
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                print(f"  batch {i // BATCH} failed: {exc}", file=sys.stderr)
                time.sleep(2)
                continue
            seen = set()
            for s in data.get("studies", []):
                ps = s.get("protocolSection", {})
                nct = ps.get("identificationModule", {}).get("nctId")
                dm = ps.get("descriptionModule", {})
                if not nct:
                    continue
                seen.add(nct)
                out.write(json.dumps({"nct_id": nct, "brief_summary": dm.get("briefSummary") or "",
                                      "detailed_description": dm.get("detailedDescription") or ""},
                                     ensure_ascii=False) + "\n")
                added += 1
            # Record the misses too, so a rerun does not keep asking for them.
            for nct in batch:
                if nct not in seen:
                    out.write(json.dumps({"nct_id": nct, "brief_summary": "", "detailed_description": "",
                                          "missing": True}) + "\n")
                    added += 1
            time.sleep(0.25)
    return added


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true", help="download missing descriptions and stop")
    ap.add_argument("--budget", type=float, default=140.0, help="seconds to spend fetching")
    args = ap.parse_args()

    rows = unreadable_terminations()
    have = cached()
    missing = [r["nct_id"] for r in rows if r["nct_id"] not in have]
    print(f"{len(rows)} terminations with no readable cause; {len(have)} descriptions cached, {len(missing)} missing")
    if args.fetch:
        if missing:
            print(f"fetching up to {args.budget:.0f}s of {len(missing)}…")
            print(f"  added {fetch(missing, args.budget)}")
        return 0
    if missing:
        print(f"WARNING: {len(missing)} descriptions not fetched; the report covers the rest", file=sys.stderr)

    found, outcomes, examples = [], {}, []
    for r in rows:
        d = have.get(r["nct_id"])
        if not d or d.get("missing"):
            continue
        text = (d.get("detailed_description") or "") + "\n" + (d.get("brief_summary") or "")
        hits = stop_sentences(text)
        if not hits:
            continue
        # Classify the recovered sentence exactly as the registry field would have been.
        joined = " ".join(hits)[:1500]
        res = classify_reason_v2(joined)
        fields = res.as_record_fields()
        outcome = fields.get("classification_outcome_v2")
        biological = outcome == "BIOLOGICAL_FAILURE" or (
            outcome == "MIXED_CAUSES"
            and bool({x.strip() for x in (fields.get("classification_secondary_reasons_v2") or "").split(";")
                      | {fields.get("classification_primary_reason_v2")}} & BIO))
        outcomes[outcome] = outcomes.get(outcome, 0) + 1
        found.append({"nct_id": r["nct_id"], "outcome": outcome, "biological": biological,
                      "areas": r["areas"], "sentence": joined[:400]})
        if len(examples) < 12:
            examples.append({"nct_id": r["nct_id"], "outcome": outcome, "sentence": joined[:260]})

    checked = sum(1 for r in rows if r["nct_id"] in have and not have[r["nct_id"]].get("missing"))
    bio = sum(1 for f in found if f["biological"])
    payload = {
        "schema_version": 1,
        "question": "Event ascertainment: when the registry's stop-reason field states no cause, is the cause "
                    "recorded elsewhere in the record — and if so, is it biological?",
        "method": "Every terminated trial whose stop-reason field states no readable cause, checked against its brief "
                  "summary and detailed description. A sentence counts only if it reports this trial being stopped in "
                  "the past or present perfect; conditional sentences are protocol stopping rules, not events, and are "
                  "excluded. Recovered sentences run through the same Classification V2 rules as the registry field.",
        "does_not_change_published_rates": "The published rate is a statement about one registry field, computed the "
                                            "same way every week and reproducible by anyone holding that field. This is "
                                            "a sensitivity analysis beside it, not a correction to it.",
        "terminations_with_no_readable_cause": len(rows),
        "descriptions_checked": checked,
        "reason_recovered": len(found),
        "recovered_share": (len(found) / checked) if checked else None,
        "recovered_biological": bio,
        "recovered_by_outcome": dict(sorted(outcomes.items(), key=lambda kv: -kv[1])),
        "examples": examples,
    }
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    (ROOT / ".cache/signals/event_ascertainment_detail.json").write_text(json.dumps(found, indent=1, ensure_ascii=False))
    print(f"wrote {OUT.relative_to(ROOT)}")
    print(f"  checked {checked}, recovered a stop reason for {len(found)} "
          f"({(len(found) / checked * 100) if checked else 0:.1f}%), of which {bio} biological")
    for k, v in payload["recovered_by_outcome"].items():
        print(f"    {k}: {v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
