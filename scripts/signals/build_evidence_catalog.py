#!/usr/bin/env python3
"""Build the evidence package for every class that has a brief, in one process.

The brief is the teaser and the package is the product. They cover the same cohort, so
there is nothing to write twice: the brief shows the stopped trials and the headline, the
package adds the rest of the cohort — the trials still running, the terminations whose cause
cannot be read — plus the cohort rules, the time-to-event curve and the limits. For TGF-beta
+ PD-(L)1 that is 83 trials against the brief's 11.

Everything here runs in the weekly workflow. Nobody starts a command when an order arrives:
the packages exist before anyone asks, and delivery is a lookup.

The rendered packages go into a private bundle that only the API route imports, never into
the public asset directory. A file under web/public is a URL anyone can guess.

Writes product/evidence_packages/*.{html,json} and web/data/private/evidence_packages.json.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals import build_evidence_package as pkg  # noqa: E402

BRIEFS = ROOT / "product/briefs"
MANIFEST = BRIEFS / "manifest.json"
OUT_DIR = ROOT / "product/evidence_packages"
PRIVATE = ROOT / "web/data/private/evidence_packages.json"
# What the site may say about a package before anyone has paid for it: the cohort, how much is
# in it, and which brief it extends. Never the contents.
PUBLIC = ROOT / "web/data/evidence_catalogue.json"


class Args:
    """The generator takes an argparse namespace; a catalogue entry is the same shape."""

    def __init__(self, area, klass=None, with_class=None, phases="2,3", start="2015:2024"):
        self.area, self.klass, self.with_class = area, klass, with_class
        self.phases, self.start = phases, start
        self.genes = self.sponsor_group = self.modality = self.asset = self.out = None


def jobs_from_manifest() -> list[tuple[str, Args]]:
    """One job per published brief, read from the catalogue's manifest.

    The manifest is authoritative for the same reason the index uses it: a class that was
    renamed or split leaves its old brief on disk, and globbing would resurrect it.
    """
    if not MANIFEST.exists():
        raise SystemExit("No brief manifest. Run build_brief_catalog.py first.")
    manifest = json.loads(MANIFEST.read_text())
    out = []
    for area, stems in manifest.items():
        for stem in stems:
            facts = BRIEFS / f"{stem}.facts.json"
            if not facts.exists():
                print(f"  no facts for {stem}, skipping", file=sys.stderr)
                continue
            f = json.loads(facts.read_text())
            segment, window = f["segment"], f["window"]
            # "TGF-β + PD-(L)1" is a class plus its combination partner.
            if " + " in segment:
                klass, with_class = segment.split(" + ", 1)
            else:
                klass, with_class = segment, None
            out.append((stem, Args(area, klass, with_class,
                                   phases=",".join(window["phases"]),
                                   start=f"{window['start_from']}:{window['start_to']}")))
    return out


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, help="build only the first N (for a quick check)")
    args = ap.parse_args()

    jobs = jobs_from_manifest()
    if args.limit:
        jobs = jobs[: args.limit]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    bundle, failed, started = {}, [], time.time()
    for stem, job in jobs:
        try:
            built = pkg.build(job)
            notes = pkg.interpretation(built)
            built["interpretation"] = notes
            html = pkg.render_html(built, notes)
        except SystemExit as exc:          # no trials in the cohort
            print(f"  skipped {stem}: {exc}", file=sys.stderr)
            continue
        except Exception as exc:           # noqa: BLE001 — one bad cohort must not stop the run
            failed.append((stem, repr(exc)))
            print(f"  FAILED {stem}: {exc}", file=sys.stderr)
            continue

        slug = f"{slugify(job.area)}-{slugify(built['cohort'])}"
        (OUT_DIR / f"{slug}.json").write_text(json.dumps(built, indent=1, ensure_ascii=False) + "\n",
                                              encoding="utf-8")
        (OUT_DIR / f"{slug}.html").write_text(html, encoding="utf-8")
        bundle[slug] = {
            "cohort": built["cohort"],
            "area": built["area"],
            "brief_stem": stem,
            "generated_at_utc": built["generated_at_utc"],
            "counts": built["counts"],
            "html": html,
        }

    PRIVATE.parent.mkdir(parents=True, exist_ok=True)
    PRIVATE.write_text(json.dumps({
        "schema_version": 1,
        "note": "Server-side only. This file is imported by the API route that delivers a paid "
                "package; it must never be imported from a page component, or the bundler will "
                "ship it to the browser.",
        "package_count": len(bundle),
        "packages": bundle,
    }, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    public = sorted(
        ({"slug": slug, "cohort": p["cohort"], "area": p["area"], "brief_stem": p["brief_stem"],
          "counts": p["counts"], "generated_at_utc": p["generated_at_utc"]} for slug, p in bundle.items()),
        key=lambda p: (p["area"], p["cohort"]))
    PUBLIC.write_text(json.dumps({"schema_version": 1, "package_count": len(public), "packages": public},
                                 indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    size = PRIVATE.stat().st_size / 1024
    print(f"built {len(bundle)} packages in {time.time() - started:.0f}s")
    print(f"wrote {PRIVATE.relative_to(ROOT)} ({size:.0f} KB, server-side only)")
    print(f"wrote {PUBLIC.relative_to(ROOT)} ({len(public)} packages)")
    if failed:
        print(f"{len(failed)} failed: {', '.join(s for s, _ in failed)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
