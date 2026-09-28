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
MAX_ROWS = 15              # a mail is a summary; the site is the list. Also Gmail clips a mail
                           # over 102 KB, and 2 × 15 rows stays well under it.


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


# ---------------------------------------------------------------------------
# The mail itself.
#
# Written for mail clients, not browsers: one 600px table, inline styles, bgcolor attributes as
# well as CSS (Outlook reads the first, Gmail the second), no images so nothing is blocked and
# nothing is fetched on open, and a colour scheme pinned to light so Apple Mail does not invert a
# dark header into a white one. Every trial title links to its page on the site, where the stop
# reason, the classification and the posted results are; the registry link is one click further.
# ---------------------------------------------------------------------------

# No quotes inside: every style attribute below is single-quoted, and a quoted family name would end it.
FONT = "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif"
MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"
INK, COPY, MUTED, LINE, PAPER, ACCENT = "#0f172a", "#334155", "#64748b", "#e2e8f0", "#f1f5f9", "#4f46e5"

REASON_LABEL = {
    "EFFICACY_FUTILITY": ("Efficacy / futility", "#4338ca", "#eef2ff"),
    "SAFETY": ("Safety", "#be123c", "#fff1f2"),
    "BIOLOGICAL_UNSPECIFIED": ("Biological, unspecified", "#0369a1", "#f0f9ff"),
}
FIELD_LABEL = {"overall_status": "Status", "why_stopped": "Stop reason",
               "primary_completion_date": "Primary completion", "sponsor_group": "Sponsor"}
NOT_A_DRUG = {"placebo", "premedication", "standard of care", "best supportive care"}


def when(iso: str | None, with_year: bool = True) -> str:
    text = str(iso or "")
    try:
        if len(text) == 7:  # the registry's "2026-03": a month, not a day
            return datetime.fromisoformat(text + "-01").strftime("%b %Y")
        d = datetime.fromisoformat(text[:10])
    except ValueError:
        return text
    return d.strftime("%-d %b %Y" if with_year else "%-d %b")


def phase(value) -> str:
    raw = value if isinstance(value, list) else str(value or "").replace(",", " ").split()
    nums = sorted({p.replace("EARLY_PHASE1", "PHASE1").replace("PHASE", "") for p in raw if "PHASE" in str(p)})
    return f"Phase {'/'.join(nums)}" if nums else ""


def drugs(value) -> str:
    names = []
    for name in value or []:
        if str(name).lower() in NOT_A_DRUG:
            continue
        # "tak-243" is a research code, "vibostolimab" a name: codes read in capitals.
        pretty = str(name).upper() if any(ch.isdigit() for ch in str(name)) else str(name)[:1].upper() + str(name)[1:]
        if pretty not in names:
            names.append(pretty)
    return ", ".join(names[:3])


def status_word(value) -> str:
    return str(value or "").replace("_", " ").capitalize() if value else "—"


def move_text(field: str, move: dict) -> tuple[str, str]:
    """A tracked field's change in words: (label, "from → to")."""
    before, after = move.get("from"), move.get("to")
    if field == "overall_status":
        return "Status", f"{status_word(before)} → {status_word(after)}"
    if field == "primary_completion_date":
        return "Primary completion", f"{when(before) or '—'} → {when(after) or '—'}"
    if field == "why_stopped":
        if not before:
            return "Stop reason added", f"“{shorten(after, 220)}”"
        return "Stop reason", f"“{shorten(before, 90)}” → “{shorten(after, 160)}”"
    label = FIELD_LABEL.get(field, field.replace("_", " ").capitalize())
    return label, f"{shorten(before, 60) or '—'} → {shorten(after, 60) or '—'}"


def plural(count: int, one: str, many: str) -> str:
    return f"{count} {one if count == 1 else many}"


def subject_of(added: list, changed: list, version: str) -> str:
    if not (added or changed):
        return f"Nothing moved this fortnight — {when(version)}"
    return (f"{plural(len(added), 'new stopped trial', 'new stopped trials')}, "
            f"{plural(len(changed), 'record changed', 'records changed')} — {when(version)}")


def order(items: list[dict]) -> list[dict]:
    """Biological stops first, safety before efficacy, later phases before earlier ones."""
    rank = {"SAFETY": 0, "EFFICACY_FUTILITY": 1, "BIOLOGICAL_UNSPECIFIED": 2}
    return sorted(items, key=lambda i: (rank.get(i.get("failure_primary_reason"), 3),
                                        -int((phase(i.get("phases")) or "Phase 0")[-1]),
                                        i.get("nct_id") or ""))


