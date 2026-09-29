#!/usr/bin/env python3
"""The evidence package: one cohort, assembled so a buyer can audit every number in it.

The licensing page sells an evidence package for a cohort the customer names. This builds it. Nothing here is a new statistic — the rate, the curve, the concentration and the ambiguity
band all already exist — except the one thing a rate can never carry: which stops were the
trial's own verdict and which followed a decision taken somewhere else.

That distinction is the product. TGF-beta + PD-(L)1 reads 11 stops in 44 closed trials. Six
of those trials stopped on their own data; five were closed because bintrafusp alfa or NIS793
had already failed elsewhere. An analyst evaluating a TGF-beta asset needs to know they are
looking at two failed molecules and the trials cleared around them, not eleven independent
verdicts on the mechanism. No leaderboard conveys that, and reading eleven registry entries by
hand is exactly the work this is sold to replace.

Output is a JSON file with every input to every figure, and a standalone HTML report. Facts
extracted from the registry and interpretation written by us are kept in separate blocks and
labelled as such, because conflating them is how a data product becomes a liability.

  python scripts/signals/build_evidence_package.py --area Oncology --class "TGF-β" --with-class "PD-(L)1"
  python scripts/signals/build_evidence_package.py --area Neurology --class "Tau" --out /tmp/tau
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.stop_attribution import attribute_all, signature, summarise  # noqa: E402
from scripts.universe.cumulative_incidence import curve  # noqa: E402
from scripts.universe.discontinuation_rates import load, select, summarize  # noqa: E402
from scripts.universe.endpoint_outcomes import disclosure_gap, evidence_of, load_verdicts, read_on, results_url  # noqa: E402
from scripts.universe.multiplicity import binom_sf  # noqa: E402

# What we compare, and what we deliberately do not. Modality, target and mechanism come out of
# the same index that resolved the trials, so they are extracted facts. Population, line of
# therapy, dose, biomarker selection and endpoint are what actually decide whether a historical
# failure transfers, and none of them can be read off a drug record — so the report asks those
# questions rather than answering them.
NOT_COMPARED = ["patient population and disease stage", "line of therapy", "dose and exposure",
                "biomarker selection", "primary endpoint and its timing"]


def resolve_asset(name: str) -> dict | None:
    """The customer's asset, from the same ChEMBL index that resolved the trials."""
    from scripts.universe.chembl_index import load as load_index, norm

    idx = load_index()
    ids = idx["names"].get(norm(name))
    if not ids:
        return None
    chembl_id = ids[0]
    mol = idx["molecules"].get(chembl_id, {})
    mechs = idx["mechanisms"].get(chembl_id, []) or []
    genes = sorted({g for m in mechs
                    for g in (idx["targets"].get(m.get("target_chembl_id"), {}) or {}).get("gene_symbols", [])})
    return {
        "query": name,
        "asset": mol.get("pref_name") or name.upper(),
        "chembl_id": chembl_id,
        "modality": mol.get("molecule_type"),
        "max_phase": mol.get("max_phase"),
        "target_genes": genes,
        "mechanisms": sorted({m.get("mechanism_of_action") for m in mechs if m.get("mechanism_of_action")}),
    }


def compare_asset(asset: dict, failed: list[dict], area: str | None = "Oncology") -> list[dict]:
    """One row per failed molecule: what it shares with the asset under review, and what it does not.

    Ported to TypeScript in web/lib/server/assetComparison.ts, which is what runs at delivery.
    web/tests/assetComparison.test.ts checks the two against fixtures generated from this
    function; change one and the test fails until the other follows.
    """
    from scripts.universe.mechanism_classes import classes_for

    out = []
    a_genes, a_mechs = set(asset.get("target_genes") or []), set(asset.get("mechanisms") or [])
    a_classes = set(classes_for(a_genes, area))
    for f in failed:
        f_genes, f_mechs = set(f.get("target_genes") or []), set(f.get("mechanisms") or [])
        same_modality = bool(asset.get("modality")) and asset["modality"] in (f.get("modalities") or [])
        shared_genes = sorted(a_genes & f_genes)
        shared_mechs = sorted(a_mechs & f_mechs)
        # Two genes on the same axis are one hypothesis: PD-1 and PD-L1, VEGF and its receptor.
        # Reading the symbols literally would call pembrolizumab a different hypothesis from a
        # PD-L1 antibody, which is wrong in the only sense that matters to the buyer.
        shared_classes = sorted(a_classes & set(classes_for(f_genes, area)))
        if shared_genes and same_modality:
            verdict, why = "closest", "same target and same modality"
        elif shared_genes and not asset.get("modality"):
            # A target was asked about, not a molecule. Sharing the target is the whole of what was
            # asked, so "different modality" would answer a question nobody put.
            verdict, why = "closest", "same target"
        elif shared_genes:
            verdict, why = "related", "same target, different modality"
        elif shared_classes:
            verdict = "related"
            why = (f"same pathway ({shared_classes[0]}), different target"
                   + (", same modality" if same_modality else ""))
        elif shared_mechs:
            verdict, why = "related", "different target, overlapping mechanism"
        elif same_modality:
            verdict, why = "weak", "same modality only — no target in common"
        else:
            verdict, why = "distant", "no target, mechanism or modality in common"
        if not (f.get("target_genes") or f.get("mechanisms")):
            verdict, why = "unknown", "this molecule's target could not be resolved, so no comparison is possible"
        out.append({
            "asset": f["asset"], "modalities": f.get("modalities") or [], "sponsors": f.get("sponsors") or [],
            "trial_count": f.get("trial_count"), "trials": f.get("trials") or [],
            "shared_target_genes": shared_genes, "shared_mechanisms": shared_mechs,
            "shared_classes": shared_classes,
            "same_modality": same_modality, "verdict": verdict, "why": why,
        })
    order = {"closest": 0, "related": 1, "weak": 2, "distant": 3, "unknown": 4}
    return sorted(out, key=lambda r: (order[r["verdict"]], -(r["trial_count"] or 0)))

OUT_DIR = ROOT / "product/evidence_packages"
MODALITY_WORD = {"Antibody": "a monoclonal antibody", "Small molecule": "a small molecule",
                 "Protein": "an engineered protein", "Peptide": "a peptide",
                 "Oligonucleotide": "an oligonucleotide", "Cell therapy": "a cell therapy",
                 "Gene therapy": "a gene therapy", "Vaccine": "a vaccine"}
VERDICT_LABEL = {"closest": "Same target, same modality", "related": "Related",
                 "weak": "Same modality only", "distant": "Different hypothesis",
                 "unknown": "Cannot be compared"}
