#!/usr/bin/env python3
"""A second, independent reader for every stop reason: a language model.

The rules in classification_v2.py and stop_attribution.py read words. A one-time review by a
model (September 2026, MISTAKES.md #16) found that they got about 4% of "whose data stopped this
trial" wrong and left a quarter of clear stop reasons "not established". This script makes that
review permanent and automatic:

  weekly   every stop reason that has never been read (new trials, changed text)
  monthly  every stop reason that feeds a rate or a report is read again

It uses the Anthropic Message Batches API (half price, no hurry needed) and runs only when the
repository secret ANTHROPIC_API_KEY is set. Without it, nothing is sent and nothing changes.

What the model's reading is allowed to change, and what it is not:

  attribution  If the rules say "not established" and the model is confident the text says "this
               trial's own data" or "another trial/programme", the report shows the model's
               reading. If the rules claim one and the model confidently reads the other, the
               report shows "not established" — a disputed claim is not printed as a fact.
               Verdicts decided by a person, and the golden cases, are never overwritten.
  outcome      Never changed automatically, because it moves published rates. Disagreements are
               listed in data/llm_review/outcome_disagreements.md for a person (or Claude) to decide
               and record in data/classification_manual_decisions_v2.csv.

Settings (GitHub → Settings → Secrets and variables → Actions):
  secret    ANTHROPIC_API_KEY   turns the review on
  variable  REVIEW_MODEL        default claude-sonnet-5-5
  variable  REVIEW_MAX_USD      hard cap per run, default 15

    python scripts/review/llm_review.py run      # read what is due (needs the key), then apply
    python scripts/review/llm_review.py apply    # apply stored readings only (no key needed)
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.stop_attribution import (  # noqa: E402
    CASCADE,
    OWN_DATA,
    REVIEWED_PATH,
    UNCLEAR,
    attribute,
    reviewed_key,
)

STATE_PATH = ROOT / "data/llm_review/state.json"
OUTCOME_PATH = ROOT / "data/llm_review/outcome_disagreements.md"
REPORT_PATH = ROOT / "data/llm_review/last_run.md"
GOLDEN_PATH = ROOT / "scripts/signals/fixtures/attribution_golden.json"
SOURCES = [ROOT / "web/public/all_stopped_trials.json", ROOT / "data/all_stopped_trials.json"]

API = "https://api.anthropic.com/v1/messages/batches"
API_VERSION = "2023-06-01"
DEFAULT_MODEL = "claude-sonnet-5-5"
PER_REQUEST = 40
FULL_EVERY_DAYS = 28
LLM_SOURCE = "llm:"

# USD per million tokens with the batch discount (platform.claude.com/docs/en/about-claude/pricing,
# September 2026). Unknown models are costed at the most expensive listed here, so the cap errs
# on the side of spending less.
BATCH_PRICE = {
    "claude-haiku-4-5": (0.50, 2.50),
    "claude-sonnet-5-5": (1.00, 5.00),
    "claude-sonnet-5": (1.00, 5.00),
    "claude-opus-5-5": (2.00, 10.00),
}
FALLBACK_PRICE = (5.00, 25.00)


def price_of(model: str) -> tuple[float, float]:
    """Batch price for a model id, also for dated ids such as claude-haiku-4-5-20251001."""
    for name in sorted(BATCH_PRICE, key=len, reverse=True):
        if model == name or model.startswith(name + "-"):
            return BATCH_PRICE[name]
    return FALLBACK_PRICE

BIO = {"EFFICACY_FUTILITY", "SAFETY", "BIOLOGICAL_UNSPECIFIED"}
BIO_WORDS = re.compile(
    r"\b(efficac\w*|futil\w*|safety|toxic\w*|adverse|AEs?|SAEs?|benefit|tolerab\w*|ineffective|endpoint|"
    r"response|death|dsmb|idmc|dmc|interim)\b", re.I)

SYSTEM = """You are an expert clinical-trial analyst. You read the stop reasons that sponsors write on ClinicalTrials.gov and classify each one from its text alone.