def render(pending: dict, summary: dict, stop_url: str) -> tuple[str, str]:
    added = order(list(pending.get("added", {}).values()))
    changed = list(pending.get("changed", {}).values())
    version = (pending.get("releases") or [""])[-1]
    since = pending.get("since") or ""
    subject = subject_of(added, changed, version)

    efficacy = sum(1 for a in added if a.get("failure_primary_reason") == "EFFICACY_FUTILITY")
    safety = sum(1 for a in added if a.get("failure_primary_reason") == "SAFETY")
    lead = added[0] if added else None
    preheader = (f"{plural(efficacy, 'stop', 'stops')} for efficacy, {plural(safety, 'stop', 'stops')} for safety"
                 + (f" — first up: {shorten(lead.get('brief_title'), 70)}" if lead else "")
                 if added else "No sponsor added or edited a stopped trial in this window.")
    window = (f"{when(since, with_year=False)} – {when(version)}" if since and version else when(version))

    def a(href: str, text: str, color: str = ACCENT, weight: int = 600) -> str:
        return f"<a href='{e(href)}' style='color:{color};text-decoration:none;font-weight:{weight}'>{text}</a>"

    def chip(reason: str | None) -> str:
        label, fg, bg = REASON_LABEL.get(reason or "", (str(reason or "Other").replace("_", " ").capitalize(), COPY, PAPER))
        return (f"<span style='display:inline-block;padding:3px 8px;border-radius:4px;background:{bg};color:{fg};"
                f"font-family:{FONT};font-size:11px;font-weight:700;letter-spacing:.02em'>{e(label)}</span>")

    def stat(value: int, label: str) -> str:
        return (f"<td width='33%' valign='top' style='padding:16px 14px;border-right:1px solid {LINE}'>"
                f"<div style='font-family:{MONO};font-size:26px;line-height:1;font-weight:700;color:{INK}'>{value}</div>"
                f"<div style='margin-top:6px;font-family:{FONT};font-size:12px;line-height:1.35;color:{MUTED}'>{e(label)}</div></td>")

    def heading(title: str, count: int, blurb: str) -> str:
        return (f"<tr><td class='px' style='padding:30px 32px 6px'>"
                f"<div style='font-family:{FONT};font-size:17px;font-weight:700;color:{INK}'>{e(title)} "
                f"<span style='font-family:{MONO};font-weight:600;color:{MUTED}'>{count}</span></div>"
                f"<div style='margin-top:4px;font-family:{FONT};font-size:13px;line-height:1.5;color:{MUTED}'>{e(blurb)}</div>"
                f"</td></tr>")

    def added_row(item: dict) -> str:
        nct = item.get("nct_id") or ""
        meta = " · ".join(x for x in [phase(item.get("phases")), drugs(item.get("focus_assets"))] if x)
        reason = shorten(item.get("why_stopped") or "", 240)
        return (f"<tr><td style='padding:14px 32px;border-top:1px solid {LINE}'>"
                f"<div>{chip(item.get('failure_primary_reason'))}"
                + (f"<span style='font-family:{FONT};font-size:12px;color:{MUTED};padding-left:8px'>{e(meta)}</span>" if meta else "")
                + f"</div>"
                f"<div style='margin-top:8px;font-family:{FONT};font-size:15px;line-height:1.4'>"
                f"{a(f'{SITE}/trial/{nct}', e(shorten(item.get('brief_title'), 150)), INK, 650)}</div>"
                + (f"<div style='margin-top:8px;padding:2px 0 2px 12px;border-left:3px solid {LINE};font-family:{FONT};"
                   f"font-size:13.5px;line-height:1.5;color:{COPY}'>“{e(reason)}”</div>" if reason else "")
                + f"<div style='margin-top:8px;font-family:{FONT};font-size:12px;color:{MUTED}'>"
                f"<span style='font-family:{MONO}'>{e(nct)}</span> · {e(item.get('sponsor_group') or '')} · "
                f"{a(f'https://clinicaltrials.gov/study/{nct}', 'Registry record', MUTED, 500)}</div>"
                f"</td></tr>")

    def changed_row(item: dict) -> str:
        nct = item.get("nct_id") or ""
        moves = "".join(
            f"<tr><td valign='top' style='padding:3px 10px 3px 0;font-family:{FONT};font-size:12px;font-weight:700;"
            f"color:{MUTED};white-space:nowrap'>{e(label)}</td>"
            f"<td valign='top' style='padding:3px 0;font-family:{FONT};font-size:13.5px;line-height:1.45;color:{COPY}'>{e(text)}</td></tr>"
            for label, text in (move_text(f, m) for f, m in (item.get("changes") or {}).items()))
        return (f"<tr><td style='padding:14px 32px;border-top:1px solid {LINE}'>"
                f"<div style='font-family:{FONT};font-size:15px;line-height:1.4'>"
                f"{a(f'{SITE}/trial/{nct}', e(shorten(item.get('brief_title'), 150)), INK, 650)}</div>"
                f"<table role='presentation' cellspacing='0' cellpadding='0' border='0' style='margin-top:8px'>{moves}</table>"
                f"<div style='margin-top:8px;font-family:{FONT};font-size:12px;color:{MUTED}'>"
                f"<span style='font-family:{MONO}'>{e(nct)}</span> · {e(item.get('sponsor_group') or '')} · "
                f"{a(f'https://clinicaltrials.gov/study/{nct}', 'Registry record', MUTED, 500)}</div>"
                f"</td></tr>")

    def more(items: list) -> str:
        if len(items) <= MAX_ROWS:
            return ""
        return (f"<tr><td style='padding:12px 32px;border-top:1px solid {LINE};font-family:{FONT};font-size:13px;color:{MUTED}'>"
                f"…and {len(items) - MAX_ROWS} more. {a(f'{SITE}/explore', 'See them all on the site')}</td></tr>")

    sections = ""
    if added:
        sections += heading("New stopped trials", len(added),
                            "Entered the dataset since the last issue, with the reason the sponsor recorded.")
        sections += "".join(added_row(i) for i in added[:MAX_ROWS]) + more(added)
    if changed:
        sections += heading("Records sponsors changed", len(changed),
                            "A status, a stop reason or a completion date edited after the fact. "
                            "Changes made by our own classifier are never listed here.")
        sections += "".join(changed_row(i) for i in changed[:MAX_ROWS]) + more(changed)
    if not (added or changed):
        sections += (f"<tr><td style='padding:28px 32px;font-family:{FONT};font-size:15px;line-height:1.6;color:{COPY}'>"
                     "No sponsor added or edited a stopped trial in this window. That happens, and padding the "
                     "issue out would waste your time. The next one follows in two weeks.</td></tr>")

    # Three zeros read like a broken mail; a quiet fortnight says so in words instead.
    stats = (f"<tr><td style='border-bottom:1px solid {LINE}'>"
             f"<table role='presentation' class='stats' width='100%' cellspacing='0' cellpadding='0' border='0'><tr>"
             f"{stat(len(added), 'new stopped trials')}{stat(efficacy, 'stopped for efficacy or futility')}"
             f"{stat(safety, 'stopped for safety').replace(f'border-right:1px solid {LINE}', '')}"
             f"</tr></table></td></tr>") if added else ""
    title = (f"{plural(len(added), 'trial', 'trials')} stopped, {plural(len(changed), 'record', 'records')} changed"
             if added or changed else "A quiet fortnight")
    button = (f"<table role='presentation' cellspacing='0' cellpadding='0' border='0'><tr>"
              f"<td bgcolor='{ACCENT}' style='border-radius:6px;background:{ACCENT}'>"
              f"<a href='{SITE}/asset-check' style='display:inline-block;padding:11px 20px;font-family:{FONT};font-size:14px;"
              f"font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px'>Check a molecule</a></td></tr></table>")

    body = f"""<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>{e(subject)}</title>
<style>
@media (max-width:620px) {{
  .px {{ padding-left:20px !important; padding-right:20px !important; }}
  .stats td {{ padding:14px 10px !important; }}
  .h1 {{ font-size:24px !important; }}
}}
</style></head>
<body style="margin:0;padding:0;background:{PAPER};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{PAPER}">{e(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="{PAPER}" style="background:{PAPER}">
<tr><td align="center" style="padding:24px 12px">
<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid {LINE};border-radius:10px;overflow:hidden">
<tr><td bgcolor="{INK}" class="px" style="background:{INK};padding:22px 32px 26px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
    <td style="font-family:{MONO};font-size:11px;font-weight:700;letter-spacing:.12em;color:#a5b4fc;text-transform:uppercase">Clinical Trial Failures</td>
    <td align="right" style="font-family:{FONT};font-size:12px;color:#94a3b8">Fortnightly · {e(when(version))}</td>
  </tr></table>
  <div class="h1" style="margin-top:18px;font-family:{FONT};font-size:28px;line-height:1.15;font-weight:800;color:#ffffff">{e(title)}</div>
  <div style="margin-top:8px;font-family:{FONT};font-size:14px;line-height:1.5;color:#cbd5e1">Stopped oncology trials, {e(window)}. Read from ClinicalTrials.gov and diffed release by release.</div>
</td></tr>
{stats}
{sections.replace("<td style='padding:14px 32px", "<td class='px' style='padding:14px 32px")}
<tr><td class="px" style="padding:26px 32px;border-top:1px solid {LINE};background:#f8fafc" bgcolor="#f8fafc">
  <div style="font-family:{FONT};font-size:15px;font-weight:700;color:{INK}">Is your molecule's target in here?</div>
  <div style="margin:6px 0 14px;font-family:{FONT};font-size:13.5px;line-height:1.55;color:{COPY}">Type a drug name and see every
  stopped or missed trial that shares its target, with the reason each one ended. Free, no account.</div>
  {button}
  <div style="margin-top:12px;font-family:{FONT};font-size:13px;color:{MUTED}">Or {a(f"{SITE}/briefs", "read the free mechanism briefs")}
  — {e(summary.get("brief_count") or "")} classes, {e(summary.get("trial_count") or "")} stopped oncology trials tracked.</div>
</td></tr>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px">
<tr><td class="px" style="padding:18px 32px 8px;font-family:{FONT};font-size:12px;line-height:1.6;color:{MUTED}">
You receive this because you confirmed a subscription at clinicaltrialfailures.com.
<a href="{e(stop_url)}" style="color:{MUTED};text-decoration:underline">Unsubscribe</a> with one click ·
<a href="{SITE}/privacy" style="color:{MUTED};text-decoration:underline">Privacy</a> ·
<a href="{SITE}/contact" style="color:{MUTED};text-decoration:underline">Contact</a><br>
Source: ClinicalTrials.gov (U.S. National Library of Medicine). Research signals, not medical or investment advice.
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>"""
    return subject, body