# The stopped trials are the evidence and are always listed in full. The trials still running
# and the unreadable terminations are context: PD-(L)1 has 3,376 open trials, and a table of
# them is a data dump rather than a report. They are counted in full, listed in part, and the
# complete cohort ships as the CSV beside this document.
MAX_CONTEXT_ROWS = 25
# The brief's own cap on the stop table (scripts/briefs/build_brief.py MAX_ROWS).
BRIEF_MAX_ROWS = 6

ATTRIBUTION_LABEL = {
    "own_data": "This trial's own data",
    "programme_cascade": "A decision taken elsewhere",
    "unclear": "Not established",
}


def months_between(start: str | None, end: str | None) -> int | None:
    """How long a trial ran before it stopped.

    A programme halted at eight months and one halted at four years are different pieces of
    evidence about the same mechanism, and the registry gives both dates.
    """
    if not start or not end:
        return None
    try:
        a = datetime.strptime(start[:7], "%Y-%m")
        b = datetime.strptime(end[:7], "%Y-%m")
    except ValueError:
        return None
    months = (b.year - a.year) * 12 + (b.month - a.month)
    return months if months >= 0 else None


def e(x) -> str:
    return html.escape(str(x if x is not None else ""))


def pct(x, digits=1) -> str:
    return "—" if x is None else f"{x * 100:.{digits}f}%"


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")


def cohort_rules(args, area: str) -> list[dict]:
    """Every rule that decides membership, written out. No rule is applied that is not listed."""
    rules = [
        {"rule": "Source", "value": "ClinicalTrials.gov, weekly build",
         "note": "Every eligible registration. Not every trial ever run."},
        {"rule": "Disease area", "value": area,
         "note": "Multi-label tag from conditions and MeSH terms."
                 + ("" if area == "Oncology" else " Trials also tagged Oncology are excluded, because cancer "
                    "trials appear under most areas and would otherwise dominate the rate.")},
        {"rule": "Phase", "value": f"Phase {args.phases}",
         "note": "Phase 1/2 counts as Phase 2; Phase 2/3 counts as Phase 3."},
        {"rule": "Start window", "value": f"{args.start.replace(':', '–')}",
         "note": "Trial start date, not registration date."},
    ]
    if args.klass:
        rules.append({"rule": "Mechanism class", "value": args.klass,
                      "note": "Any experimental-arm drug resolving to a target gene in this class. Comparator and "
                              "background drugs do not qualify a trial."})
    if args.with_class:
        rules.append({"rule": "Combination partner", "value": args.with_class,
                      "note": "Required anywhere in the regimen, including as a backbone in both arms."})
    if args.genes:
        rules.append({"rule": "Target genes", "value": args.genes, "note": "Experimental-arm drugs only."})
    if args.sponsor_group:
        rules.append({"rule": "Sponsor", "value": args.sponsor_group, "note": "Resolved sponsor group, not the raw field."})
    rules += [
        {"rule": "Denominator", "value": "Closed trials: completed or terminated",
         "note": "Withdrawn (never enrolled), suspended, ongoing and unknown-status trials are excluded — their "
                 "outcome is not observed yet."},
        {"rule": "Numerator", "value": "Terminated for an efficacy, safety or benefit–risk reason",
         "note": "From the registry's own stop-reason text, classified by deterministic rules."},
    ]
    return rules