For each record decide two things.

outcome — why the trial stopped:
- BIOLOGICAL_FAILURE: because of what the intervention did or failed to do: lack of efficacy, futility, missed endpoint, low response; safety, toxicity, adverse events, deaths, tolerability; unfavourable benefit-risk. Efficacy or safety evidence from ANOTHER trial of the same drug, and preclinical or animal toxicity findings, also count.
- NON_BIOLOGICAL: recruitment or enrolment problems (including "enrollment futility"), funding, business, strategic or portfolio decisions, drug supply or manufacturing, logistics, regulatory or administrative reasons, investigator left, COVID or pandemic disruption or exposure risk, changed standard of care without an efficacy or safety finding, design errors, too few outcome events.
- MIXED_CAUSES: a biological and a non-biological cause are both stated.
- UNKNOWN: no cause can be read from the text.
A sentence that DENIES a cause ("not due to safety concerns", "no safety issues were identified") does not establish that cause.

attribution — only meaningful when the outcome is biological or mixed; otherwise "unclear":
- own_data: based on data observed in THIS trial (its own interim analysis, adverse events, endpoint, its DSMB reviewing its data). A plain statement such as "Lack of efficacy" or "Toxicity" with no pointer elsewhere is own_data.
- elsewhere: the text points to another trial or study, a programme- or development-level decision, a sponsor-wide halt, a regulator's action, published or external evidence, or preclinical/animal findings.
- unclear: the text does not allow either conclusion (for example a bare "Safety reasons").

confidence: "high" when a careful expert would agree without hesitation, otherwise "medium".

