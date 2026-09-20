#!/usr/bin/env python3
"""Generate a discontinuation-rate brief for any mechanism class, gene set or sponsor.

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
from scripts.universe.discontinuation_rates import fmt, load, select, summarize  # noqa: E402
from scripts.universe.cumulative_incidence import curve  # noqa: E402
from scripts.signals.stop_attribution import attribute_all, signature, summarise  # noqa: E402

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
    ap.add_argument("--q-value", type=float, help="false-discovery q for this segment within its family of tests")
    ap.add_argument("--family-size", type=int, help="how many segments were screened alongside it")
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
    base_rows = select(rows, **common)
    baseline = summarize(base_rows)
    # A mechanism class can only contain a trial whose drug resolved to a target, and resolved
    # trials are not a random sample of trials: in oncology 84% of biological stops resolve
    # against 72% of all trials. Comparing a class with the all-trials baseline therefore
    # compares mapping eligibility as much as biology, so a class brief is scored against the
    # resolved baseline and the all-trials figure is shown underneath it.
    resolved_rows = [r for r in base_rows if r["_genes"]]
    baseline_resolved = summarize(resolved_rows)
    is_class_segment = bool(args.klass or args.genes)
    if args.with_class:
        ref_label = f"{args.with_class} combinations without {args.klass or args.genes or args.modality}"  # shown verbatim
        reference = summarize(select(rows, with_class=args.with_class, exclude_class=args.klass, **common))
    elif is_class_segment:
        ref_label = f"all {args.area.lower()} trials with a resolved drug target"
        reference = baseline_resolved
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
    # How many molecules are behind the stops, and whether they share a modality. Seven records
    # of four molecules is a different claim from seven independent failures, and the reader
    # who will not be fooled by the first is the reader worth convincing.
    sig = signature(stops, area=args.area, klass=args.klass)
    attribution = summarise(attribute_all(stops))
    seg_curve = curve(segment_rows)
    base_curve = curve(base_rows)
    cif36 = next((h for h in seg_curve.get("cif", []) if h["months"] == 36), None)
    base36 = next((h for h in base_curve.get("cif", []) if h["months"] == 36), None)
    # Linkage coverage differs by area (oncology resolves far better than CNS), so the method
    # box states this area's own figure rather than quoting oncology's everywhere.
    industry = [r for r in select(rows, **common) if r.get("lead_sponsor_class") == "INDUSTRY"]
    linked_pct = round(100 * sum(1 for r in industry if r["_genes"]) / len(industry)) if industry else 0

    # What is actually inside this class. A pathway label is not automatically a coherent risk
    # class: pooled as one "amyloid" segment, antibodies and secretase inhibitors read 41.7%,
    # a figure that described neither half. Publishing the composition makes that visible for
    # every class rather than only the one somebody thought to check.
    def experimental_components(r):
        return [c for i in r["interventions"] if i["role"] == "EXPERIMENTAL_ARM" for c in i["components"]]

    modality_mix = Counter(m for r in segment_rows for m in r["_modalities"])
    asset_trials = Counter()
    mechanism_mix = Counter()
    for r in segment_rows:
        seen = set()
        for c in experimental_components(r):
            if c.get("name") and c["name"] not in seen:
                seen.add(c["name"])
                asset_trials[c["name"]] += 1
            for mech in c.get("mechanisms") or []:
                mechanism_mix[mech] += 1
    composition = {
        "distinct_assets": len(asset_trials),
        "modalities": dict(modality_mix.most_common()),
        "top_assets": [{"asset": a, "trials": n} for a, n in asset_trials.most_common(8)],
        "top_mechanisms": [{"mechanism": m, "components": n} for m, n in mechanism_mix.most_common(6)],
    }

    cohorts = []
    for lo, hi in COHORTS:
        sub = summarize(select(segment_rows, start=(lo, hi), phases=phases))
        if sub["closed"] >= 5:
            cohorts.append((f"{lo}–{hi}", sub))
    sponsors = Counter(r["_sponsor_group"] for r in stops).most_common(6)
    def bucket(r) -> str:
        eff, saf = "EFFICACY_FUTILITY" in r["_reasons"], "SAFETY" in r["_reasons"]
        return "Efficacy and safety" if eff and saf else "Safety" if saf else "Efficacy / futility" if eff else "Benefit–risk"

    reasons = Counter(bucket(r) for r in stops)

    facts = {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "segment": name, "window": {"phases": phases, "start_from": start[0], "start_to": start[1], "area": args.area},
        "segment_stats": {k: v for k, v in segment.items() if k != "nct_biological_stops"},
        "reference_label": ref_label, "reference_stats": {k: v for k, v in reference.items() if k != "nct_biological_stops"},
        "baseline_stats": {k: v for k, v in baseline.items() if k != "nct_biological_stops"},
        "baseline_target_resolved_stats": {k: v for k, v in baseline_resolved.items() if k != "nct_biological_stops"},
        "failure_signature": sig,
        "stop_attribution": attribution,
        "segment_composition": composition,
        "multiplicity": {"q_value_by": args.q_value, "family_size": args.family_size,
                         "method": "Benjamini-Yekutieli over a one-sided exact binomial test against the "
                                   "target-resolved baseline, valid under arbitrary dependence because the "
                                   "segments in the family overlap by construction."} if args.q_value is not None else None,
        "segment_cumulative_incidence": seg_curve,
        "baseline_cumulative_incidence": base_curve,
        "cohorts": [{"cohort": c, **{k: v for k, v in s.items() if k != "nct_biological_stops"}} for c, s in cohorts],
        "biological_stop_nct_ids": segment["nct_biological_stops"],
        # Trial-level rows so the same facts file can feed the web pages, not just this HTML.
        "trials": [{
            "nct_id": r["nct_id"],
            "phase": "3" if "3" in r["_phase"] else "2",
            "sponsor_group": r["_sponsor_group"],
            "sponsor_ticker": r["_ticker"],
            "drugs": drugs(r),
            "stopped": (r.get("stop_date_estimate") or "")[:7],
            "type": bucket(r).replace("Efficacy / futility", "Efficacy").replace("Efficacy and safety", "Efficacy + safety"),
            "why_stopped": " ".join((r.get("why_stopped") or "").split()),
            "registry_url": f"https://clinicaltrials.gov/study/{r['nct_id']}",
        } for r in stops],
    }

    row_items = []
    for r in stops[:MAX_ROWS]:
        tk_html = f' <span class="tk">{e(r["_ticker"])}</span>' if r["_ticker"] else ""
        reason = full(r.get("why_stopped")) or NO_REASON
        kind = bucket(r).replace("Efficacy / futility", "Efficacy").replace("Efficacy and safety", "Efficacy + safety")
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

    if cif36 and seg_curve.get("trials"):
        cif36_value = pct(cif36["cif"])
        cif36_note = (f"stopped for a biological reason within 3 years of starting "
                      f"(95% CI {pct(cif36['ci95'][0])}–{pct(cif36['ci95'][1])}; {cif36['n_risk']} still at risk"
                      + (f"; {pct(base36['cif'])} area-wide)" if base36 else ")"))
    else:
        cif36_value, cif36_note = "—", "too few trials for a time-to-event estimate"

    lopo = segment.get("rate_leave_one_programme_out")
    robust_bits = [
        f"The {segment['biological_stops']} stops came from {segment['stop_programmes']} sponsor-asset "
        f"programme{'s' if segment['stop_programmes'] != 1 else ''} across {segment['stop_sponsors']} "
        f"sponsor{'s' if segment['stop_sponsors'] != 1 else ''}"]
    if segment["largest_programme"]:
        robust_bits.append(f"the largest ({e(segment['largest_programme'])}) contributed "
                           f"{segment['largest_programme_stops']}")
    if lopo is not None:
        robust_bits.append(f"removing that programme's trials from both sides leaves {pct(lopo)}")
    if attribution["stops_from_programme_cascade"]:
        attribution_line = (f"{attribution['stops_from_own_data']} of the stops were the trial's own verdict and "
                            f"{attribution['stops_from_programme_cascade']} followed a decision taken elsewhere"
                            + (f"; {attribution['stops_unclear']} cannot be established."
                               if attribution["stops_unclear"] else "."))
    else:
        attribution_line = ""
    robust = "; ".join(robust_bits) + "."
    if args.q_value is not None and args.family_size:
        verdict = ("survives" if args.q_value <= 0.10 else "does not survive")
        robust += (f" Screened alongside {args.family_size} other segments in this area, it {verdict} a 10% "
                   f"false-discovery correction (q={args.q_value:.3g}, Benjamini-Yekutieli).")
    if segment["unresolved_terminations"]:
        robust += (f" A further {segment['unresolved_terminations']} closed trials here were terminated with no cause "
                   f"recorded in the registry; if every one of them were biological the rate would be "
                   f"{pct(segment['rate_if_all_unresolved_were_biological'])}.")

    mod_bits = ", ".join(f"{k.lower()} {v}" for k, v in list(modality_mix.most_common())[:4]) or "not resolved"
    asset_bits = ", ".join(f"{e(a)} ({n})" for a, n in asset_trials.most_common(5))
    composition_line = (f"<b>What is in this class:</b> {composition['distinct_assets']} distinct experimental drugs "
                        f"across {segment['trials']} trials ({mod_bits})."
                        + (f" Most tested: {asset_bits}." if asset_bits else "")
                        + " A class groups drugs by what they act on; check that the grouping is one you would make"
                          " before reading the rate as a property of the mechanism.")

    doc = f"""<!doctype html><html><head><meta charset="utf-8"><title>{e(name)} — discontinuation rate</title><style>
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
.robust {{ color:var(--ink2); font-size:8.4pt; line-height:1.45; margin:8px 0 0; }}
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
<div class="kicker">Clinical Trial Failures · Discontinuation rate · {e(args.area)} Phase {e(args.phases)} · starts {start[0]}–{start[1]}</div>
<h1>{e(name)}: {e(sig['headline'])}</h1>
<p class="dek"><b>{e(sig['sentence'])}</b> {attribution_line} Against {pct(reference['rate'])} for {e(ref_label)}{f" and {pct(baseline['rate'])} across all {e(args.area.lower())} Phase {e(args.phases)} trials" if has_reference else ""} in the same window.
Rates count trials that stopped early for efficacy, safety or benefit–risk reasons; trials that completed and missed their endpoints are not counted.</p>
<div class="stats">
 <div class="stat"><b>{pct(segment['rate'])}</b><span>{segment['biological_stops']} of {segment['closed']} closed trials (95% CI {pct(segment['ci95'][0])}–{pct(segment['ci95'][1])})</span></div>
 <div class="stat"><b>{segment['stops_efficacy_only']} / {segment['stops_safety_only']} / {segment['stops_efficacy_and_safety']}</b><span>efficacy&nbsp;/ safety&nbsp;/ both (adds to {segment['biological_stops']})</span></div>
 <div class="stat"><b>{pct(segment['closed_share'])}</b><span>of {segment['trials']} trials have closed · {segment['open_or_other']} still open or unresolved</span></div>
 <div class="stat"><b>{cif36_value}</b><span>{cif36_note}</span></div>