def build(args) -> dict:
    rows = load(args.area)
    phases = [p.strip() for p in args.phases.split(",")]
    start = tuple(int(x) for x in args.start.split(":"))
    common = dict(phases=phases, start=start)
    genes = [g.strip() for g in args.genes.split(",")] if args.genes else None

    cohort = select(rows, klass=args.klass, with_class=args.with_class, genes=genes,
                    sponsor_group=args.sponsor_group, modality=args.modality, **common)
    if not cohort:
        raise SystemExit("No trials match that cohort.")
    seg = summarize(cohort)
    base_rows = select(rows, **common)
    resolved = [r for r in base_rows if r["_genes"]]
    comparator = summarize(resolved if (args.klass or genes) else base_rows)
    comparator_label = (f"all {args.area.lower()} trials with a resolved drug target"
                        if (args.klass or genes) else f"all {args.area.lower()} Phase {args.phases} trials")

    stops = sorted([r for r in cohort if r["_bio"]], key=lambda r: (r.get("stop_date_estimate") or ""), reverse=True)
    attribution = attribute_all(stops)
    sig = signature(stops, area=args.area, klass=args.klass)
    attr_by_nct = {a["nct_id"]: a for a in attribution}
    attr_summary = summarise(attribution)

    # Terminations we could not read, listed rather than hidden: the buyer decides what to do
    # with them, and the upper edge of the band assumes every one was biological.
    unreadable = [r for r in cohort
                  if r.get("overall_status") == "TERMINATED"
                  and r.get("classification_outcome_v2") in ("CAUSE_NOT_STATED", "UNKNOWN")]
    open_trials = [r for r in cohort if not r["_closed"] and r.get("overall_status") != "WITHDRAWN"]

    # The other way a drug fails: it finishes the trial and misses. A discontinuation rate cannot
    # see that, and in some fields it is nearly the whole story. Only COMPLETED trials are read —
    # a still-recruiting study that posted an interim analysis is not a finished answer — and only
    # the sponsor's own posted primary superiority comparison counts. See endpoint_outcomes.py.
    verdicts = load_verdicts()
    completed = [r for r in cohort if r.get("overall_status") == "COMPLETED"]
    endpoint_of = {r["nct_id"]: verdicts[r["nct_id"]] for r in completed
                   if verdicts.get(r["nct_id"], {}).get("endpoint_verdict") in ("MISSED", "MET", "MIXED")}
    missed = sorted([r for r in completed if endpoint_of.get(r["nct_id"], {}).get("endpoint_verdict") == "MISSED"],
                    key=lambda r: (r.get("start_date") or ""), reverse=True)
    # A trial whose sponsor stopped updating is not running; it is unaccounted for. It stays in the
    # count because it is still in the cohort, but a reader asking "how much is still to come"
    # deserves to know how much of the answer is registry rot.
    stale_open = [r for r in open_trials if (r.get("overall_status") or "") == "UNKNOWN"]

    def trial_row(r, kind):
        a = attr_by_nct.get(r["nct_id"], {})
        drugs = sorted({c.get("name") or c.get("label") for i in r["interventions"] if i["role"] == "EXPERIMENTAL_ARM"
                        for c in i["components"] if c.get("name") or c.get("label")})
        return {
            "nct_id": r["nct_id"], "kind": kind,
            "title": r.get("brief_title"), "phase": "3" if "3" in r["_phase"] else "2",
            "status": r.get("overall_status"),
            "sponsor": r["_sponsor_group"], "sponsor_class": r.get("lead_sponsor_class"),
            "experimental_drugs": drugs[:6],
            "start": (r.get("start_date") or "")[:7],
            "stopped": (r.get("stop_date_estimate") or "")[:7],
            "enrollment": r.get("enrollment_count"),
            "enrollment_type": r.get("enrollment_type"),
            "months_to_stop": months_between(r.get("start_date"), r.get("stop_date_estimate")),
            "has_results": bool(r.get("has_results")),
            "why_stopped": " ".join((r.get("why_stopped") or "").split()),
            "endpoint": (endpoint_of.get(r["nct_id"]) or {}).get("endpoint_verdict"),
            "endpoint_analyses": (endpoint_of.get(r["nct_id"]) or {}).get("analyses") or [],
            # What the posted results say, with the sentence or the numbers it was read from — for
            # every listed trial, stopped ones included: a stop "for futility" with a posted
            # primary comparison has its evidence next to the word.
            "endpoint_evidence": evidence_of(verdicts.get(r["nct_id"])),
            "results_url": results_url(r["nct_id"]),
            "attribution": a.get("attribution"), "attribution_basis": a.get("basis"),
            "attribution_evidence": a.get("cascade_evidence") or a.get("own_data_evidence") or [],
            "sibling_stops": a.get("sibling_stops") or [],
            "registry_url": f"https://clinicaltrials.gov/study/{r['nct_id']}",
        }

    name = " ".join(x for x in [args.klass or args.genes or args.sponsor_group or args.modality or args.area,
                                f"+ {args.with_class}" if args.with_class else ""] if x).strip()
    p_value = binom_sf(seg["biological_stops"], seg["closed"], comparator["rate"] or 0.0)

    return {
        "schema_version": 1,
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cohort": name,
        "area": args.area,
        "window": {"phases": phases, "start_from": start[0], "start_to": start[1]},
        "cohort_rules": cohort_rules(args, args.area),
        "headline": {
            "rate": seg["rate"], "ci95": seg["ci95"],
            "biological_stops": seg["biological_stops"], "closed": seg["closed"], "trials": seg["trials"],
            "closed_share": seg["closed_share"],
            "comparator_label": comparator_label, "comparator_rate": comparator["rate"],
            "comparator_stops": comparator["biological_stops"], "comparator_closed": comparator["closed"],
            "p_value_vs_comparator": p_value,
        },
        "failure_signature": sig,
        "attribution": {
            **attr_summary,
            "method": "A stop counts as this trial's own when the registry text describes a finding in this trial. "
                      "It counts as a decision taken elsewhere when the text points outward — to another study, a "
                      "programme or development halt, or a named upstream trial — or when other trials of the same "
                      "sponsor-asset programme stopped within eight months and the text says nothing either way. "
                      "What the sponsor wrote beats the structural signal. 'Not established' is a real answer.",
            "why_it_matters": "A rate counts records. A decision to abandon a molecule can close several trials at "
                              "once, and those records are not independent evidence about the mechanism.",
        },
        "concentration": {
            "stop_programmes": seg["stop_programmes"], "stop_sponsors": seg["stop_sponsors"],
            "stop_assets": seg["stop_assets"], "largest_programme": seg["largest_programme"],
            "largest_programme_stops": seg["largest_programme_stops"],
            "rate_leave_one_programme_out": seg["rate_leave_one_programme_out"],
        },
        "ambiguity": {
            "unresolved_terminations": seg["unresolved_terminations"],
            "rate_if_all_unresolved_were_biological": seg["rate_if_all_unresolved_were_biological"],
        },
        "time_to_event": curve(cohort),
        "comparator_time_to_event": curve(resolved if (args.klass or genes) else base_rows),
        "trials": ([trial_row(r, "biological_stop") for r in stops]
                   + [trial_row(r, "endpoint_miss") for r in missed[:MAX_CONTEXT_ROWS]]
                   + [trial_row(r, "terminated_cause_not_readable") for r in unreadable[:MAX_CONTEXT_ROWS]]
                   + [trial_row(r, "still_open") for r in
                      sorted(open_trials, key=lambda r: (r.get("start_date") or ""), reverse=True)[:MAX_CONTEXT_ROWS]]),
        "counts": {"stopped": len(stops), "unreadable_terminations": len(unreadable),
                   "still_open": len(open_trials), "total_in_cohort": len(cohort),
                   # What the rate and the curve are computed over, and what the document lists
                   # trial by trial, are not the same number: every stop is listed, the other two
                   # groups are capped so one huge cohort cannot bloat the delivery.
                   "open_status_not_updated": len(stale_open),
                   "listed_unreadable": len(unreadable[:MAX_CONTEXT_ROWS]),
                   "listed_open": len(open_trials[:MAX_CONTEXT_ROWS]),
                   # What the free brief shows of the same cohort. The difference between the two
                   # documents is worth stating as a number, and a number nobody computes drifts.
                   "brief_lists_stops": min(len(stops), BRIEF_MAX_ROWS),
                   "endpoint_missed": sum(1 for v in endpoint_of.values() if v["endpoint_verdict"] == "MISSED"),
                   "endpoint_readable": len(endpoint_of),
                   "listed_endpoint_misses": len(missed[:MAX_CONTEXT_ROWS])},
        "endpoints": {
            "read": bool(verdicts),
            "completed": len(completed),
            "readable": len(endpoint_of),
            "missed": sum(1 for v in endpoint_of.values() if v["endpoint_verdict"] == "MISSED"),
            "met": sum(1 for v in endpoint_of.values() if v["endpoint_verdict"] == "MET"),
            "mixed": sum(1 for v in endpoint_of.values() if v["endpoint_verdict"] == "MIXED"),
            "from_sponsor_statement": sum(1 for v in endpoint_of.values() if v.get("basis") == "sponsor_statement"),
            "missed_sponsors": len({r["_sponsor_group"] for r in missed}),
            "read_on": read_on(),
            **{f"results_{k}": v for k, v in disclosure_gap(completed).items()},
            "method": "Only trials the sponsor completed and posted results for. A sentence in the posted results "
                      "saying this trial did not meet its primary endpoint decides it. Otherwise: only outcome "
                      "measures typed PRIMARY that measure efficacy, only between-group comparisons that are not "
                      "non-inferiority or equivalence tests, and only a p-value held to the threshold the sponsor "
                      "wrote down — 0.05 where it wrote none — or, with no p-value, a two-sided 95% interval "
                      "against no effect. A failed non-inferiority test is a different event and is never counted "
                      "here.",
            "why_it_matters": "A discontinuation rate only sees trials that were stopped. A drug that runs its "
                              "trial to the end and misses is the more common failure in several fields, and the "
                              "registry records it.",
        },
        "sources": ["ClinicalTrials.gov (NLM)", "ChEMBL (EMBL-EBI, CC BY-SA 3.0)", "NCI Thesaurus (NCI)",
                    "RxNorm/RxClass (NLM)", "SEC EDGAR"],
        "limits": [
            "This describes registry records for trials that have closed. It is not a forecast for any asset.",
            "The rate is not a failure rate: a trial that ran to completion and missed its endpoint is not in it. "
            "Those trials are listed separately where the sponsor posted a result that can be read, each with the "
            "numbers or the sentence it was read from; most posted nothing readable, so the missed-endpoint count "
            "is a floor and not a rate.",
            "Comparisons are unadjusted. Indication, line of therapy, biomarker selection and development era are "
            "not matched between this cohort and its comparator.",
            "Extraction, classification and attribution are automated. No clinician has reviewed these records.",
            "Sponsors differ several-fold in how often they record a readable cause, so part of any difference "
            "between cohorts is a difference in disclosure.",
        ],
    }