def render_text(pending: dict, summary: dict, stop_url: str) -> str:
    """The plain-text part. Some readers in regulated companies see nothing else, and mail without
    one scores worse with spam filters."""
    added = order(list(pending.get("added", {}).values()))
    changed = list(pending.get("changed", {}).values())
    version = (pending.get("releases") or [""])[-1]
    out = [subject_of(added, changed, version), "Clinical Trial Failures · fortnightly", ""]
    if added:
        out += [f"NEW STOPPED TRIALS ({len(added)})", ""]
        for i in added[:MAX_ROWS]:
            label = REASON_LABEL.get(i.get("failure_primary_reason") or "", (str(i.get("failure_primary_reason") or "Other"),))[0]
            meta = " · ".join(x for x in [label, phase(i.get("phases")), drugs(i.get("focus_assets"))] if x)
            out += [f"- {shorten(i.get('brief_title'), 150)}", f"  {meta}",
                    f"  “{shorten(i.get('why_stopped') or '', 240)}”",
                    f"  {i.get('nct_id')} · {i.get('sponsor_group') or ''} · {SITE}/trial/{i.get('nct_id')}", ""]
    if changed:
        out += [f"RECORDS SPONSORS CHANGED ({len(changed)})", ""]
        for i in changed[:MAX_ROWS]:
            out += [f"- {shorten(i.get('brief_title'), 150)}"]
            out += [f"  {label}: {text}" for label, text in (move_text(f, m) for f, m in (i.get("changes") or {}).items())]
            out += [f"  {i.get('nct_id')} · {i.get('sponsor_group') or ''} · {SITE}/trial/{i.get('nct_id')}", ""]
    if not (added or changed):
        out += ["No sponsor added or edited a stopped trial in this window.", ""]
    out += [f"Check a molecule: {SITE}/asset-check", f"Free mechanism briefs: {SITE}/briefs", "",
            f"Unsubscribe: {stop_url}", "Source: ClinicalTrials.gov. Research signals, not medical or investment advice."]
    return "\n".join(out)


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


