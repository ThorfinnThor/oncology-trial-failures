#!/usr/bin/env python3
"""Biological discontinuation benchmarks with denominators.

Definitions (stated in every output):
  closed trial        overall status COMPLETED or TERMINATED. WITHDRAWN (never enrolled),
                      SUSPENDED, UNKNOWN and ongoing trials are excluded from the denominator.
  biological stop     TERMINATED with Classification V2 outcome BIOLOGICAL_FAILURE, or MIXED_CAUSES
                      including an efficacy, safety or unspecified biological cause.
  discontinuation rate  biological stops / closed trials, with a 95% Wilson interval.
  This is NOT a failure rate: completed trials that missed their endpoints are not detected.

Segments: target genes (any experimental-arm drug), combination partner genes, modality, phase
group, start-year window, sponsor class, disease area. Default start window ends three years
before the current year so trials have had time to close.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import json
import re
from functools import lru_cache
import math
import sys  # noqa: F401
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

ROOT_ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_))

from scripts.signals.sponsors import resolve_sponsor  # noqa: E402
from scripts.universe.mechanism_classes import COMBINATION_PARTNER, classes_for, classes_of  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
UNIVERSE = ROOT / ".cache/universe/universe_resolved_v1.jsonl.gz"
BIO = {"EFFICACY_FUTILITY", "SAFETY", "BIOLOGICAL_UNSPECIFIED"}
CLOSED = {"COMPLETED", "TERMINATED"}


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))


def phase_groups(phases: list[str]) -> set[str]:
    p = set(phases or [])
    out = set()
    if "PHASE2" in p and "PHASE3" not in p:
        out.add("2")
    if "PHASE3" in p:
        out.add("3")
    return out


def reasons(rec: dict) -> set[str]:
    sec = {x.strip() for x in (rec.get("classification_secondary_reasons_v2") or "").split(";") if x.strip()}
    return ({rec.get("classification_primary_reason_v2")} | sec) - {None, ""}


def is_bio_stop(rec: dict) -> bool:
    if rec.get("overall_status") != "TERMINATED":
        return False
    outcome = rec.get("classification_outcome_v2")
    return outcome == "BIOLOGICAL_FAILURE" or (outcome == "MIXED_CAUSES" and bool(reasons(rec) & BIO))


@lru_cache(maxsize=4)
def load(area: str | None = "Oncology") -> list[dict]:
    rows = []
    with gzip.open(UNIVERSE, "rt", encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            if area and area not in (r.get("disease_areas_matched") or r.get("disease_area") or ""):
                continue
            r["_phase"] = phase_groups(r.get("phases"))
            r["_start_year"] = int(r["start_date"][:4]) if r.get("start_date") else None
            r["_closed"] = r.get("overall_status") in CLOSED
            r["_bio"] = is_bio_stop(r)
            r["_reasons"] = reasons(r) if r["_bio"] else set()
            r["_genes"] = set(r.get("experimental_target_genes") or [])
            # combination partners may sit in both arms (backbone), e.g. tislelizumab + ociperlimab vs tislelizumab
            r["_genes_regimen"] = r["_genes"] | {g for i in r["interventions"] if i["role"] in ("EXPERIMENTAL_ARM", "BACKGROUND_OR_BACKBONE")
                                                  for c in i["components"] for g in c.get("target_genes", [])}
            r["_targets"] = {t for i in r["interventions"] if i["role"] == "EXPERIMENTAL_ARM" for c in i["components"] for t in c.get("target_names", [])}
            r["_classes"] = classes_for(r["_genes"], area)
            r["_classes_regimen"] = classes_for(r["_genes_regimen"], area)
            r["_sponsor_group"] = resolve_sponsor(r.get("lead_sponsor") or "", r.get("lead_sponsor_class") or "")["sponsor_group"]
            r["_modalities"] = {c["modality"] for i in r["interventions"] if i["role"] == "EXPERIMENTAL_ARM" for c in i["components"]}
            rows.append(r)
    return rows


def select(rows, *, genes=None, with_genes=None, modality=None, phases=None, start=None, sponsor_class=None,
           exclude_genes=None, klass=None, with_class=None, exclude_class=None, sponsor_group=None):
    out = []
    for r in rows:
        if phases and not (r["_phase"] & set(phases)):
            continue
        if start and (r["_start_year"] is None or not (start[0] <= r["_start_year"] <= start[1])):
            continue
        if sponsor_class and r.get("lead_sponsor_class") != sponsor_class:
            continue
        if genes and not (r["_genes"] & set(genes)):
            continue
        if with_genes and not (r["_genes_regimen"] & set(with_genes)):
            continue
        if exclude_genes and (r["_genes_regimen"] & set(exclude_genes)):
            continue
        if modality and modality not in r["_modalities"]:
            continue
        if klass and klass not in r["_classes"]:
            continue
        if with_class and with_class not in r["_classes_regimen"]:
            continue
        if exclude_class and exclude_class in r["_classes_regimen"]:
            continue
        if sponsor_group and r["_sponsor_group"] != sponsor_group:
            continue
        out.append(r)
    return out


def summarize(rows) -> dict:
    closed = [r for r in rows if r["_closed"]]
    started = [r for r in rows if r.get("overall_status") != "WITHDRAWN"]
    bio = [r for r in closed if r["_bio"]]
    eff = sum(1 for r in bio if "EFFICACY_FUTILITY" in r["_reasons"])
    saf = sum(1 for r in bio if "SAFETY" in r["_reasons"])
    lo, hi = wilson(len(bio), len(closed))
    return {
        "trials": len(rows), "closed": len(closed), "open_or_other": len(rows) - len(closed),
        "biological_stops": len(bio), "efficacy_stops": eff, "safety_stops": saf,
        "rate": (len(bio) / len(closed)) if closed else None, "ci95": [lo, hi],
        "rate_lower_bound_all_started": (len(bio) / len(started)) if started else None,
        "efficacy_rate": (eff / len(closed)) if closed else None, "safety_rate": (saf / len(closed)) if closed else None,
        "nct_biological_stops": sorted(r["nct_id"] for r in bio),
    }


def fmt(s: dict) -> str:
    if not s["closed"]:
        return f"n={s['trials']} trials, none closed"
    return (f"{s['biological_stops']}/{s['closed']} closed trials = {s['rate']*100:.1f}% "
            f"(95% CI {s['ci95'][0]*100:.1f}–{s['ci95'][1]*100:.1f}%); efficacy {s['efficacy_stops']}, safety {s['safety_stops']}; "
            f"{s['trials']} trials total, {s['open_or_other']} open/other; lower bound over all started {s['rate_lower_bound_all_started']*100:.1f}%")


def standard_tables(rows, out_dir: Path, start, phases, slug: str = "oncology") -> None:
    base = select(rows, phases=phases, start=start)
    out_dir.mkdir(parents=True, exist_ok=True)
    tables = {
        "by_mechanism_class": lambda r: r["_classes"],
        "by_sponsor_group": lambda r: {r["_sponsor_group"]} if r.get("lead_sponsor_class") == "INDUSTRY" else set(),
        "by_target": lambda r: r["_targets"],
        "by_target_gene": lambda r: r["_genes"],
        "by_modality": lambda r: r["_modalities"],
        "by_phase": lambda r: r["_phase"],
        "by_start_year": lambda r: {r["_start_year"]},
        "by_sponsor_class": lambda r: {r.get("lead_sponsor_class")},
    }
    for name, keyfn in tables.items():
        groups = defaultdict(list)
        for r in base:
            for k in keyfn(r) or []:
                if k is not None:
                    groups[k].append(r)
        path = out_dir / f"{slug}_benchmarks_{name}.csv"
        with open(path, "w", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["segment", "trials", "closed", "biological_stops", "efficacy_stops", "safety_stops", "rate", "ci95_low", "ci95_high"])
            for k, rs in sorted(groups.items(), key=lambda kv: -len(kv[1])):
                s = summarize(rs)
                if s["closed"] < 10:
                    continue
                w.writerow([k, s["trials"], s["closed"], s["biological_stops"], s["efficacy_stops"], s["safety_stops"],
                            round(s["rate"], 4), round(s["ci95"][0], 4), round(s["ci95"][1], 4)])
        print("wrote", path.relative_to(ROOT))


def product_json(rows, start, phases, out: Path, area: str | None = "Oncology") -> dict:
    """Machine-readable benchmark pack: baseline plus every segment with enough closed trials."""
    base = select(rows, phases=phases, start=start)
    baseline = summarize(base)
    segments = []

    def add(dimension, segment, subset, extra=None):
        s = summarize(subset)
        if s["closed"] < 10:
            return
        segments.append({"dimension": dimension, "segment": segment, **{k: v for k, v in s.items() if k != "nct_biological_stops"},
                         "biological_stop_nct_ids": s["nct_biological_stops"], **(extra or {})})

    # Each area has its own classes, and its own class that everything is combined with
    # (PD-(L)1 in oncology). Areas without a curated lexicon still get the other dimensions.
    partner = COMBINATION_PARTNER.get(area or "")
    for name in classes_of(area):
        add("mechanism_class", name, select(base, klass=name))
        for ph in phases:
            add("mechanism_class_x_phase", f"{name} | Phase {ph}", select(base, klass=name, phases=[ph]))
        if partner and name != partner:
            add("mechanism_class_with_pd1", f"{name} + {partner}", select(base, klass=name, with_class=partner))
    for modality in sorted({m for r in base for m in r["_modalities"]}):
        add("modality", modality, select(base, modality=modality))
    for ph in phases:
        add("phase", f"Phase {ph}", select(base, phases=[ph]))
    for year in sorted({r["_start_year"] for r in base if r["_start_year"]}):
        add("start_year", str(year), [r for r in base if r["_start_year"] == year])
    for cls in sorted({r.get("lead_sponsor_class") for r in base if r.get("lead_sponsor_class")}):
        add("sponsor_class", cls, select(base, sponsor_class=cls))
    groups = defaultdict(list)
    for r in base:
        if r.get("lead_sponsor_class") == "INDUSTRY":
            groups[r["_sponsor_group"]].append(r)
    for group, subset in groups.items():
        add("sponsor_group", group, subset)

    pack = {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "product": "Clinical Trial Failure Benchmarks (oncology)",
        "window": {"start_year_from": start[0], "start_year_to": start[1], "phases": phases},
        "definitions": {
            "closed": "overall status COMPLETED or TERMINATED; withdrawn, suspended, unknown and ongoing excluded",
            "biological_stop": "TERMINATED with outcome BIOLOGICAL_FAILURE, or MIXED_CAUSES including an efficacy/safety/biological cause",
            "rate": "biological stops / closed trials, 95% Wilson interval",
            "lower_bound": "biological stops / all trials that were not withdrawn",
            "not_a_failure_rate": "completed trials that missed their endpoints are not detected",
        },
        "baseline": {k: v for k, v in baseline.items() if k != "nct_biological_stops"},
        "segments": sorted(segments, key=lambda s: (s["dimension"], -s["closed"])),
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(pack, indent=1))
    print(f"wrote {out.relative_to(ROOT)} ({len(segments)} segments)")
    return pack


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--genes", help="comma-separated target genes of any experimental-arm drug, e.g. TIGIT")
    ap.add_argument("--with-genes", help="also requires one of these genes, e.g. PDCD1,CD274")
    ap.add_argument("--compare-with-genes", help="reference: trials with these genes excluding --genes")
    ap.add_argument("--modality")
    ap.add_argument("--phases", default="2,3")
    ap.add_argument("--start", default=f"2010:{date.today().year - 4}")
    ap.add_argument("--sponsor-class")
    ap.add_argument("--class", dest="klass", help="mechanism class, e.g. 'TIGIT'")
    ap.add_argument("--with-class", help="combination partner class, e.g. 'PD-(L)1'")
    ap.add_argument("--sponsor-group")
    ap.add_argument("--pack", action="store_true", help="write the machine-readable benchmark pack")
    ap.add_argument("--tables", action="store_true", help="write standard benchmark tables to product/benchmarks")
    ap.add_argument("--area", default="Oncology", help="disease area, e.g. 'Immunology & Autoimmune'")
    args = ap.parse_args()
    split = lambda s: [x.strip() for x in s.split(",")] if s else None
    start = tuple(int(x) for x in args.start.split(":"))
    phases = split(args.phases)
    rows = load(args.area)
    slug = re.sub(r"[^a-z0-9]+", "-", args.area.lower()).strip("-")
    if args.tables:
        standard_tables(rows, ROOT / "product/benchmarks", start, phases, slug=slug)
    if args.pack:
        product_json(rows, start, phases, ROOT / f"product/benchmarks/{slug}_benchmarks_v1.json", area=args.area)
    common = dict(phases=phases, start=start, sponsor_class=args.sponsor_class, modality=args.modality)
    print(f"{args.area} Phase {args.phases} interventional trials started {start[0]}–{start[1]}:")
    print("  all:", fmt(summarize(select(rows, **common))))
    if args.genes or args.with_genes or args.klass or args.sponsor_group:
        seg = select(rows, genes=split(args.genes), with_genes=split(args.with_genes), klass=args.klass,
                     with_class=args.with_class, sponsor_group=args.sponsor_group, **common)
        label = args.klass or args.genes or args.sponsor_group
        print(f"  segment {label}{' + ' + args.with_class if args.with_class else ''}:", fmt(summarize(seg)))
        if args.with_class:
            ref = select(rows, with_class=args.with_class, exclude_class=args.klass, **common)
            print(f"  reference {args.with_class} combinations excluding {args.klass}:", fmt(summarize(ref)))
        elif args.compare_with_genes:
            ref = select(rows, with_genes=split(args.compare_with_genes), exclude_genes=split(args.genes), **common)
            print(f"  reference with={args.compare_with_genes} excluding {args.genes}:", fmt(summarize(ref)))
        elif args.klass:
            ref = select(rows, exclude_class=args.klass, **common)
            print(f"  reference all oncology excluding {args.klass}:", fmt(summarize(ref)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