# ---------------------------------------------------------------------------
# Charts, drawn as inline SVG.
#
# A buyer reading a discontinuation analysis expects to see the curve, not a table of five
# numbers standing in for one. These are drawn rather than plotted because the document has to
# survive being printed, emailed and opened offline: no script, no font, no request.
#
# Encoding is emphasis, not identity — this cohort in the accent colour, the comparator in grey.
# Two categorical hues would say the two series are peers; they are not. The comparator is the
# thing the cohort is being read against, and grey says that without a legend having to.
# ---------------------------------------------------------------------------
CHART_INK = "#5b6470"
CHART_FOCUS = "#4f46e5"
CHART_REF = "#64748b"


def _steps(points: list[tuple[float, float]], x, y) -> str:
    """A step path: a cumulative incidence curve holds its value until the next event time."""
    if not points:
        return ""
    d = f"M {x(0):.1f} {y(0):.1f}"
    last = 0.0
    for months, value in points:
        d += f" L {x(months):.1f} {y(last):.1f} L {x(months):.1f} {y(value):.1f}"
        last = value
    return d


def incidence_chart(cif: dict, base_cif: dict, cohort: str, comparator: str) -> str:
    """Probability of a biological stop over time, against the comparator's own curve."""
    months = sorted(cif)
    if not months:
        return ""
    W, H = 640, 260
    L, R, T, B = 46, 108, 14, 34
    top = max([cif[m]["ci95"][1] for m in months] + [cif[m]["cif"] for m in months]
              + [base_cif.get(m, {}).get("cif") or 0 for m in months] + [0.02])
    top = min(1.0, top * 1.12)
    x_max = months[-1]

    def x(v):
        return L + (v / x_max) * (W - L - R)

    def y(v):
        return H - B - (v / top) * (H - T - B)

    def step_points(bound: int, reverse: bool = False) -> list[str]:
        out, last = [], 0.0
        for m in months:
            value = cif[m]["ci95"][bound]
            out.append(f"{x(m):.1f},{y(last):.1f}")
            out.append(f"{x(m):.1f},{y(value):.1f}")
            last = value
        out.append(f"{x(months[-1]):.1f},{y(last):.1f}")
        return list(reversed(out)) if reverse else out

    band_top = " ".join(step_points(1))
    band_bottom = " ".join(step_points(0, reverse=True))

    grid = ""
    ticks = [0, top / 2, top]
    for value in ticks:
        grid += (f"<line x1='{L}' y1='{y(value):.1f}' x2='{W - R}' y2='{y(value):.1f}' "
                 f"stroke='#e2e0da' stroke-width='1'/>"
                 f"<text x='{L - 8}' y='{y(value) + 3.5:.1f}' text-anchor='end' font-size='10' "
                 f"fill='{CHART_INK}'>{pct(value, 0)}</text>")
    for m in months:
        grid += (f"<text x='{x(m):.1f}' y='{H - B + 15}' text-anchor='middle' font-size='10' "
                 f"fill='{CHART_INK}'>{m}</text>")
    grid += (f"<text x='{(L + W - R) / 2:.1f}' y='{H - 4}' text-anchor='middle' font-size='10' "
             f"fill='{CHART_INK}'>months since trial start</text>")

    last = months[-1]
    labels = (f"<text x='{x(last) + 8:.1f}' y='{y(cif[last]['cif']) + 3.5:.1f}' font-size='11' "
              f"font-weight='700' fill='{CHART_FOCUS}'>{pct(cif[last]['cif'])}</text>"
              f"<text x='{x(last) + 8:.1f}' y='{y(cif[last]['cif']) + 16:.1f}' font-size='9.5' "
              f"fill='{CHART_INK}'>this cohort</text>")
    base_last = base_cif.get(last, {}).get("cif")
    if base_last is not None:
        labels += (f"<text x='{x(last) + 8:.1f}' y='{y(base_last) + 3.5:.1f}' font-size='11' "
                   f"font-weight='700' fill='{CHART_REF}'>{pct(base_last)}</text>"
                   f"<text x='{x(last) + 8:.1f}' y='{y(base_last) + 16:.1f}' font-size='9.5' "
                   f"fill='{CHART_INK}'>comparator</text>")

    base_path = _steps([(m, base_cif[m]["cif"]) for m in months if m in base_cif], x, y)
    return (f"<figure class='chart'><svg viewBox='0 0 {W} {H}' width='100%' role='img' "
            f"aria-label='Cumulative incidence of a biological stop in {e(cohort)} against {e(comparator)}'>"
            f"{grid}"
            f"<polygon points='{band_top} {band_bottom}' fill='{CHART_FOCUS}' opacity='0.12'/>"
            + (f"<path d='{base_path}' fill='none' stroke='{CHART_REF}' stroke-width='2' "
               f"stroke-dasharray='5 4'/>" if base_path else "")
            + f"<path d='{_steps([(m, cif[m]['cif']) for m in months], x, y)}' fill='none' "
              f"stroke='{CHART_FOCUS}' stroke-width='2.4' stroke-linejoin='round'/>"
              f"{labels}"
              f"<line x1='{L}' y1='{y(0):.1f}' x2='{W - R}' y2='{y(0):.1f}' stroke='#c9c6bd' stroke-width='1'/>"
              f"</svg><figcaption>Shaded band: 95% confidence interval for this cohort. Dashed: {e(comparator)}. "
              f"The table below is the same figures, for reading and for quoting.</figcaption></figure>")


