#!/usr/bin/env python3
"""Generate a benchmark-led signal brief for any mechanism class, gene set or sponsor.

The brief leads with the discontinuation rate and its comparison group, then lists the
underlying stopped trials. Output: a self-contained HTML file plus a JSON fact sheet
(so every number in the text can be traced).

Examples:
  python scripts/briefs/build_brief.py --class "TGF-β" --with-class "PD-(L)1"
  python scripts/briefs/build_brief.py --class TIGIT --with-class "PD-(L)1" --start 2015:2024
  python scripts/briefs/build_brief.py --sponsor-group Novartis --out product/briefs/novartis.html
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.external_sources import sec_issuer  # noqa: E402
from scripts.signals.http_cache import SourceUnavailable  # noqa: E402
from scripts.universe.benchmarks import fmt, load, select, summarize  # noqa: E402

OUT_DIR = ROOT / "product/briefs"
COHORTS = [(2015, 2017), (2018, 2020), (2021, 2024)]


def e(x) -> str:
    return html.escape(str(x if x is not None else ""))


def pct(x) -> str:
    return "—" if x is None else f"{x * 100:.1f}%"


NO_REASON = '<span class="muted">no reason recorded in the registry</span>'
MAX_ROWS = 40


def full(text) -> str:
    """Registry stop reason, verbatim (ClinicalTrials.gov caps this field at 250 chars)."""
    return e(" ".join((text or "").split()))


def drugs(rec) -> str:
    names = []
    for iv in rec["interventions"]:
        if iv["role"] != "EXPERIMENTAL_ARM":
            continue
        for c in iv["components"]:
            if c["status"] in ("GENERIC", "SUPPORTIVE"):
                continue
            name = (c.get("name") or c["label"]).strip()
            if name and name.lower() not in {n.lower() for n in names}:
                names.append(name if len(name) < 34 else name[:33] + "…")
    return ", ".join(names[:4])


def ticker(rec) -> str:
    if rec.get("lead_sponsor_class") != "INDUSTRY":
        return ""
    try:
        hit = sec_issuer(rec["_sponsor_group"], rec.get("lead_sponsor") or "")
    except SourceUnavailable:
        return ""
    return hit["ticker"] if hit else ""


def bar(label, s, maxrate, note=""):
    width = 0 if not s["rate"] else s["rate"] / maxrate * 100
    return (f'<div class="barrow"><div class="blabel">{e(label)}</div><div class="track">'
            f'<span class="seg" style="width:{width:.1f}%"></span>'
            f'<span class="val">{pct(s["rate"])}</span></div>'
            f'<div class="bnote">{s["biological_stops"]}/{s["closed"]} closed{(" · " + note) if note else ""}</div></div>')


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--class", dest="klass")
    ap.add_argument("--with-class")
    ap.add_argument("--genes")
    ap.add_argument("--sponsor-group")
    ap.add_argument("--modality")
    ap.add_argument("--phases", default="2,3")
    ap.add_argument("--start", default=f"2015:{date.today().year - 2}")
    ap.add_argument("--area", default="Oncology")
    ap.add_argument("--out")
    args = ap.parse_args(argv)

    start = tuple(int(x) for x in args.start.split(":"))
    phases = [p.strip() for p in args.phases.split(",")]
    rows = load(args.area)
    common = dict(phases=phases, start=start)
    genes = [g.strip() for g in args.genes.split(",")] if args.genes else None

    segment_rows = select(rows, klass=args.klass, with_class=args.with_class, genes=genes,
                          sponsor_group=args.sponsor_group, modality=args.modality, **common)
    segment = summarize(segment_rows)
    baseline = summarize(select(rows, **common))
    if args.with_class:
        ref_label = f"{args.with_class} combinations without {args.klass or args.genes or args.modality}"  # shown verbatim
        reference = summarize(select(rows, with_class=args.with_class, exclude_class=args.klass, **common))
    else:
        # Without a combination partner the reference IS the baseline; the brief then shows one
        # comparison instead of printing the same rate twice under two different names.
        ref_label = f"all {args.area.lower()} Phase {args.phases} trials"
        reference = baseline
    has_reference = reference is not baseline
    if not segment["closed"]:
        print("No closed trials in this segment; nothing to publish.")
        return 2

    title_bits = [args.klass or args.genes or args.sponsor_group or args.modality or args.area]
    if args.with_class:
        title_bits.append(f"+ {args.with_class}")
    name = " ".join(title_bits)
    stops = sorted([r for r in segment_rows if r["_bio"]], key=lambda r: (r.get("stop_date_estimate") or ""), reverse=True)
    for r in stops:
        r["_ticker"] = ticker(r)
    maxrate = max(x["rate"] or 0 for x in (segment, reference, baseline)) or 1

    cohorts = []
    for lo, hi in COHORTS:
        sub = summarize(select(segment_rows, start=(lo, hi), phases=phases))
        if sub["closed"] >= 5:
            cohorts.append((f"{lo}–{hi}", sub))
    sponsors = Counter(r["_sponsor_group"] for r in stops).most_common(6)
    reasons = Counter("Safety" if "SAFETY" in r["_reasons"] else "Efficacy / futility" if "EFFICACY_FUTILITY" in r["_reasons"]
                      else "Benefit–risk" for r in stops)

    facts = {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "segment": name, "window": {"phases": phases, "start_from": start[0], "start_to": start[1], "area": args.area},
        "segment_stats": {k: v for k, v in segment.items() if k != "nct_biological_stops"},
        "reference_label": ref_label, "reference_stats": {k: v for k, v in reference.items() if k != "nct_biological_stops"},
        "baseline_stats": {k: v for k, v in baseline.items() if k != "nct_biological_stops"},
        "cohorts": [{"cohort": c, **{k: v for k, v in s.items() if k != "nct_biological_stops"}} for c, s in cohorts],
        "biological_stop_nct_ids": segment["nct_biological_stops"],
    }

    row_items = []
    for r in stops[:MAX_ROWS]:
        tk_html = f' <span class="tk">{e(r["_ticker"])}</span>' if r["_ticker"] else ""
        reason = full(r.get("why_stopped")) or NO_REASON
        kind = "Safety" if "SAFETY" in r["_reasons"] else "Efficacy" if "EFFICACY_FUTILITY" in r["_reasons"] else "Benefit–risk"
        row_items.append(
            f'<tr><td class="mono">{e(r["nct_id"])}</td>'
            f'<td>{"3" if "3" in r["_phase"] else "2"}</td>'
            f'<td>{e(r["_sponsor_group"])}{tk_html}</td>'
            f'<td>{e(drugs(r))}</td>'
            f'<td>{e((r.get("stop_date_estimate") or "")[:7])}</td>'
            f'<td>{kind}</td>'
            f'<td class="reason">{reason}</td></tr>'
        )
    rows_html = "".join(row_items)

    cohort_html = "".join(
        f'<tr><td>{e(c)}</td><td>{s["biological_stops"]}</td><td>{s["closed"]}</td><td>{pct(s["rate"])}</td>'
        f'<td>{pct(s["ci95"][0])}–{pct(s["ci95"][1])}</td></tr>' for c, s in cohorts)

    doc = f"""<!doctype html><html><head><meta charset="utf-8"><title>{e(name)} — discontinuation benchmark</title><style>