Answer with a JSON array only, one object per record, in the order given:
[{"id": "<id>", "outcome": "...", "attribution": "own_data|elsewhere|unclear", "confidence": "high|medium", "reason": "<at most 15 words>"}]"""

ATTR_FROM_MODEL = {"own_data": OWN_DATA, "elsewhere": CASCADE, "unclear": UNCLEAR}


# ---------------------------------------------------------------------------- data

def load_records() -> list[dict]:
    for path in SOURCES:
        if path.exists():
            return [r for r in json.loads(path.read_text()) if (r.get("why_stopped") or "").strip()]
    return []


def system_outcome(r: dict) -> str:
    return r.get("classification_outcome_v2") or r.get("classification_final_outcome") or "UNKNOWN"


def system_reasons(r: dict) -> set[str]:
    sec = {x.strip() for x in (r.get("classification_secondary_reasons_v2") or "").split(";") if x.strip()}
    return ({r.get("classification_primary_reason_v2") or r.get("classification_final_category")} | sec) - {None, ""}


def counts_as_biological(r: dict) -> bool:
    out = system_outcome(r)
    return out == "BIOLOGICAL_FAILURE" or (out == "MIXED_CAUSES" and bool(system_reasons(r) & BIO))


def feeds_products(r: dict) -> bool:
    """Stop reasons that can move a rate or appear in a report."""
    return counts_as_biological(r) or bool(BIO_WORDS.search(r.get("why_stopped") or ""))


def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {"schema_version": 1, "verdicts": {}, "pending_batch": None, "last_full_review": None, "runs": []}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=1, ensure_ascii=False, sort_keys=True) + "\n")


# ---------------------------------------------------------------------------- selection

def select(records: list[dict], state: dict, today: dt.date) -> tuple[list[dict], bool]:
    """Texts due for a reading, one per distinct stop reason. Returns (items, is_full_review)."""
    verdicts = state.get("verdicts", {})
    last_full = state.get("last_full_review")
    full = last_full is None or (today - dt.date.fromisoformat(last_full)).days >= FULL_EVERY_DAYS
    due: dict[str, dict] = {}
    for r in records:
        key = reviewed_key(r["why_stopped"])
        if key in due:
            continue
        if key not in verdicts or (full and feeds_products(r)):
            due[key] = {"id": key, "text": " ".join(r["why_stopped"].split())[:1200]}
    return list(due.values()), full


def estimate_usd(items: list[dict], model: str) -> float:
    price_in, price_out = price_of(model)
    # ~3.5 characters per token (newer tokenizers produce more tokens, so this errs high),
    # plus the instructions once per request and ~60 output tokens per record.
    requests = max(1, -(-len(items) // PER_REQUEST))
    tokens_in = sum(len(i["text"]) for i in items) / 3.5 + len(items) * 12 + requests * (len(SYSTEM) / 3.5)
    tokens_out = len(items) * 60
    return tokens_in / 1e6 * price_in + tokens_out / 1e6 * price_out


def cap_to_budget(items: list[dict], model: str, max_usd: float) -> list[dict]:
    if estimate_usd(items, model) <= max_usd:
        return items
    lo, hi = 0, len(items)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if estimate_usd(items[:mid], model) <= max_usd:
            lo = mid
        else:
            hi = mid - 1
    return items[:lo]


def build_requests(items: list[dict], model: str) -> list[dict]:
    out = []
    for n in range(0, len(items), PER_REQUEST):
        chunk = items[n:n + PER_REQUEST]
        body = "\n".join(json.dumps({"id": i["id"], "text": i["text"]}, ensure_ascii=False) for i in chunk)
        out.append({
            "custom_id": f"r{n // PER_REQUEST:05d}",
            "params": {
                "model": model,
                "max_tokens": 120 * len(chunk) + 200,
                "system": SYSTEM,
                "messages": [{"role": "user", "content": f"Records (JSON lines):\n{body}"}],
            },
        })
    return out


# ---------------------------------------------------------------------------- parsing

VALID_OUTCOME = {"BIOLOGICAL_FAILURE", "NON_BIOLOGICAL", "MIXED_CAUSES", "UNKNOWN"}


def parse_answer(text: str, expected_ids: set[str]) -> list[dict]:
    """The model's JSON array, validated. Anything malformed is dropped and read again next run."""
    start, end = text.find("["), text.rfind("]")
    if start < 0 or end <= start:
        return []
    try:
        rows = json.loads(text[start:end + 1])
    except ValueError:
        return []
    out = []
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict) or row.get("id") not in expected_ids:
            continue
        outcome = str(row.get("outcome") or "").upper()
        attribution = str(row.get("attribution") or "").lower()
        confidence = str(row.get("confidence") or "").lower()
        if outcome not in VALID_OUTCOME or attribution not in ATTR_FROM_MODEL or confidence not in {"high", "medium"}:
            continue
        out.append({"id": row["id"], "outcome": outcome, "attribution": attribution,
                    "confidence": confidence, "reason": str(row.get("reason") or "")[:200]})
    return out


# ---------------------------------------------------------------------------- API

def _headers(key: str) -> dict:
    return {"x-api-key": key, "anthropic-version": API_VERSION, "content-type": "application/json"}


def submit(requests_: list[dict], key: str) -> str:
    import requests
    r = requests.post(API, headers=_headers(key), json={"requests": requests_}, timeout=120)
    r.raise_for_status()
    return r.json()["id"]


def status(batch_id: str, key: str) -> dict:
    import requests
    r = requests.get(f"{API}/{batch_id}", headers=_headers(key), timeout=60)
    r.raise_for_status()
    return r.json()


def results(url: str, key: str) -> list[dict]:
    import requests
    r = requests.get(url, headers=_headers(key), timeout=300)
    r.raise_for_status()
    return [json.loads(line) for line in r.text.splitlines() if line.strip()]