def interpretation(pkg: dict) -> list[str]:
    """Our reading, kept apart from the facts above and labelled as ours."""
    h, a, c = pkg["headline"], pkg["attribution"], pkg["concentration"]
    out = []
    review = pkg.get("asset_under_review")
    comparison = pkg.get("asset_comparison") or []
    if review and comparison:
        close = [c for c in comparison if c["verdict"] == "closest"]
        related = [c for c in comparison if c["verdict"] == "related"]
        distant = [c for c in comparison if c["verdict"] in ("weak", "distant")]
        head = f"{review['asset']} is {MODALITY_WORD.get(review.get('modality'), review.get('modality') or 'of unknown modality')}"
        head += (f" against {', '.join(review['target_genes'][:4])}" if review.get("target_genes") else "")
        if close:
            head += (f". {len(close)} of the {len(comparison)} molecules that failed here share its target and its "
                     f"modality ({', '.join(c['asset'] for c in close)}) — that history is the one to be able to "
                     f"answer for.")
        elif related:
            head += (f". None of the {len(comparison)} molecules that failed here share both its target and its "
                     f"modality; {len(related)} are related on one of the two.")
        elif [c for c in comparison if c["verdict"] == "weak"]:
            # Sharing a modality and nothing else is worth saying plainly: four antibodies
            # failing against a different target is not evidence about this antibody's target.
            head += (f". None of the {len(comparison)} molecules that failed here share its target. They share only "
                     f"its modality, against a different target, so this cohort says little about the hypothesis "
                     f"under review and a good deal about how hard the modality is in this disease.")
        else:
            head += (f". None of the {len(comparison)} molecules that failed here share its target or its modality, "
                     f"so this cohort is weak evidence about it either way.")
        if distant and (close or related):
            head += f" {len(distant)} of them test a different hypothesis altogether."
        out.append(head)
        out.append("That comparison is structural: modality, target and mechanism, read off the same index that resolved "
                   "the trials. It says nothing about " + ", ".join(pkg.get("asset_not_compared") or []) + ", and those "
                   "are usually what decides whether a historical failure transfers. They are the questions to take into "
                   "the meeting, not ones this report answers.")
    elif review and not comparison:
        out.append(f"We could not resolve \"{review.get('query')}\" to a known molecule, so no comparison against the "
                   f"failed assets is included. Send a ChEMBL id, an INN or a research code and we will redo it.")
    ep = pkg.get("endpoints") or {}
    stops = h["biological_stops"]
    # Some cohorts fail at the end rather than by being stopped. Their reading starts there, and
    # the stop-attribution sentences below are skipped when there is nothing to attribute.
    if ep.get("missed") and ep["missed"] > stops:
        out.append(f"This cohort fails at the end rather than by being stopped: {ep['missed']} of {ep['readable']} "
                   f"completed trials with a readable primary result missed it, across "
                   f"{ep.get('missed_sponsors', '?')} sponsors, against {stops} stopped early for a biological reason. "
                   f"They are listed under \"Ran to the end and missed\", each with the result it was read from. A missed "
                   f"endpoint is not a verdict on the molecule — dose, population, endpoint and comparator decide it too.")
    sig = pkg["failure_signature"]
    if sig["molecules"] and sig["molecules"] < sig["stops"]:
        out.append(sig["sentence"] + " A rate counts registry records; those records are "
                   f"{sig['molecules']} development programmes, and the question for an asset under review is "
                   "whether it shares the molecule, the target epitope, the population or the endpoint of the ones "
                   "that failed.")
    elif sig["molecules"]:
        out.append(sig["sentence"])
    ratio = (h["rate"] / h["comparator_rate"]) if h["comparator_rate"] else 0
    out.append(f"{h['biological_stops']} of {h['closed']} closed trials in this cohort were terminated for a "
               f"biological reason: {pct(h['rate'])} against {pct(h['comparator_rate'])} for {h['comparator_label']}"
               + (f", {ratio:.1f}× that rate." if ratio >= 1.2 else "."))
    if not stops:
        pass
    elif a["stops_from_programme_cascade"]:
        out.append(f"{a['stops_from_own_data']} of those stops were the trial's own verdict; "
                   f"{a['stops_from_programme_cascade']} followed a decision taken elsewhere"
                   + (f", and {a['stops_unclear']} cannot be established from the record." if a["stops_unclear"] else ".")
                   + " The cohort is weaker evidence about the mechanism than the count of records suggests: the "
                     "question to take into a diligence meeting is whether the asset under review shares the "
                     "molecule, the population or the endpoint of the programmes that failed.")
    else:
        out.append(f"All {a['stops_from_own_data']} stops we could attribute were the trial's own verdict rather than "
                   f"a consequence of a decision elsewhere, which makes the cohort unusually clean evidence for its size.")
    if stops:
        out.append(f"The stops came from {c['stop_programmes']} sponsor–asset programmes across {c['stop_sponsors']} "
               f"sponsors"
               + (f"; removing the largest ({c['largest_programme']}, {c['largest_programme_stops']} {'stop' if c['largest_programme_stops'] == 1 else 'stops'}) leaves "
                  f"{pct(c['rate_leave_one_programme_out'])}." if c["rate_leave_one_programme_out"] is not None else "."))
    if pkg["ambiguity"]["unresolved_terminations"]:
        out.append(f"{pkg['ambiguity']['unresolved_terminations']} further closed trials were terminated with no cause "
                   f"we can read. They are listed below rather than dropped; if every one were biological the rate "
                   f"would be {pct(pkg['ambiguity']['rate_if_all_unresolved_were_biological'])}, which is the upper "
                   f"edge of the honest band.")
    if h["closed_share"] is not None and h["closed_share"] < 0.5:
        out.append(f"Only {pct(h['closed_share'], 0)} of the cohort has closed. Trials that stop early close sooner "
                   f"than trials that run to completion, so a rate read this early tends to overstate; the "
                   f"time-to-event figures are the ones to use.")
    return out


ENDPOINT_LABEL = {"MISSED": "missed", "MET": "met", "MIXED": "split"}


def evidence_html(ev: dict | None, compact: bool = False) -> str:
    """The posted result in words: the sponsor's sentence first, then the numbers and their bar."""
    if not ev:
        return "<span class='muted'>—</span>"
    parts = []
    if compact:
        parts.append(f"<div class='evid'><b>Posted primary result: {e(ENDPOINT_LABEL[ev['verdict']])}.</b> ")
        if ev.get("statement"):
            parts.append(f"&ldquo;{e(ev['statement']['text'])}&rdquo;")
        elif ev.get("lines"):
            # The stop table is narrow: the endpoint and the number, the full line is in the miss table
            # and on the results tab.
            line = ev["lines"][0]
            parts.append(e(line if len(line) <= 170 else line[:170].rsplit(" ", 1)[0] + "…"))
        parts.append("</div>")
        return "".join(parts)
    if ev.get("statement"):
        parts.append(f"<div class='quote'>&ldquo;{e(ev['statement']['text'])}&rdquo; "
                     f"<span class='muted'>— sponsor, {e(ev['statement']['where'])}</span></div>")
        if ev.get("statistical_verdict") in ("MET", "MIXED"):
            parts.append("<div class='muted small'>The posted numbers alone would read "
                         f"{e(ENDPOINT_LABEL[ev['statistical_verdict']])}; the sponsor's statement is taken over them, "
                         "because it knows the testing rule and the numbers do not carry it.</div>")
    for line in ev.get("lines") or []:
        parts.append(f"<div class='evline'>{e(line)}</div>")
    if ev.get("more"):
        parts.append(f"<div class='muted small'>and {ev['more']} more comparison(s) on the results tab.</div>")
    for rule in ev.get("rules") or []:
        parts.append(f"<div class='muted small'>The sponsor on the test: &ldquo;{e(rule)}&rdquo;</div>")
    return "".join(parts)