</div>
<div class="cols">
<div>
<h2>How this compares</h2>
{bar(name, segment, maxrate)}
{bar(ref_label, reference, maxrate) if has_reference else ""}
{bar(f"All {args.area.lower()} Phase {args.phases}", baseline, maxrate)}
<p class="robust">{composition_line}</p>
<p class="robust"><b>How much does this rest on one decision?</b> {robust} Read it as a screen worth checking against the
underlying trials.</p>
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
<div class="box"><b>Method</b><br>Denominator: ClinicalTrials.gov interventional Phase {e(args.phases)} {e(args.area.lower())} trials started {start[0]}–{start[1]} that have closed (completed or terminated). Numerator: terminated trials whose registry stop reason is classified as biological (efficacy, safety or benefit–risk) by Classification V2 — held-out precision 95.5%, recall 95.3% (n=600). Drugs are linked to ChEMBL and the NCI Thesaurus; {linked_pct}% of industry {e(args.area.lower())} trials in this window carry a resolved drug target, and a trial without one cannot enter a mechanism class. Intervals are Wilson 95%.</div>
<div class="box"><b>Limits</b><br>Not a failure rate: trials that completed with negative results are not counted, and programs discontinued after a completed trial do not appear. Stop reasons are sponsor-reported. This is a closed-trial proportion, not a time-to-event analysis: only {pct(segment['closed_share'])} of trials in this segment have closed, and a trial that stops early enters the denominator sooner than one that runs to completion, which can inflate the rate in immature segments. Recent cohorts have fewer closed trials, so their rates are less stable. Research signals, not clinical or investment advice.</div>
</div>
<div class="cta"><b>Any mechanism, sponsor or indication, updated weekly.</b> The dataset behind this brief covers every stopped {e(args.area.lower())} trial with an efficacy or safety signal plus the full denominator universe. Free sample and licensing: <b>clinicaltrialfailures.com/data-licensing</b></div>
<div class="foot">Sources: ClinicalTrials.gov (NLM); ChEMBL (EMBL-EBI, CC BY-SA 3.0); NCI Thesaurus (NCI); RxNorm/RxClass (NLM); SEC EDGAR. Classification, linkage and rates by Clinical Trial Failures. Rebuilt weekly; this brief covers trials started {start[0]}–{start[1]}.</div>
</div>
</body></html>"""

    # The file name carries the area: BTK and JAK/TYK2 are classes in both oncology and
    # immunology, and without it the second area silently overwrote the first area's brief.
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    area_slug = re.sub(r"[^a-z0-9]+", "-", (args.area or "").lower()).strip("-")
    out = Path(args.out) if args.out else OUT_DIR / f"brief_{area_slug}_{slug}_{start[0]}-{start[1]}.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding="utf-8")
    out.with_suffix(".facts.json").write_text(json.dumps(facts, indent=1))
    print(f"wrote {out}")
    print("segment:", fmt(segment))
    print("reference:", fmt(reference))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