def collect(lines: list[dict], pending: dict) -> tuple[list[dict], dict]:
    ids_by_request = pending.get("ids_by_request", {})
    verdicts, usage = [], {"input_tokens": 0, "output_tokens": 0, "failed_requests": 0}
    for line in lines:
        res = line.get("result") or {}
        if res.get("type") != "succeeded":
            usage["failed_requests"] += 1
            continue
        msg = res.get("message") or {}
        u = msg.get("usage") or {}
        usage["input_tokens"] += int(u.get("input_tokens") or 0) + int(u.get("cache_read_input_tokens") or 0)
        usage["output_tokens"] += int(u.get("output_tokens") or 0)
        text = "".join(b.get("text", "") for b in msg.get("content", []) if b.get("type") == "text")
        verdicts += parse_answer(text, set(ids_by_request.get(line.get("custom_id"), [])))
    return verdicts, usage


# ---------------------------------------------------------------------------- apply

def golden_keys() -> set[str]:
    if not GOLDEN_PATH.exists():
        return set()
    return {reviewed_key(c["why_stopped"]) for c in json.loads(GOLDEN_PATH.read_text())["cases"]}


def apply(records: list[dict], state: dict) -> dict:
    """Turn stored readings into reviewed attribution verdicts and an outcome-disagreement list."""
    store = json.loads(REVIEWED_PATH.read_text()) if REVIEWED_PATH.exists() else {"schema_version": 1, "entries": {}}
    entries = store["entries"]
    # Readings by the model are recomputed from scratch every time; everything else stays.
    entries = {k: v for k, v in entries.items() if not str(v.get("source", "")).startswith(LLM_SOURCE)}
    protected = set(entries) | golden_keys()
    verdicts = state.get("verdicts", {})

    added = {"adopted": 0, "disputed": 0}
    outcome_rows, seen = [], set()
    for r in records:
        key = reviewed_key(r["why_stopped"])
        v = verdicts.get(key)
        if not v or key in seen:
            continue
        seen.add(key)
        text = " ".join(r["why_stopped"].split())

        # Outcome: listed, never applied.
        model_bio = v["outcome"] in {"BIOLOGICAL_FAILURE", "MIXED_CAUSES"}
        if v["confidence"] == "high" and model_bio != counts_as_biological(r) and v["outcome"] != "UNKNOWN":
            outcome_rows.append((r["nct_id"], system_outcome(r), v["outcome"], v["reason"], text))

        # Attribution: only where the stop counts as biological, and never over a person's verdict.
        if key in protected or not counts_as_biological(r):
            continue
        rule = attribute(r)["rule_attribution"]
        model = ATTR_FROM_MODEL[v["attribution"]]
        source = f"{LLM_SOURCE}{v.get('model', '?')}:{v.get('read_on', '?')}"
        if rule == UNCLEAR and model in (OWN_DATA, CASCADE) and v["confidence"] == "high":
            entries[key] = {"attribution": model, "source": source, "example_text": text[:400], "nct_ids": [r["nct_id"]]}
            added["adopted"] += 1
        elif rule in (OWN_DATA, CASCADE) and model != rule and model != UNCLEAR:
            # The rules claim one thing and the model reads the other: print neither as fact.
            entries[key] = {"attribution": UNCLEAR, "source": source, "example_text": text[:400], "nct_ids": [r["nct_id"]],
                            "disputed": {"rules": rule, "model": model, "reason": v["reason"]}}
            added["disputed"] += 1

    store["entries"] = dict(sorted(entries.items()))
    REVIEWED_PATH.write_text(json.dumps(store, indent=1, ensure_ascii=False) + "\n")

    OUTCOME_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = ["# Outcome disagreements (not applied)", "",
             "The review model reads these stop reasons differently from the classifier on the one question",
             "that moves published rates: was it the drug? Nothing here is applied automatically. To accept one,",
             "add the stop reason to data/classification_manual_decisions_v2.csv as an APPROVED decision.", "",
             f"{len(outcome_rows)} stop reasons.", "", "| NCT | classifier | model | model's reason | stop reason |", "|---|---|---|---|---|"]
    for nct, sysv, mod, why, text in sorted(outcome_rows):
        lines.append(f"| {nct} | {sysv} | {mod} | {why.replace('|', '/')} | {text[:220].replace('|', '/')} |")
    OUTCOME_PATH.write_text("\n".join(lines) + "\n")
    return {**added, "outcome_disagreements": len(outcome_rows)}


