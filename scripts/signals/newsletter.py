#!/usr/bin/env python3
"""The fortnightly mail: what entered the dataset, and what a sponsor changed.

The data is rebuilt weekly and the mail goes out every second week, so one week's changes have to
survive until the next. They are accumulated in KV rather than recomputed: a change report covers
exactly one release, and a mail that only ever carried the latest one would silently drop half of
what happened.

Cadence is measured, not assumed. "Every other run" breaks the first time a run is skipped or
re-run; "at least twelve days since the last send" does not.

Nobody is in the loop. This runs at the end of the weekly workflow, reads the subscribers straight
from KV, and sends. With no API key it writes the mail to a file instead and says so, so the
content can be read and judged before anyone signs up to a sending service.

  python scripts/signals/newsletter.py             # accumulate, and send if one is due
  python scripts/signals/newsletter.py --dry-run   # never send, always write, never clear
  python scripts/signals/newsletter.py --force     # send now regardless of when the last one went

Environment:
  CF_API_TOKEN     read the subscribers and the pending changes (Workers KV: Read and Write)
  BREVO_API_KEY    send the mail
  MAIL_FROM, MAIL_FROM_NAME   the sender
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.send_watchlists import (  # noqa: E402  — one KV client, one place
    KV_API,
    account_id,
    api,
    namespace_id,
)

REPORT = ROOT / "product/oncology_failure_signals_change_report_v1.json"
SUMMARY = ROOT / "web/data/product_summary.json"
OUT_DIR = ROOT / "product/newsletter"
# Shown on the signup page: the same items the mail is built from.
PREVIEW = ROOT / "web/data/newsletter_preview.json"
PREVIEW_ROWS = 8
SIGNALS = ROOT / "product/oncology_failure_signals_v1.jsonl"
SITE = "https://clinicaltrialfailures.com"
BREVO_API = "https://api.brevo.com/v3/smtp/email"

PENDING_KEY = "newsletter:pending"
DAYS_BETWEEN = 12          # a fortnight, with room for a run that starts late
MAX_ROWS = 25              # a mail is a summary; the site is the list


def shorten(value, limit: int) -> str:
    """Cut at a word, not mid-word. A registry title ending in "High Risk Mantle Cel" reads like
    the mail broke, and the first one anybody received did exactly that."""
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    cut = text[:limit]
    space = cut.rfind(" ")
    return (cut[:space] if space > limit * 0.6 else cut).rstrip(" ,;:-") + "…"


def e(value) -> str:
    return html.escape(str(value if value is not None else ""))


def kv_write(base: str, key: str, token: str, payload: dict) -> bool:
    request = urllib.request.Request(
        f"{base}/values/{urllib.parse.quote(key, safe='')}",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="PUT",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
        return True
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"could not write {key}: {exc}", file=sys.stderr)
        return False


def kv_base(token: str) -> str | None:
    namespace, account = namespace_id(), account_id(token)
    if not namespace or not account:
        return None
    return f"{KV_API}/accounts/{account}/storage/kv/namespaces/{namespace}"


def subscribers(base: str, token: str) -> list[dict]:
    out, cursor = [], ""
    while True:
        url = f"{base}/keys?prefix=news:&limit=1000" + (f"&cursor={cursor}" if cursor else "")
        try:
            listing = api(url, token)
        except (urllib.error.URLError, TimeoutError) as exc:
            print(f"could not list subscribers: {exc}", file=sys.stderr)
            return out
        for item in listing.get("result", []):
            key = item["name"]
            try:
                record = api(f"{base}/values/{urllib.parse.quote(key, safe='')}", token)
            except Exception:  # noqa: BLE001 — one unreadable record must not stop the run
                continue
            if isinstance(record, dict) and record.get("email"):
                record["_key"] = key.split("news:", 1)[-1]
                out.append(record)
        cursor = (listing.get("result_info") or {}).get("cursor") or ""
        if not cursor:
            break
    return out


def merge(pending: dict, report: dict) -> dict:
    """Fold this release's changes into what is waiting to be told.

    Keyed by trial, so a trial that moved twice in a fortnight is one line and carries its latest
    state rather than appearing as two half-stories.
    """
    added = {a["nct_id"]: a for a in report.get("added", []) if a.get("nct_id")}
    changed = {c["nct_id"]: c for c in report.get("changed", [])
               if c.get("nct_id") and c.get("origin") in ("registry_event", "mixed")}

    out = {
        "since": pending.get("since") or report.get("previous_dataset_version") or "",
        "releases": sorted({*(pending.get("releases") or []), report.get("dataset_version") or ""}),
        "added": {**(pending.get("added") or {}), **added},
        "changed": {**(pending.get("changed") or {}), **changed},
        "last_sent_at": pending.get("last_sent_at"),
    }
    # A trial that has just entered does not also need a "changed" line.
    out["changed"] = {k: v for k, v in out["changed"].items() if k not in out["added"]}
    out["releases"] = [r for r in out["releases"] if r]
    return out


def due(pending: dict, force: bool) -> bool:
    if force:
        return True
    last = pending.get("last_sent_at")
    if not last:
        return True
    try:
        when = datetime.fromisoformat(last.replace("Z", "+00:00"))
    except ValueError:
        return True
    return datetime.now(timezone.utc) - when >= timedelta(days=DAYS_BETWEEN)


def render(pending: dict, summary: dict, stop_url: str) -> tuple[str, str]:
    added = list(pending.get("added", {}).values())
    changed = list(pending.get("changed", {}).values())
    version = (pending.get("releases") or ["this release"])[-1]

    def rows(items: list[dict], kind: str) -> str:
        out = ""
        for item in items[:MAX_ROWS]:
            nct = e(item.get("nct_id"))
            title = e(shorten(item.get("brief_title"), 130))
            sponsor = e(item.get("sponsor_group") or "")
            if kind == "added":
                detail = e((item.get("why_stopped") or item.get("failure_primary_reason") or "")[:180])
            else:
                detail = "; ".join(
                    f"{e(field)}: {e(str(move.get('from'))[:60])} → {e(str(move.get('to'))[:60])}"
                    for field, move in (item.get("changes") or {}).items())
            out += (f"<tr><td style='padding:8px 10px;border-bottom:1px solid #eee;vertical-align:top;width:132px'>"
                    f"<a href='https://clinicaltrials.gov/study/{nct}' style='color:#4f46e5;text-decoration:none'>{nct}</a>"
                    f"<div style='color:#8a8f98;font-size:11px;margin-top:2px'>{sponsor}</div></td>"
                    f"<td style='padding:8px 10px;border-bottom:1px solid #eee;font-size:13px'>{title}"
                    f"<div style='color:#555;margin-top:3px'>{detail}</div></td></tr>")
        return out

    def block(title: str, blurb: str, items: list[dict], kind: str) -> str:
        if not items:
            return ""
        more = (f"<p style='color:#8a8f98;font-size:12px'>…and {len(items) - MAX_ROWS} more, "
                f"on the site.</p>" if len(items) > MAX_ROWS else "")
        return (f"<h2 style='font-size:15px;margin:26px 0 4px'>{e(title)} "
                f"<span style='color:#8a8f98;font-weight:400'>{len(items)}</span></h2>"
                f"<p style='color:#666;font-size:12.5px;margin:0 0 8px'>{e(blurb)}</p>"
                f"<table style='width:100%;border-collapse:collapse'>{rows(items, kind)}</table>{more}")

    def plural(count: int, one: str, many: str) -> str:
        return f"{count} {one if count == 1 else many}"

    subject = (f"{plural(len(added), 'new stopped trial', 'new stopped trials')}, "
               f"{plural(len(changed), 'record changed', 'records changed')} — {version}"
               if added or changed else f"Nothing moved this fortnight — {version}")

    body = f"""<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#14161a;max-width:660px">
