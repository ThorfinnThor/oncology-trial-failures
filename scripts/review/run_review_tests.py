#!/usr/bin/env python3
"""Tests for the independent review — no network, no key, no real files touched."""
from __future__ import annotations

import datetime as dt
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.review import llm_review as lr  # noqa: E402
from scripts.signals.stop_attribution import reviewed_key  # noqa: E402

FAILURES: list[str] = []


def check(name, got, want):
    if got != want:
        FAILURES.append(f"{name}: got {got!r}, want {want!r}")


def rec(nct, text, outcome="BIOLOGICAL_FAILURE", primary="EFFICACY_FUTILITY", secondary=""):
    return {"nct_id": nct, "why_stopped": text, "classification_outcome_v2": outcome,
            "classification_primary_reason_v2": primary, "classification_secondary_reasons_v2": secondary}


# --- parsing: prose around the JSON, invalid rows and foreign ids are dropped
ans = 'Here you go:\n[{"id":"a","outcome":"BIOLOGICAL_FAILURE","attribution":"own_data","confidence":"high","reason":"x"},' \
      '{"id":"b","outcome":"MAYBE","attribution":"own_data","confidence":"high"},' \
      '{"id":"zzz","outcome":"UNKNOWN","attribution":"unclear","confidence":"high"}]\nThanks'
parsed = lr.parse_answer(ans, {"a", "b"})
check("parse keeps the valid row only", [p["id"] for p in parsed], ["a"])
check("parse survives garbage", lr.parse_answer("no json here", {"a"}), [])

# --- selection: one reading per distinct text; nothing due once read; full review re-reads products
recs = [rec("N1", "Lack of efficacy."), rec("N2", "lack of   efficacy."), rec("N3", "Slow accrual", "NON_BIOLOGICAL", "RECRUITMENT")]
state = {"verdicts": {}, "last_full_review": None}
items, full = lr.select(recs, state, dt.date(2026, 10, 1))
check("identical texts are read once", len(items), 2)
check("the first run is a full review", full, True)
state = {"verdicts": {i["id"]: {"outcome": "UNKNOWN"} for i in items}, "last_full_review": "2026-10-01"}
check("nothing is due a week later", lr.select(recs, state, dt.date(2026, 10, 8))[0], [])
again = lr.select(recs, state, dt.date(2026, 11, 5))[0]
check("the monthly review re-reads only what feeds a rate or report", [i["text"] for i in again], ["Lack of efficacy."])

# --- budget cap and request building
many = [{"id": str(n), "text": "x" * 300} for n in range(5000)]
capped = lr.cap_to_budget(many, "claude-sonnet-5-5", 0.05)
check("the cap trims the batch", 0 < len(capped) < len(many), True)
check("the capped batch is within budget", lr.estimate_usd(capped, "claude-sonnet-5-5") <= 0.05, True)
reqs = lr.build_requests(many[:85], "claude-sonnet-5-5")
check("requests hold 40 records each", [q["custom_id"] for q in reqs], ["r00000", "r00001", "r00002"])
check("the model setting is passed through", reqs[0]["params"]["model"], "claude-sonnet-5-5")

check("dated model ids find their price", lr.price_of("claude-haiku-4-5-20251001"), (0.50, 2.50))
check("sonnet 5.5 is not priced as sonnet 5 by accident", lr.price_of("claude-sonnet-5-5"), (1.00, 5.00))
check("unknown models are priced high, so the cap errs low", lr.price_of("some-future-model"), lr.FALLBACK_PRICE)

# --- collecting batch results
pending = {"ids_by_request": {"r00000": ["a"]}}
lines = [{"custom_id": "r00000", "result": {"type": "succeeded", "message": {
    "content": [{"type": "text", "text": '[{"id":"a","outcome":"NON_BIOLOGICAL","attribution":"unclear","confidence":"high","reason":"r"}]'}],
    "usage": {"input_tokens": 1000, "output_tokens": 50}}}},
         {"custom_id": "r00001", "result": {"type": "errored"}}]
v, usage = lr.collect(lines, pending)
check("results are collected", [x["id"] for x in v], ["a"])
check("usage is counted", (usage["input_tokens"], usage["output_tokens"], usage["failed_requests"]), (1000, 50, 1))

# --- applying: what the model may change and what it may not
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    lr.REVIEWED_PATH = tmp / "attribution_reviewed.json"
    lr.OUTCOME_PATH = tmp / "outcome_disagreements.md"
    manual_text = "Terminated after the sponsor reviewed the data."
    lr.REVIEWED_PATH.write_text(json.dumps({"schema_version": 1, "entries": {
        reviewed_key(manual_text): {"attribution": "own_data", "source": "independent review 2026-09-29, adjudicated"}}}))
    t_unclear = "Sponsor decision based on emerging data."
    t_own = "Lack of efficacy."
    t_agree = "Due to lack of efficacy."
    t_medium = "Program review of the data."
    t_nonbio = "Slow accrual, and the drug did not work."
    recs = [rec("A", t_unclear), rec("B", t_own), rec("C", t_agree), rec("D", t_medium),
            rec("E", manual_text), rec("F", t_nonbio, "NON_BIOLOGICAL", "RECRUITMENT")]
    V = lambda o, a, c="high": {"outcome": o, "attribution": a, "confidence": c, "reason": "because", "model": "m", "read_on": "2026-10-01"}
    state = {"verdicts": {
        reviewed_key(t_unclear): V("BIOLOGICAL_FAILURE", "own_data"),
        reviewed_key(t_own): V("BIOLOGICAL_FAILURE", "elsewhere"),
        reviewed_key(t_agree): V("BIOLOGICAL_FAILURE", "own_data"),
        reviewed_key(t_medium): V("BIOLOGICAL_FAILURE", "elsewhere", "medium"),
        reviewed_key(manual_text): V("BIOLOGICAL_FAILURE", "elsewhere"),
        reviewed_key(t_nonbio): V("MIXED_CAUSES", "own_data"),
    }}
    result = lr.apply(recs, state)
    entries = json.loads(lr.REVIEWED_PATH.read_text())["entries"]
    get = lambda t: (entries.get(reviewed_key(t)) or {}).get("attribution")
    check("'not established' becomes the model's confident reading", get(t_unclear), "own_data")
    check("a disputed claim is shown as not established", get(t_own), "unclear")
    check("agreement adds nothing", get(t_agree), None)
    check("a medium-confidence reading does not fill a gap", get(t_medium), None)
    check("a person's verdict is never overwritten", entries[reviewed_key(manual_text)]["source"],
          "independent review 2026-09-29, adjudicated")
    check("a non-biological stop gets no attribution entry", get(t_nonbio), None)
    check("an outcome disagreement is listed", result["outcome_disagreements"], 1)
    check("and the record itself is untouched", recs[5]["classification_outcome_v2"], "NON_BIOLOGICAL")
    # applying twice changes nothing
    first = lr.REVIEWED_PATH.read_text()
    lr.apply(recs, state)
    check("apply is idempotent", lr.REVIEWED_PATH.read_text(), first)

if FAILURES:
    print("Review tests FAILED:\n" + "\n".join(FAILURES))
    raise SystemExit(1)
print("Review tests passed.")