def render_html(pkg: dict, notes: list[str]) -> str:
    h, a, c = pkg["headline"], pkg["attribution"], pkg["concentration"]
    ep_ = pkg.get("endpoints") or {}
    # A cohort that fails at the end leads with that, as its brief does.
    headline_text = (f"{ep_['missed']} of {ep_['readable']} completed trials missed their primary endpoint"
                     if ep_.get("missed") and ep_["missed"] > h["biological_stops"]
                     else pkg["failure_signature"]["headline"])
    cif = {x["months"]: x for x in (pkg["time_to_event"].get("cif") or [])}
    base_cif = {x["months"]: x for x in (pkg["comparator_time_to_event"].get("cif") or [])}

    rules = "".join(f"<tr><td><b>{e(r['rule'])}</b></td><td>{e(r['value'])}</td>"
                    f"<td class='muted'>{e(r['note'])}</td></tr>" for r in pkg["cohort_rules"])

    def trial_block(kind, heading, blurb):
        rows = [t for t in pkg["trials"] if t["kind"] == kind]
        if not rows:
            return ""
        body = ""
        for t in rows:
            attr = ""
            if t["attribution"]:
                cls = {"own_data": "own", "programme_cascade": "casc", "unclear": "unk"}[t["attribution"]]
                ev = "; ".join(t["attribution_evidence"])
                attr = (f"<div class='attr {cls}'>{e(ATTRIBUTION_LABEL[t['attribution']])}"
                        + (f" <span class='muted'>— {e(ev)}</span>" if ev else "")
                        + (f" <span class='muted'>— decided with {e(', '.join(t['sibling_stops']))}</span>"
                           if t["sibling_stops"] and t["attribution_basis"] == "structural" else "")
                        + "</div>")
            size = (f"{t['enrollment']:,}" if isinstance(t["enrollment"], int) else "—")
            if t.get("enrollment_type") == "ESTIMATED":
                size += "<span class='muted'> planned</span>"
            ran = (f"{t['months_to_stop']} mo" if t.get("months_to_stop") is not None else "—")
            posted = "yes" if t.get("has_results") else "no"
            ev = t.get("endpoint_evidence")
            if ev:
                posted = (f"<a href='{e(t['results_url'])}'>{e(ENDPOINT_LABEL[ev['verdict']])}</a>")
            evidence = evidence_html(ev, compact=True) if ev else ""
            body += (f"<tr><td class='mono'><a href='{e(t['registry_url'])}'>{e(t['nct_id'])}</a></td>"
                     f"<td>{e(t['phase'])}</td><td>{e(t['sponsor'])}</td>"
                     f"<td>{e(', '.join(t['experimental_drugs']) or '—')}</td>"
                     f"<td class='num'>{size}</td>"
                     f"<td class='num'>{ran}</td>"
                     f"<td class='num muted'>{posted}</td>"
                     f"<td class='num'>{e(t['stopped'] or t['start'])}</td>"
                     f"<td>{e(t['why_stopped']) or '<span class=muted>no reason recorded</span>'}{attr}{evidence}</td></tr>")
        return (f"<h2>{e(heading)} <span class='count'>{len(rows)}</span></h2><p class='sub'>{e(blurb)}</p>"
                f"<table><thead><tr><th>Trial</th><th>Ph</th><th>Sponsor</th><th>Experimental drugs</th>"
                f"<th class='num'>Enrolled</th><th class='num'>Ran for</th><th class='num'>Results</th>"
                f"<th>Date</th><th>Registry record</th></tr></thead><tbody>{body}</tbody></table>")

    def endpoint_block():
        ep = pkg.get("endpoints") or {}
        if not ep.get("read") or not ep.get("readable"):
            return ""
        rows = [t for t in pkg["trials"] if t["kind"] == "endpoint_miss"]
        body = ""
        for t in rows:
            size = (f"{t['enrollment']:,}" if isinstance(t["enrollment"], int) else "—")
            body += (f"<tr><td class='mono'><a href='{e(t['registry_url'])}'>{e(t['nct_id'])}</a>"
                     f"<div class='muted small'><a href='{e(t['results_url'])}'>results tab</a></div></td>"
                     f"<td>{e(t['phase'])}</td><td>{e(t['sponsor'])}</td>"
                     f"<td>{e(', '.join(t['experimental_drugs']) or '—')}</td>"
                     f"<td class='num'>{size}</td><td class='num'>{e(t['start'])}</td>"
                     f"<td>{evidence_html(t.get('endpoint_evidence'))}</td></tr>")
        table = (f"<table><thead><tr><th>Trial</th><th>Ph</th><th>Sponsor</th><th>Experimental drugs</th>"
                 f"<th class='num'>Enrolled</th><th class='num'>Started</th>"
                 f"<th>What the posted results say</th></tr></thead><tbody>{body}</tbody></table>"
                 if body else "")
        more = (f" The {MAX_CONTEXT_ROWS} most recently started are listed."
                if ep["missed"] > MAX_CONTEXT_ROWS else "")
        gap = (f" {ep['results_not_posted']} of the {ep['results_due']} completed trials that finished more than a "
               f"year ago have posted no results at all — a gap in what can be known, not a sign of failure."
               if ep.get("results_due") else "")
        stated = (f" {ep['from_sponsor_statement']} of the misses rest on the sponsor's own sentence rather than the "
                  f"numbers." if ep.get("from_sponsor_statement") else "")
        read = f" Read from ClinicalTrials.gov on {e(ep['read_on'])}." if ep.get("read_on") else ""
        return (f"<h2>Ran to the end and missed <span class='count'>{ep['missed']}</span></h2>"
                f"<p class='sub'>Of {ep['completed']} completed trials in this cohort, {ep['readable']} posted a "
                f"primary result that can be read: <b>{ep['missed']}</b> missed, {ep['met']} met"
                + (f", {ep['mixed']} split across co-primaries" if ep["mixed"] else "")
                + f".{stated} {e(ep['method'])} The rest posted nothing readable, so this is a floor, not a rate."
                + f"{gap}{more}{read}</p>"
                + "<p class='sub'>Each row carries what the verdict was read from — the sponsor's sentence, or the "
                  "posted comparison with the threshold it was held to — and a link to the trial's results tab, so a "
                  "row can be checked without being reconstructed. A missed endpoint is not a verdict on the "
                  "molecule: dose, population, endpoint and comparator all decide it too.</p>"
                + table)

    review = pkg.get("asset_under_review")
    comparison = pkg.get("asset_comparison") or []
    if comparison and review:
        rows = "".join(
            f"<tr><td class='strong'>{e(c['asset'])}</td>"
            f"<td><span class='verdict v-{c['verdict']}'>{e(VERDICT_LABEL[c['verdict']])}</span></td>"
            f"<td class='muted'>{e(c['why'])}"
            + (f"<br>shared targets: {e(', '.join(c['shared_target_genes']))}" if c["shared_target_genes"] else "")
            + f"</td><td class='muted'>{e(', '.join(c['modalities']) or '—')}</td>"
              f"<td class='num'>{c['trial_count']}</td></tr>"
            for c in comparison)
        comparison_block = (
            f"<h2>{e(review['asset'])} against the molecules that failed</h2>"
            f"<p class='sub'>{e(review['asset'])}"
            + (f" — {e(', '.join(review['target_genes'][:6]))}" if review.get("target_genes") else "")
            + (f", {e(review['modality'])}" if review.get("modality") else "")
            + (f", ChEMBL {e(review['chembl_id'])}" if review.get("chembl_id") else "") + ".</p>"
            f"<table><thead><tr><th>Molecule that failed</th><th>Relation</th><th>On what</th>"
            f"<th>Modality</th><th class='num'>Trials</th></tr></thead><tbody>{rows}</tbody></table>"
            f"<div class='box'><b>What this comparison does not cover.</b> It is structural — modality, target and "
            f"mechanism, read off the same index that resolved the trials. It says nothing about "
            f"{e(', '.join(pkg.get('asset_not_compared') or []))}, and those are usually what decides whether a "
            f"historical failure transfers. Treat the rows above as the shortlist of precedents to argue about, not as "
            f"a verdict.</div>")
    elif review:
        comparison_block = (f"<h2>Asset under review</h2><p class='sub'>We could not resolve "
                            f"&ldquo;{e(review.get('query'))}&rdquo; to a known molecule, so no comparison is included. "
                            f"A ChEMBL id, an INN or a research code would let us build it.</p>")
    else:
        # The slot the delivery route splices the buyer's comparison into. Built here rather than
        # appended there so the section lands in the right place in the document, not at the end.
        comparison_block = "<!--ASSET_COMPARISON-->"

    incidence_figure = incidence_chart(cif, base_cif, pkg["cohort"], h["comparator_label"])
    cif_rows = "".join(
        f"<tr><td>{m} months</td><td class='num'><b>{pct(cif[m]['cif'])}</b></td>"
        f"<td class='num muted'>{pct(cif[m]['ci95'][0])}–{pct(cif[m]['ci95'][1])}</td>"
        f"<td class='num muted'>{pct(base_cif.get(m, {}).get('cif'))}</td>"
        f"<td class='num muted'>{cif[m]['n_risk']}</td></tr>" for m in sorted(cif))

    return f"""<!doctype html><html><head><meta charset="utf-8">
<title>{e(pkg['cohort'])} — diligence report</title><style>
:root {{ --ink:#14161a; --ink2:#5b6470; --line:#e2e0da; --bg:#fbfaf7; --acc:#4f46e5; }}
* {{ box-sizing:border-box; }}
body {{ font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  color:var(--ink); background:var(--bg); margin:0; padding:40px 24px; }}
.sheet {{ max-width:1000px; margin:0 auto; }}
figure.chart {{ margin:14px 0 0; padding:0; break-inside:avoid; }}
figure.chart svg {{ display:block; max-width:660px; }}
figure.chart figcaption {{ font-size:11px; color:var(--ink2); margin-top:6px; max-width:660px; line-height:1.5; }}
@page {{ size:A4; margin:16mm 14mm 18mm; }}
@media print {{
  body {{ background:#fff; padding:0; }}
  h2 {{ break-after:avoid; }}
  /* Rows, not tables. Telling a twenty-row table not to break pushes the whole thing to the
     next page and leaves the current one blank under its own heading. */
  tr {{ break-inside:avoid; }}
  thead {{ display:table-header-group; }}
  figure.chart, .box {{ break-inside:avoid; }}
  a[href^="http"]::after {{ content:""; }}
}}
h1 {{ font-size:27px; letter-spacing:-.02em; margin:6px 0 4px; }}
h2 {{ font-size:17px; margin:34px 0 4px; letter-spacing:-.01em; }}
.kicker {{ font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:var(--acc); }}
.sub {{ color:var(--ink2); margin:4px 0 10px; }}
.count {{ font-size:12px; color:var(--ink2); font-weight:600; }}
table {{ width:100%; border-collapse:collapse; margin-top:8px; background:#fff;
  border:1px solid var(--line); border-radius:10px; overflow:hidden; }}
th {{ text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink2);
  padding:9px 12px; border-bottom:1px solid var(--line); }}
td {{ padding:9px 12px; border-bottom:1px solid #f0efea; vertical-align:top; }}
tr:last-child td {{ border-bottom:0; }}
.num {{ text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }}
.muted {{ color:var(--ink2); }}
.mono {{ font-family:ui-monospace,Menlo,monospace; font-size:12.5px; white-space:nowrap; }}
a {{ color:var(--acc); }}
.stats {{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:14px 0 4px; }}
.stat {{ border-top:2px solid var(--ink); padding-top:6px; }}
.stat b {{ display:block; font-size:22px; font-variant-numeric:tabular-nums; }}
.stat span {{ color:var(--ink2); font-size:11.5px; }}
.attr {{ margin-top:4px; font-size:12px; font-weight:700; }}
.evid {{ margin-top:4px; font-size:12px; color:var(--ink2); }}
.evline {{ font-size:12.5px; margin-bottom:3px; }}
.quote {{ font-size:12.5px; font-style:italic; margin-bottom:4px; }}
.small {{ font-size:11.5px; }}
.attr.own {{ color:#166534; }} .attr.casc {{ color:#9a3412; }} .attr.unk {{ color:var(--ink2); }}
.box {{ background:#fff; border:1px solid var(--line); border-radius:10px; padding:14px 16px; margin-top:10px; }}
.box.ours {{ border-left:3px solid var(--acc); }}
.box li {{ margin-bottom:6px; }}
.verdict {{ font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.04em;
  padding:2px 7px; border-radius:999px; white-space:nowrap; color:#fff; }}
.v-closest {{ background:#9a3412; }} .v-related {{ background:#b45309; }}
.v-weak {{ background:#6b7280; }} .v-distant {{ background:#166534; }} .v-unknown {{ background:#9ca3af; }}
.foot {{ color:var(--ink2); font-size:11.5px; margin-top:30px; border-top:1px solid var(--line); padding-top:12px; }}
</style></head><body><div class="sheet">

<div class="kicker">Diligence report · {e(pkg['area'])} Phase {e('/'.join(pkg['window']['phases']))} ·
 starts {pkg['window']['start_from']}–{pkg['window']['start_to']}</div>
<h1>{e(pkg['cohort'])}: {e(headline_text)}</h1>
<p class="sub">{e(pkg['failure_signature']['sentence'])}</p>

<div class="stats" style="grid-template-columns:repeat(5,1fr)">
 <div class="stat"><b>{pkg['failure_signature']['molecules']}</b><span>distinct molecules behind
  {h['biological_stops']} stopped trials</span></div>
 <div class="stat"><b>{pct(h['rate'])}</b><span>{h['biological_stops']} of {h['closed']} closed trials
  (95% CI {pct(h['ci95'][0])}–{pct(h['ci95'][1])})</span></div>
 <div class="stat"><b>{pct(h['comparator_rate'])}</b><span>{e(h['comparator_label'])}</span></div>
 <div class="stat"><b>{a['stops_from_own_data']} / {a['stops_from_programme_cascade']}</b>
  <span>own data / decided elsewhere{f" ({a['stops_unclear']} not established)" if a['stops_unclear'] else ""}</span></div>
 <div class="stat"><b>{c['stop_programmes']}</b><span>independent sponsor–asset programmes behind the stops</span></div>
</div>

<h2>What we read from this</h2>
<div class="box ours"><ul>{''.join(f'<li>{e(x)}</li>' for x in notes)}</ul>
<p class="muted" style="margin:6px 0 0">This block is our interpretation. Everything else on this page is extracted
from the registry and can be checked against the linked records.</p></div>

<h2>How the cohort was defined</h2>
<p class="sub">No rule was applied that is not listed here.</p>
<table><thead><tr><th>Rule</th><th>Value</th><th>Why</th></tr></thead><tbody>{rules}</tbody></table>

<h2>Time to discontinuation</h2>
<p class="sub">Probability that a trial has been stopped for a biological reason by each point, with completion and
non-biological termination as competing events and ongoing trials censored at their last registry update. Unlike the
rate above, this does not move with how mature the cohort is.</p>
{incidence_figure}
<table><thead><tr><th>Since trial start</th><th class="num">This cohort</th><th class="num">95% CI</th>
<th class="num">Comparator</th><th class="num">Still at risk</th></tr></thead><tbody>{cif_rows}</tbody></table>

{comparison_block}

{trial_block("biological_stop", "The stops, and what caused each one",
             "Attribution is shown under each registry reason. " + a["why_it_matters"])}

{endpoint_block()}

{trial_block("terminated_cause_not_readable", f"Terminated, cause not readable ({pkg['counts']['unreadable_terminations']} in the cohort)",
             "Listed rather than dropped. These sit in the denominator and never in the numerator; if every one were "
             "biological the rate would be " + pct(pkg["ambiguity"]["rate_if_all_unresolved_were_biological"])
             + (f". Every one is counted in the rate above; the {MAX_CONTEXT_ROWS} most recent are listed here."
                if pkg['counts']['unreadable_terminations'] > MAX_CONTEXT_ROWS else "."))}

{trial_block("still_open", f"Still open ({pkg['counts']['still_open']} in the cohort)",
             "Not counted either way. Their outcomes will move this cohort's rate in both directions."
             + (f" {pkg['counts']['open_status_not_updated']} of them carry an unknown status — the sponsor "
                f"stopped updating the registry, so they are unaccounted for rather than running."
                if pkg['counts'].get('open_status_not_updated') else "")
             + (f" All {pkg['counts']['still_open']} are in the time-to-event curve; the {MAX_CONTEXT_ROWS} most "
                f"recently started are listed here."
                if pkg['counts']['still_open'] > MAX_CONTEXT_ROWS else ""))}

<h2>Limits</h2>
<div class="box"><ul>{''.join(f'<li>{e(x)}</li>' for x in pkg['limits'])}</ul></div>

<div class="foot">Sources: {e('; '.join(pkg['sources']))}. Cohort rules and classification by Clinical Trial Failures.
Attribution method: {e(a['method'])}</div>
</div></body></html>"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--area", default="Oncology")
    ap.add_argument("--class", dest="klass")
    ap.add_argument("--with-class")
    ap.add_argument("--genes")
    ap.add_argument("--sponsor-group")
    ap.add_argument("--modality")
    ap.add_argument("--phases", default="2,3")
    ap.add_argument("--start", default="2015:2024")
    ap.add_argument("--asset", help="the asset under review; compared against every molecule that failed")
    ap.add_argument("--out", help="output stem (default product/evidence_packages/<area>-<cohort>)")
    args = ap.parse_args()

    pkg = build(args)
    if args.asset:
        resolved = resolve_asset(args.asset)
        pkg["asset_under_review"] = resolved or {"query": args.asset, "resolved": False}
        pkg["asset_comparison"] = (compare_asset(resolved, pkg["failure_signature"]["assets"], args.area)
                                   if resolved else [])
        pkg["asset_not_compared"] = NOT_COMPARED
    notes = interpretation(pkg)
    pkg["interpretation"] = notes

    stem = Path(args.out) if args.out else OUT_DIR / f"{slugify(args.area)}-{slugify(pkg['cohort'])}"
    stem.parent.mkdir(parents=True, exist_ok=True)
    stem.with_suffix(".json").write_text(json.dumps(pkg, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    stem.with_suffix(".html").write_text(render_html(pkg, notes), encoding="utf-8")

    a = pkg["attribution"]
    print(f"wrote {stem.with_suffix('.html')}")
    print(f"  {pkg['cohort']}: {pct(pkg['headline']['rate'])} "
          f"({pkg['headline']['biological_stops']}/{pkg['headline']['closed']}) vs "
          f"{pct(pkg['headline']['comparator_rate'])}")
    print(f"  attribution: {a['stops_from_own_data']} own data, {a['stops_from_programme_cascade']} decided "
          f"elsewhere, {a['stops_unclear']} not established")
    print(f"  {pkg['counts']['unreadable_terminations']} unreadable terminations, "
          f"{pkg['counts']['still_open']} still open, {pkg['counts']['total_in_cohort']} trials in the cohort")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