<p style="font-size:15px;line-height:1.55">Release {e(version)}. The dataset is rebuilt from ClinicalTrials.gov every
week and each release is diffed against the last; this is everything that moved since the previous mail.</p>
{block("Trials that entered the dataset", "Newly registered stops, with the reason the sponsor recorded.", added, "added")}
{block("Records a sponsor changed", "A status, a stop reason or a completion date edited after the fact. Changes caused by our own classifier are deliberately not in this list.", changed, "changed")}
{"" if (added or changed) else "<p style='font-size:14px'>No sponsor added or edited a stopped trial in this window. That happens, and padding it out would waste your time.</p>"}
<p style="font-size:13px;line-height:1.6;color:#555;border-top:1px solid #e4e3de;margin-top:26px;padding-top:14px">
The dataset now holds {e(summary.get("trial_count"))} stopped trials across {e(summary.get("brief_count"))} mechanism
classes. <a href="{SITE}/briefs" style="color:#4f46e5">Read the briefs</a> ·
<a href="{SITE}/asset-check" style="color:#4f46e5">Check a molecule</a></p>
<p style="font-size:12px;color:#8a8f98">
<a href="{stop_url}" style="color:#8a8f98">Unsubscribe</a> · Clinical Trial Failures</p></div>"""
    return subject, body


def recent_stops(limit: int) -> list[dict]:
    """The most recently updated stopped trials in the current release."""
    if not SIGNALS.exists():
        return []
    rows = []
    with SIGNALS.open(encoding="utf-8") as fh:
        for line in fh:
            try:
                r = json.loads(line)
            except ValueError:
                continue
            if not r.get("why_stopped"):
                continue
            rows.append({
                "nct_id": r.get("nct_id"),
                "title": shorten(r.get("brief_title"), 140),
                "sponsor": r.get("sponsor_group") or r.get("lead_sponsor_raw") or "",
                "detail": (r.get("why_stopped") or "")[:200],
                "updated": r.get("last_update_post_date") or "",
            })
    rows.sort(key=lambda r: r["updated"], reverse=True)
    return rows[:limit]


def write_preview(pending: dict, summary: dict) -> None:
    """What the next mail carries, for the signup page to show.

    A signup form for a mail nobody has seen asks for an address and offers a promise. This is
    the same content the mail is rendered from, written every run, so the page shows the thing
    itself rather than describing it.
    """
    def row(item: dict, kind: str) -> dict:
        return {
            "nct_id": item.get("nct_id"),
            "title": shorten(item.get("brief_title"), 140),
            "sponsor": item.get("sponsor_group") or "",
            "detail": ((item.get("why_stopped") or item.get("failure_primary_reason") or "")[:200]
                       if kind == "added"
                       else "; ".join(f"{field}: {str(move.get('from'))[:40]} → {str(move.get('to'))[:40]}"
                                      for field, move in (item.get("changes") or {}).items())[:200]),
        }

    added = list(pending.get("added", {}).values())
    changed = list(pending.get("changed", {}).values())
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    # A fortnight where nothing moved is a real answer in a mail somebody already subscribed to.
    # On the signup page it is an empty room. So the page always has the most recently updated
    # stopped trials to show instead — the same kind of row, marked as what it is.
    recent = recent_stops(PREVIEW_ROWS) if not (added or changed) else []
    PREVIEW.write_text(json.dumps({
        "schema_version": 1,
        "release": (pending.get("releases") or [summary.get("dataset_version") or ""])[-1],
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "last_sent_at": pending.get("last_sent_at") or "",
        "counts": {"added": len(added), "changed": len(changed)},
        "added": [row(i, "added") for i in added[:PREVIEW_ROWS]],
        "changed": [row(i, "changed") for i in changed[:PREVIEW_ROWS]],
        "recent": recent,
    }, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {PREVIEW.relative_to(ROOT)} ({len(added)} added, {len(changed)} changed)")


def send(to: str, subject: str, body: str, key: str) -> bool:
    payload = {
        "sender": {"email": os.environ.get("MAIL_FROM") or "contact@clinicaltrialfailures.com",
                   "name": os.environ.get("MAIL_FROM_NAME") or "Clinical Trial Failures"},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": body,
    }
    request = urllib.request.Request(BREVO_API, data=json.dumps(payload).encode(),
                                     headers={"api-key": key, "content-type": "application/json",
                                              "accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
        return True
    except urllib.error.HTTPError as exc:
        print(f"  send to {to} failed: {exc.code} {exc.read()[:200]!r}", file=sys.stderr)
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"  send to {to} failed: {exc}", file=sys.stderr)
    return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="never send, always write, never clear what is pending")
    ap.add_argument("--force", action="store_true", help="send now, whatever the date of the last one")
    args = ap.parse_args()

    if not REPORT.exists():
        print("No change report; nothing to accumulate.")
        return 0
    report = json.loads(REPORT.read_text())
    summary = json.loads(SUMMARY.read_text()) if SUMMARY.exists() else {}

    token = os.environ.get("CF_API_TOKEN") or ""
    base = kv_base(token) if token else None
    if not base:
        print("no Cloudflare access; cannot read the list or what is pending", file=sys.stderr)
        return 0

    try:
        stored = api(f"{base}/values/{urllib.parse.quote(PENDING_KEY, safe='')}", token)
        pending = stored if isinstance(stored, dict) else {}
    except Exception:  # noqa: BLE001 — an absent key is the normal first run
        pending = {}

    if report.get("has_previous_release"):
        pending = merge(pending, report)

    people = subscribers(base, token)
    added, changed = len(pending.get("added", {})), len(pending.get("changed", {}))
    print(f"{added} added and {changed} changed waiting, {len(people)} subscriber(s)")
    # Written on every run, whether or not a mail is due: the page shows what is waiting.
    write_preview(pending, summary)

    if not due(pending, args.force):
        last = pending.get("last_sent_at")
        print(f"last mail went out {last}; nothing due for {DAYS_BETWEEN} days. Holding.")
        kv_write(base, PENDING_KEY, token, pending)
        return 0

    key = os.environ.get("BREVO_API_KEY") or ""
    sending = bool(key) and bool(people) and not args.dry_run

    sent = 0
    if not sending:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        why = "--dry-run" if args.dry_run else ("no BREVO_API_KEY" if not key else "no subscribers")
        subject, body = render(pending, summary, f"{SITE}/newsletter/stop?k=EXAMPLE")
        (OUT_DIR / "next.html").write_text(f"<!-- Subject: {subject} -->\n{body}", encoding="utf-8")
        print(f"not sending ({why}); wrote {(OUT_DIR / 'next.html').relative_to(ROOT)} for review")
    else:
        for person in people:
            subject, body = render(pending, summary, f"{SITE}/newsletter/stop?k={person['_key']}")
            if send(person["email"], subject, body, key):
                sent += 1
                time.sleep(0.2)   # stay well inside any per-second limit
        print(f"sent {sent} mail(s)")

    if sending and sent and not args.dry_run:
        # Cleared only once it has actually gone somewhere, so a failed send is told next time
        # rather than lost.
        kv_write(base, PENDING_KEY, token,
                 {"since": (pending.get("releases") or [""])[-1], "releases": [], "added": {}, "changed": {},
                  "last_sent_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")})
    else:
        kv_write(base, PENDING_KEY, token, pending)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
