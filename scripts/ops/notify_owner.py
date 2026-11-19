#!/usr/bin/env python3
"""Mail the owner (contact@clinicaltrialfailures.com) that something in the automation went wrong.

Used by the workflows when a run fails, when the weekly run did not happen, or when the live
site check fails. Sends through Brevo with the newsletter's key (BREVO_API_KEY); without it, or
with --dry-run, prints the mail instead, so a missing key never hides the problem in the log.

  python scripts/ops/notify_owner.py --subject "Weekly run failed" --body "..." [--dry-run]
  python scripts/ops/notify_owner.py --subject "..." --body-file summary.txt
"""
from __future__ import annotations

import argparse
import html
import json
import os
import sys
import urllib.error
import urllib.request

OWNER = "contact@clinicaltrialfailures.com"
BREVO_API = "https://api.brevo.com/v3/smtp/email"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", required=True)
    ap.add_argument("--body", default="")
    ap.add_argument("--body-file")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    body = args.body + (open(args.body_file, encoding="utf-8").read() if args.body_file else "")
    subject = f"[Clinical Trial Failures] {args.subject}"
    key = os.environ.get("BREVO_API_KEY", "")
    if args.dry_run or not key:
        print(("DRY RUN" if args.dry_run else "No BREVO_API_KEY; not sent") + f"\nTo: {OWNER}\nSubject: {subject}\n\n{body}")
        return 0
    payload = {"sender": {"email": OWNER, "name": "Clinical Trial Failures automation"},
               "to": [{"email": OWNER}], "subject": subject, "textContent": body,
               "htmlContent": "<pre style=\"font:14px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap\">"
                              + html.escape(body) + "</pre>"}
    request = urllib.request.Request(BREVO_API, data=json.dumps(payload).encode(),
                                     headers={"api-key": key, "content-type": "application/json",
                                              "accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
    except (urllib.error.URLError, TimeoutError) as exc:
        detail = exc.read()[:300] if isinstance(exc, urllib.error.HTTPError) else exc
        print(f"Alert mail could not be sent: {detail!r}\n\n{subject}\n{body}", file=sys.stderr)
        return 1
    print(f"Alert mailed to {OWNER}: {subject}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
