#!/usr/bin/env python3
"""Put each report's full trial list where the paid export route can read it: Workers KV.

A report lists every stop and every missed endpoint, but a cohort of 5,000 trials cannot be a
table in a document. The buyer gets the whole cohort as CSV instead — every number in the report
can be recounted from it (the external review of the PD-(L)1 report asked for exactly this).

Why KV and not the site bundle: the exports are ~5 MB, which would push the Worker past its size
limit, and they must not sit in the public repository or under a guessable public URL. The file
web/data/private/evidence_exports.json is written by build_evidence_catalog.py and git-ignored;
this uploads one CSV per report as `export:<slug>`. CF_API_TOKEN needs Workers KV read and write —
the same token the newsletter uses.
"""
from __future__ import annotations

import csv
import io
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.newsletter import kv_base  # noqa: E402

EXPORTS = ROOT / "web/data/private/evidence_exports.json"
YEAR_SECONDS = 60 * 60 * 24 * 365


def to_csv(columns: list[str], rows: list[list]) -> str:
    buffer = io.StringIO()
    # The byte-order mark is what makes Excel read the file as UTF-8 ("Bristol-Myers Squibb", "β").
    buffer.write("﻿")
    writer = csv.writer(buffer, lineterminator="\r\n")
    writer.writerow(columns)
    for row in rows:
        writer.writerow(["" if v is None else v for v in row])
    return buffer.getvalue()


def put_text(base: str, key: str, token: str, text: str) -> bool:
    request = urllib.request.Request(
        f"{base}/values/{urllib.parse.quote(key, safe='')}?expiration_ttl={YEAR_SECONDS}",
        data=text.encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "text/plain; charset=utf-8"},
        method="PUT",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            response.read()
        return True
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"could not write {key}: {exc}", file=sys.stderr)
        return False


def main() -> int:
    if not EXPORTS.exists():
        print("no exports built; nothing to upload")
        return 0
    data = json.loads(EXPORTS.read_text())["packages"]
    token = os.environ.get("CF_API_TOKEN", "")
    if not token:
        print("CF_API_TOKEN not set; exports not uploaded (the access page says the export is being prepared)")
        return 0
    base = kv_base(token)
    if not base:
        print("could not resolve the KV namespace or account from the token", file=sys.stderr)
        return 1
    failed = [slug for slug, export in data.items()
              if not put_text(base, f"export:{slug}", token, to_csv(export["columns"], export["rows"]))]
    print(f"uploaded {len(data) - len(failed)} of {len(data)} exports" + (f"; failed: {failed}" if failed else ""))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