# ---------------------------------------------------------------------------- run

def report(lines: list[str]) -> None:
    text = "\n".join(lines) + "\n"
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(text)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as fh:
            fh.write(text)
    print(text)


def run(args) -> int:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    model = (os.environ.get("REVIEW_MODEL") or DEFAULT_MODEL).strip()
    max_usd = float(os.environ.get("REVIEW_MAX_USD") or 15)
    today = dt.date.today()
    records = load_records()
    state = load_state()
    notes = [f"## Independent review of stop reasons — {today.isoformat()}", ""]

    if args.command == "run" and not key:
        notes.append("ANTHROPIC_API_KEY is not set, so nothing was sent. Stored readings were applied.")
    elif args.command == "run":
        pending = state.get("pending_batch")
        if not pending:
            items, full = select(records, state, today)
            capped = cap_to_budget(items, model, max_usd)
            if not capped:
                notes.append("Nothing is due for a reading.")
            else:
                reqs = build_requests(capped, model)
                batch_id = submit(reqs, key)
                pending = {"id": batch_id, "model": model, "submitted": today.isoformat(), "full": full and len(capped) == len(items),
                           "items": len(capped), "estimate_usd": round(estimate_usd(capped, model), 2),
                           "ids_by_request": {q["custom_id"]: [i["id"] for i in capped[n * PER_REQUEST:(n + 1) * PER_REQUEST]]
                                              for n, q in enumerate(reqs)}}
                state["pending_batch"] = pending
                save_state(state)
                notes.append(f"Submitted {len(capped)} stop reasons to {model} (estimate ${pending['estimate_usd']}"
                             + (f"; {len(items) - len(capped)} more wait for the next run under the ${max_usd:g} cap" if len(capped) < len(items) else "")
                             + ").")
        if pending:
            deadline = time.time() + args.wait_minutes * 60
            info = status(pending["id"], key)
            while info.get("processing_status") != "ended" and time.time() < deadline:
                time.sleep(30)
                info = status(pending["id"], key)
            if info.get("processing_status") != "ended":
                notes.append(f"Batch {pending['id']} is still being processed; its results are collected on the next run.")
            else:
                verdicts, usage = collect(results(info["results_url"], key), pending)
                price_in, price_out = price_of(pending["model"])
                cost = usage["input_tokens"] / 1e6 * price_in + usage["output_tokens"] / 1e6 * price_out
                for v in verdicts:
                    state["verdicts"][v.pop("id")] = {**v, "model": pending["model"], "read_on": today.isoformat()}
                if pending.get("full"):
                    state["last_full_review"] = today.isoformat()
                state["runs"] = (state.get("runs") or [])[-50:] + [{
                    "date": today.isoformat(), "model": pending["model"], "read": len(verdicts),
                    "submitted": pending["items"], "cost_usd": round(cost, 3), **usage}]
                state["pending_batch"] = None
                save_state(state)
                notes.append(f"Read {len(verdicts)} of {pending['items']} stop reasons with {pending['model']} "
                             f"for ${cost:.2f} ({usage['input_tokens']:,} input / {usage['output_tokens']:,} output tokens"
                             + (f", {usage['failed_requests']} failed requests retried next run" if usage["failed_requests"] else "") + ").")

    applied = apply(records, state)
    notes += ["", f"- Stop reasons with a stored reading: {len(state.get('verdicts', {})):,}",
              f"- Attribution taken from the model where the rules said 'not established': {applied['adopted']}",
              f"- Attribution disputed between rules and model, shown as 'not established': {applied['disputed']}",
              f"- Outcome disagreements listed for a decision (not applied): {applied['outcome_disagreements']}"
              + " — see data/llm_review/outcome_disagreements.md"]
    report(notes)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["run", "apply"])
    ap.add_argument("--wait-minutes", type=float, default=45)
    return run(ap.parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