def unsubscribe_headers(person_key: str) -> dict:
    """RFC 8058 one-click unsubscribe. Gmail and Yahoo expect it of anybody sending a list, show
    their own "Unsubscribe" next to the sender when it is there, and count a mail without it
    against the sender. The POST goes to the same route the unsubscribe page uses."""
    return {"List-Unsubscribe": f"<{SITE}/api/newsletter?stop={person_key}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}


def send(to: str, subject: str, body: str, key: str, text: str | None = None,
         headers: dict | None = None) -> bool:
    payload = {
        "sender": {"email": os.environ.get("MAIL_FROM") or "contact@clinicaltrialfailures.com",
                   "name": os.environ.get("MAIL_FROM_NAME") or "Clinical Trial Failures"},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": body,
        **({"textContent": text} if text else {}),
        **({"headers": headers} if headers else {}),
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
        (OUT_DIR / "next.txt").write_text(render_text(pending, summary, f"{SITE}/newsletter/stop?k=EXAMPLE"),
                                          encoding="utf-8")
        print(f"not sending ({why}); wrote {(OUT_DIR / 'next.html').relative_to(ROOT)} for review")
    else:
        for person in people:
            stop_url = f"{SITE}/newsletter/stop?k={person['_key']}"
            subject, body = render(pending, summary, stop_url)
            if send(person["email"], subject, body, key, text=render_text(pending, summary, stop_url),
                    headers=unsubscribe_headers(person["_key"])):
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