@page {{ size:A4; margin:14mm 13mm; }}
:root {{ --ink:#0b0b0b; --ink2:#52514e; --muted:#7a7974; --rule:#e4e3de; --accent:#1f3a5f; --bar:#2a78d6; --bar2:#b9c6d6; }}
body {{ font-family:"Inter","Helvetica Neue",Arial,sans-serif; color:var(--ink); font-size:9pt; line-height:1.38; margin:0; }}
/* On screen the brief keeps its A4 measure instead of stretching across the window. */
@media screen {{
  body {{ background:#eceae5; padding:24px 16px; font-size:10.5pt; }}
  .sheet {{ max-width:210mm; margin:0 auto; background:#fff; padding:16mm 14mm; box-shadow:0 2px 24px rgba(0,0,0,.10); border-radius:2px; }}
}}
@media print {{ .sheet {{ max-width:none; margin:0; padding:0; box-shadow:none; }} }}
.kicker {{ font-size:7.6pt; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); font-weight:700; }}
h1 {{ font-size:18pt; line-height:1.15; margin:4px 0 6px; letter-spacing:-.01em; }}
.dek {{ color:var(--ink2); font-size:9.6pt; margin:0 0 10px; }}
.stats {{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:8px 0 12px; }}
.stat {{ border-top:2px solid var(--ink); padding-top:5px; }} .stat b {{ display:block; font-size:17pt; font-variant-numeric:tabular-nums; }}
.stat span {{ color:var(--ink2); font-size:7.8pt; }}
h2 {{ font-size:10.5pt; margin:12px 0 6px; padding-bottom:3px; border-bottom:1px solid var(--rule); }}
.cols {{ display:grid; grid-template-columns:1.1fr 1fr; gap:16px; }}
.barrow {{ margin:7px 0; }} .blabel {{ font-size:8.4pt; }} .bnote {{ font-size:7.4pt; color:var(--muted); }}
.track {{ display:flex; align-items:center; gap:6px; height:14px; }}
.seg {{ height:14px; background:var(--bar); border-radius:0 3px 3px 0; }}
.val {{ font-size:8.4pt; font-variant-numeric:tabular-nums; }}
table {{ width:100%; border-collapse:collapse; font-size:7.6pt; }}
th {{ text-align:left; color:var(--muted); font-weight:600; border-bottom:1px solid var(--ink); padding:3px 4px; }}
td {{ border-bottom:1px solid var(--rule); padding:2.5px 4px; vertical-align:top; }}
.mono {{ font-family:"SFMono-Regular",Menlo,Consolas,monospace; font-size:7.4pt; white-space:nowrap; }}
.reason {{ font-size:7.2pt; line-height:1.28; width:40%; overflow-wrap:anywhere; }} .muted {{ color:var(--muted); }}
table.stops td:nth-child(4) {{ width:16%; }} table.stops td:nth-child(3) {{ width:13%; }}
table {{ page-break-inside:auto; }} tr {{ page-break-inside:avoid; }}
.tk {{ font-size:7pt; border:1px solid var(--rule); border-radius:3px; padding:0 3px; color:var(--ink2); }}
.box {{ background:#f4f3ef; padding:8px 10px; border-radius:4px; font-size:7.8pt; color:var(--ink2); }}
.box b {{ color:var(--ink); }}
.cta {{ border:1.5px solid var(--ink); padding:8px 10px; border-radius:4px; margin-top:10px; font-size:8.4pt; }}
.foot {{ margin-top:8px; font-size:7.2pt; color:var(--muted); border-top:1px solid var(--rule); padding-top:5px; }}
</style></head><body>
<div class="sheet">
<div class="kicker">Clinical Trial Failures · Discontinuation benchmark · {e(args.area)} Phase {e(args.phases)} · starts {start[0]}–{start[1]}</div>
<h1>{e(name)}: {pct(segment['rate'])} of closed trials stopped for biological reasons</h1>
<p class="dek">Against {pct(reference['rate'])} for {e(ref_label)}{f" and {pct(baseline['rate'])} across all {e(args.area.lower())} Phase {e(args.phases)} trials" if has_reference else ""} in the same window.
Rates count trials that stopped early for efficacy, safety or benefit–risk reasons; trials that completed and missed their endpoints are not counted.</p>
<div class="stats">
 <div class="stat"><b>{pct(segment['rate'])}</b><span>{segment['biological_stops']} of {segment['closed']} closed trials (95% CI {pct(segment['ci95'][0])}–{pct(segment['ci95'][1])})</span></div>
 <div class="stat"><b>{segment['efficacy_stops']} / {segment['safety_stops']}</b><span>efficacy&nbsp;/&nbsp;safety stops</span></div>
 <div class="stat"><b>{segment['trials']}</b><span>trials in segment · {segment['open_or_other']} still open or unresolved</span></div>
 <div class="stat"><b>{pct(segment['rate_lower_bound_all_started'])}</b><span>lower bound if every open trial completes</span></div>
</div>
<div class="cols">
<div>
<h2>How this compares</h2>
{bar(name, segment, maxrate)}
{bar(ref_label, reference, maxrate) if has_reference else ""}
{bar(f"All {args.area.lower()} Phase {args.phases}", baseline, maxrate)}
<p style="font-size:7.4pt;color:var(--muted);margin-top:6px">Bars show the share of closed trials stopped for biological reasons. Confidence intervals overlap where sample sizes are small — read the counts, not just the bars.</p>
</div>
<div>
<h2>By start cohort</h2>
<table><thead><tr><th>Trials started</th><th>Stops</th><th>Closed</th><th>Rate</th><th>95% CI</th></tr></thead><tbody>{cohort_html or '<tr><td colspan=5>Too few closed trials per cohort.</td></tr>'}</tbody></table>
<h2 style="margin-top:10px">Where the stops sit</h2>
<p style="font-size:8pt">{e(", ".join(f"{k}: {v}" for k, v in reasons.most_common()))}.<br>
Sponsors with most stops: {e(", ".join(f"{s} ({n})" for s, n in sponsors))}.</p>
</div>
</div>
<h2>The stopped trials</h2>
<table class="stops"><thead><tr><th>Trial</th><th>Ph</th><th>Sponsor</th><th>Experimental drugs</th><th>Stopped</th><th>Type</th><th>Registry stop reason</th></tr></thead><tbody>{rows_html}</tbody></table>
{f'<p style="font-size:7.4pt;color:var(--muted)">Showing {MAX_ROWS} of {len(stops)} stopped trials; the full list ships with the dataset.</p>' if len(stops) > MAX_ROWS else ''}
<div class="cols" style="margin-top:10px">
<div class="box"><b>Method</b><br>Denominator: ClinicalTrials.gov interventional Phase {e(args.phases)} {e(args.area.lower())} trials started {start[0]}–{start[1]} that have closed (completed or terminated). Numerator: terminated trials whose registry stop reason is classified as biological (efficacy, safety or benefit–risk) by Classification V2 — held-out precision 95.5%, recall 95.3% (n=600). Drugs are linked to ChEMBL and the NCI Thesaurus; 86% of industry oncology experimental-arm drugs resolve to a canonical molecule, 70% carry a target. Intervals are Wilson 95%.</div>
<div class="box"><b>Limits</b><br>Not a failure rate: trials that completed with negative results are not counted, and programs discontinued after a completed trial do not appear. Stop reasons are sponsor-reported. Recent cohorts have fewer closed trials, so their rates are less stable. Research signals, not clinical or investment advice.</div>
</div>
<div class="cta"><b>Any mechanism, sponsor or indication, updated weekly.</b> The dataset behind this brief covers every stopped oncology trial with an efficacy or safety signal plus the full denominator universe. Free sample and licensing: <b>clinicaltrialfailures.com/data-licensing</b></div>
<div class="foot">Sources: ClinicalTrials.gov (NLM); ChEMBL (EMBL-EBI, CC BY-SA 3.0); NCI Thesaurus (NCI); RxNorm/RxClass (NLM); SEC EDGAR. Classification, linkage and benchmarks by Clinical Trial Failures. Generated {facts['generated_at_utc']}.</div>
</div>
</body></html>"""

    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    out = Path(args.out) if args.out else OUT_DIR / f"brief_{slug}_{start[0]}-{start[1]}.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding="utf-8")
    out.with_suffix(".facts.json").write_text(json.dumps(facts, indent=1))
    print(f"wrote {out}")
    print("segment:", fmt(segment))
    print("reference:", fmt(reference))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
