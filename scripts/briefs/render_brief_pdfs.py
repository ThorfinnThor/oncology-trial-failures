#!/usr/bin/env python3
"""Render every discontinuation-rate brief to PDF.

Briefs are built as HTML, but a brief is something a licensee forwards, so the release
ships PDFs too. Chromium is used because the layout relies on CSS grid and @page rules.

Requires playwright with chromium installed:
    pip install playwright && playwright install --with-deps chromium
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRIEFS = ROOT / "product/briefs"


async def render(paths: list[Path], workers: int) -> list[Path]:
    from playwright.async_api import async_playwright

    written: list[Path] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        sem = asyncio.Semaphore(max(1, workers))

        async def one(src: Path) -> None:
            out = src.with_suffix(".pdf")
            async with sem:
                page = await browser.new_page()
                try:
                    await page.goto(src.as_uri(), wait_until="load")
                    await page.pdf(path=str(out), format="A4", print_background=True)
                    written.append(out)
                finally:
                    await page.close()

        await asyncio.gather(*(one(src) for src in paths))
        await browser.close()
    return written


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    paths = sorted(BRIEFS.glob("brief_*.html"))
    if not paths:
        print("No briefs to render.")
        return 0
    try:
        written = asyncio.run(render(paths, args.workers))
    except ImportError:
        print("playwright is not installed; skipping PDF rendering.", file=sys.stderr)
        return 0
    empty = [p.name for p in written if p.stat().st_size < 10_000]
    if empty:
        print(f"Rendered PDFs look empty: {', '.join(empty[:5])}", file=sys.stderr)
        return 1
    print(f"Rendered {len(written)} brief PDFs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
