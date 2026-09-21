#!/usr/bin/env python3
"""Tell people what changed in the trials they are watching.

The weekly release already produces a change report that separates a registry event — a
sponsor changing a status, a stop reason, a completion date — from our own classifier or
mappings moving. Only the first kind is news about a trial, and only that kind is worth a
mail. A subscriber who is sent an ontology update as though it were competitive intelligence
learns to ignore the next one.

Nobody is in the loop. This runs at the end of the weekly workflow, reads the watchlists
straight from KV, matches them against the report and sends. With no API key it writes the
mails to a file instead and says so, so the content can be read and judged before anyone
signs up to a sending service.

  python scripts/signals/send_watchlists.py            # send, or write to disk if unconfigured
  python scripts/signals/send_watchlists.py --dry-run  # never send, always write

Environment:
  CF_API_TOKEN                                       read the watchlists (KV read is enough).
                                                     The namespace comes from web/wrangler.jsonc
                                                     and the account from the token, so neither
                                                     needs a secret of its own; CF_KV_NAMESPACE_ID
                                                     and CF_ACCOUNT_ID override them if set.
  BREVO_API_KEY                                      send the mail
  MAIL_FROM, MAIL_FROM_NAME                          the sender
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
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "product/oncology_failure_signals_change_report_v1.json"
OUT_DIR = ROOT / "product/watchlist_mail"
SITE = "https://clinicaltrialfailures.com"
KV_API = "https://api.cloudflare.com/client/v4"
BREVO_API = "https://api.brevo.com/v3/smtp/email"


def e(x) -> str:
    return html.escape(str(x if x is not None else ""))


def norm(term: str) -> str:
    """Compare on letters and digits only: 'PD-(L)1' and 'pd l1' are the same watch term."""
    return re.sub(r"[^a-z0-9]+", "", (term or "").lower())


def api(url: str, token: str) -> dict:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=30) as fh:
        return json.load(fh)


def namespace_id() -> str:
    """The KV namespace the site writes to, from the deployment config that already names it.

    Asking someone to copy an id into a repository secret that is sitting in a file in the same
    repository is a step that can only go wrong. The environment still wins if it is set.
    """
    from_env = os.environ.get("CF_KV_NAMESPACE_ID")
    if from_env:
        return from_env
    config = ROOT / "web/wrangler.jsonc"
    if not config.exists():
        return ""
    # A JSONC file: strip // comments, which are the only ones this config uses.
    text = re.sub(r"^\s*//.*$", "", config.read_text(), flags=re.M)
    try:
        bindings = json.loads(text).get("kv_namespaces") or []
    except json.JSONDecodeError:
        return ""
    for binding in bindings:
        if binding.get("binding") == "LEADS" and binding.get("id"):
            return str(binding["id"])
    return ""


def account_id(token: str) -> str:
    """The account the token belongs to. One token is the whole configuration."""
    from_env = os.environ.get("CF_ACCOUNT_ID")
    if from_env:
        return from_env
    try:
        accounts = api(f"{KV_API}/accounts?per_page=50", token).get("result") or []
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"could not resolve the Cloudflare account: {exc}", file=sys.stderr)
        return ""
    if len(accounts) != 1:
        print(f"{len(accounts)} accounts on this token; set CF_ACCOUNT_ID to pick one", file=sys.stderr)
        return ""
    return str(accounts[0].get("id") or "")


def watchlists() -> list[dict]:
    """Every live watchlist, from the KV namespace the site writes to."""
    token = os.environ.get("CF_API_TOKEN") or ""
    if not token:
        print("no CF_API_TOKEN; no watchlists to read", file=sys.stderr)
        return []
    namespace, account = namespace_id(), account_id(token)
    if not namespace or not account:
        print("no KV namespace or account to read watchlists from", file=sys.stderr)
        return []
    base = f"{KV_API}/accounts/{account}/storage/kv/namespaces/{namespace}"
    out, cursor = [], ""
    while True:
        url = f"{base}/keys?prefix=watch:&limit=1000" + (f"&cursor={cursor}" if cursor else "")
        try:
            listing = api(url, token)
        except (urllib.error.URLError, TimeoutError) as exc:
            print(f"could not list watchlists: {exc}", file=sys.stderr)
            return out
        for item in listing.get("result", []):
            key = item["name"]
            try:
                raw = api(f"{base}/values/{urllib.parse.quote(key, safe='')}", token)
            except Exception:  # noqa: BLE001 — one unreadable record must not stop the run
                continue
            record = raw if isinstance(raw, dict) else {}
            if record.get("email") and record.get("terms"):
                record["_key"] = key.split("watch:", 1)[-1]
                out.append(record)
        cursor = (listing.get("result_info") or {}).get("cursor") or ""
        if not cursor:
            break
    return out


def registry_events(report: dict) -> list[dict]:
    """Only what a sponsor did. Our own reclassifications are not news about a trial."""
    changed = [c for c in report.get("changed", []) if c.get("origin") in ("registry_event", "mixed")]
    added = report.get("added", [])
    return [{"kind": "added", **a} for a in added] + [{"kind": "changed", **c} for c in changed]


def haystack(event: dict) -> str:
    """Everything about an event a watch term could match."""
    parts = [event.get("nct_id"), event.get("brief_title"), event.get("sponsor_group"),
             event.get("focus_assets"), event.get("focus_target_genes"), event.get("focus_mechanisms")]
    for field, move in (event.get("changes") or {}).items():
        parts += [field, str(move.get("from")), str(move.get("to"))]
    return norm(" ".join(str(p) for p in parts if p))


def match(events: list[dict], terms: list[str]) -> list[tuple[str, dict]]:
    wanted = [(t, norm(t)) for t in terms if norm(t)]
    hits = []
    for event in events:
        hay = haystack(event)
        for original, needle in wanted:
            if needle and needle in hay:
                hits.append((original, event))
                break
    return hits


def render(record: dict, hits: list[tuple[str, dict]], version: str) -> tuple[str, str]:
    stop = f"{SITE}/watchlist/stop?k={record['_key']}"
    rows = ""
    for term, event in hits[:40]:
        nct = e(event.get("nct_id"))
        line = ("entered the dataset" if event["kind"] == "added"
                else "; ".join(f"{e(f)}: {e(str(m.get('from'))[:90])} → {e(str(m.get('to'))[:90])}"
                               for f, m in (event.get("changes") or {}).items()))
        rows += (f"<tr><td style='padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top'>"
                 f"<a href='https://clinicaltrials.gov/study/{nct}' style='color:#4f46e5'>{nct}</a><br>"
                 f"<span style='color:#666;font-size:12px'>matched <b>{e(term)}</b></span></td>"
                 f"<td style='padding:7px 10px;border-bottom:1px solid #eee;font-size:13px'>"
                 f"{e(event.get('sponsor_group') or '')}<br><span style='color:#444'>{line}</span></td></tr>")

    subject = (f"{len(hits)} registry change{'s' if len(hits) != 1 else ''} in your watchlist "
               f"— {version}")
    body = f"""<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#14161a;max-width:640px">
<p style="font-size:15px;line-height:1.5">{len(hits)} trial{'s' if len(hits) != 1 else ''} you are watching changed in
release {e(version)}. These are sponsor changes to the registry — a status, a stop reason, a completion date.
Changes caused by our own classifier or mappings are deliberately left out of this mail.</p>
<table style="width:100%;border-collapse:collapse;font-size:13px">{rows}</table>
{f'<p style="color:#666;font-size:13px">…and {len(hits) - 40} more.</p>' if len(hits) > 40 else ''}
<p style="font-size:13px;color:#555;line-height:1.5">Watching: {e(', '.join(record.get('terms', [])))}</p>
<p style="font-size:12px;color:#888;border-top:1px solid #e4e3de;padding-top:10px">
<a href="{stop}" style="color:#888">Stop these emails</a> · <a href="{SITE}/briefs" style="color:#888">Briefs</a> ·
Clinical Trial Failures</p></div>"""
    return subject, body


def send(to: str, subject: str, body: str, key: str) -> bool:
    payload = {
        "sender": {"email": os.environ.get("MAIL_FROM") or "contact@clinicaltrialfailures.com",
                   "name": os.environ.get("MAIL_FROM_NAME") or "Clinical Trial Failures"},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": body,
    }
    req = urllib.request.Request(BREVO_API, data=json.dumps(payload).encode(),
                                 headers={"api-key": key, "content-type": "application/json",
                                          "accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as fh:
            fh.read()
        return True
    except urllib.error.HTTPError as exc:
        print(f"  send to {to} failed: {exc.code} {exc.read()[:200]!r}", file=sys.stderr)
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"  send to {to} failed: {exc}", file=sys.stderr)
    return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="never send; always write the mails to disk")
    args = ap.parse_args()

    if not REPORT.exists():
        print("No change report; nothing to send.")
        return 0
    report = json.loads(REPORT.read_text())
    if not report.get("has_previous_release"):
        print("No previous release to compare against; nothing to send.")
        return 0

    events = registry_events(report)
    version = report.get("dataset_version") or "this release"
    lists = watchlists()
    print(f"{len(events)} registry events, {len(lists)} watchlists")
    if not events or not lists:
        return 0

    key = os.environ.get("BREVO_API_KEY") or ""
    sending = bool(key) and not args.dry_run
    if not sending:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        print("not sending" + (" (--dry-run)" if args.dry_run else " (no BREVO_API_KEY)")
              + f"; writing to {OUT_DIR.relative_to(ROOT)}")

    sent = written = 0
    for record in lists:
        hits = match(events, record.get("terms", []))
        if not hits:
            continue
        subject, body = render(record, hits, version)
        if sending:
            if send(record["email"], subject, body, key):
                sent += 1
                time.sleep(0.2)   # stay well inside any per-second limit
        else:
            safe = re.sub(r"[^a-z0-9]+", "-", record["email"].lower()).strip("-")
            (OUT_DIR / f"{safe}.html").write_text(f"<!-- To: {record['email']}\n     Subject: {subject} -->\n{body}",
                                                  encoding="utf-8")
            written += 1

    if sending:
        print(f"sent {sent} mail(s)")
    else:
        print(f"wrote {written} mail(s) for review")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
