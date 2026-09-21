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


def compare_asset(asset: dict, failed: list[dict]) -> list[dict]:
    """One row per failed molecule: what it shares with the asset under review, and what it does not."""
    out = []
    a_genes, a_mechs = set(asset.get("target_genes") or []), set(asset.get("mechanisms") or [])
    for f in failed:
        f_genes, f_mechs = set(f.get("target_genes") or []), set(f.get("mechanisms") or [])
        same_modality = bool(asset.get("modality")) and asset["modality"] in (f.get("modalities") or [])
        shared_genes = sorted(a_genes & f_genes)
        shared_mechs = sorted(a_mechs & f_mechs)
        if shared_genes and same_modality:
            verdict, why = "closest", "same target and same modality"
        elif shared_genes:
            verdict, why = "related", "same target, different modality"
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
            "why_stopped": " ".join((r.get("why_stopped") or "").split()),
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
                   + [trial_row(r, "terminated_cause_not_readable") for r in unreadable[:MAX_CONTEXT_ROWS]]
                   + [trial_row(r, "still_open") for r in
                      sorted(open_trials, key=lambda r: (r.get("start_date") or ""), reverse=True)[:MAX_CONTEXT_ROWS]]),
        "counts": {"stopped": len(stops), "unreadable_terminations": len(unreadable),
                   "still_open": len(open_trials), "total_in_cohort": len(cohort),
                   # What the rate and the curve are computed over, and what the document lists
                   # trial by trial, are not the same number: every stop is listed, the other two
                   # groups are capped so one huge cohort cannot bloat the delivery.
                   "listed_unreadable": len(unreadable[:MAX_CONTEXT_ROWS]),
                   "listed_open": len(open_trials[:MAX_CONTEXT_ROWS]),
                   # What the free brief shows of the same cohort. The difference between the two
                   # documents is worth stating as a number, and a number nobody computes drifts.
                   "brief_lists_stops": min(len(stops), BRIEF_MAX_ROWS)},
        "sources": ["ClinicalTrials.gov (NLM)", "ChEMBL (EMBL-EBI, CC BY-SA 3.0)", "NCI Thesaurus (NCI)",
                    "RxNorm/RxClass (NLM)", "SEC EDGAR"],
        "limits": [
            "This describes registry records for trials that have closed. It is not a forecast for any asset.",
            "It is not a failure rate: a trial that ran to completion and missed its endpoint is not counted here.",
            "Comparisons are unadjusted. Indication, line of therapy, biomarker selection and development era are "
            "not matched between this cohort and its comparator.",
            "Extraction, classification and attribution are automated. No clinician has reviewed these records.",
            "Sponsors differ several-fold in how often they record a readable cause, so part of any difference "
            "between cohorts is a difference in disclosure.",
        ],
    }


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
    if a["stops_from_programme_cascade"]:
        out.append(f"{a['stops_from_own_data']} of those stops were the trial's own verdict; "
                   f"{a['stops_from_programme_cascade']} followed a decision taken elsewhere"
                   + (f", and {a['stops_unclear']} cannot be established from the record." if a["stops_unclear"] else ".")
                   + " The cohort is weaker evidence about the mechanism than the count of records suggests: the "
                     "question to take into a diligence meeting is whether the asset under review shares the "
                     "molecule, the population or the endpoint of the programmes that failed.")
    else:
        out.append(f"All {a['stops_from_own_data']} stops we could attribute were the trial's own verdict rather than "
                   f"a consequence of a decision elsewhere, which makes the cohort unusually clean evidence for its size.")
    out.append(f"The stops came from {c['stop_programmes']} sponsor–asset programmes across {c['stop_sponsors']} "
               f"sponsors"
               + (f"; removing the largest ({c['largest_programme']}, {c['largest_programme_stops']} stops) leaves "
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


def render_html(pkg: dict, notes: list[str]) -> str:
    h, a, c = pkg["headline"], pkg["attribution"], pkg["concentration"]
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
            body += (f"<tr><td class='mono'><a href='{e(t['registry_url'])}'>{e(t['nct_id'])}</a></td>"
                     f"<td>{e(t['phase'])}</td><td>{e(t['sponsor'])}</td>"
                     f"<td>{e(', '.join(t['experimental_drugs']) or '—')}</td>"
                     f"<td class='num'>{e(t['stopped'] or t['start'])}</td>"
                     f"<td>{e(t['why_stopped']) or '<span class=muted>no reason recorded</span>'}{attr}</td></tr>")
        return (f"<h2>{e(heading)} <span class='count'>{len(rows)}</span></h2><p class='sub'>{e(blurb)}</p>"
                f"<table><thead><tr><th>Trial</th><th>Ph</th><th>Sponsor</th><th>Experimental drugs</th>"
                f"<th>Date</th><th>Registry record</th></tr></thead><tbody>{body}</tbody></table>")

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
        comparison_block = ""

    cif_rows = "".join(
        f"<tr><td>{m} months</td><td class='num'><b>{pct(cif[m]['cif'])}</b></td>"
        f"<td class='num muted'>{pct(cif[m]['ci95'][0])}–{pct(cif[m]['ci95'][1])}</td>"
        f"<td class='num muted'>{pct(base_cif.get(m, {}).get('cif'))}</td>"
        f"<td class='num muted'>{cif[m]['n_risk']}</td></tr>" for m in sorted(cif))

    return f"""<!doctype html><html><head><meta charset="utf-8">
<title>{e(pkg['cohort'])} — evidence package</title><style>
:root {{ --ink:#14161a; --ink2:#5b6470; --line:#e2e0da; --bg:#fbfaf7; --acc:#4f46e5; }}
* {{ box-sizing:border-box; }}
body {{ font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  color:var(--ink); background:var(--bg); margin:0; padding:40px 24px; }}
.sheet {{ max-width:1000px; margin:0 auto; }}
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

<div class="kicker">Evidence package · {e(pkg['area'])} Phase {e('/'.join(pkg['window']['phases']))} ·
 starts {pkg['window']['start_from']}–{pkg['window']['start_to']}</div>
<h1>{e(pkg['cohort'])}: {e(pkg['failure_signature']['headline'])}</h1>
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
<table><thead><tr><th>Since trial start</th><th class="num">This cohort</th><th class="num">95% CI</th>
<th class="num">Comparator</th><th class="num">Still at risk</th></tr></thead><tbody>{cif_rows}</tbody></table>

{comparison_block}

{trial_block("biological_stop", "The stops, and what caused each one",
             "Attribution is shown under each registry reason. " + a["why_it_matters"])}

{trial_block("terminated_cause_not_readable", f"Terminated, cause not readable ({pkg['counts']['unreadable_terminations']} in the cohort)",
             "Listed rather than dropped. These sit in the denominator and never in the numerator; if every one were "
             "biological the rate would be " + pct(pkg["ambiguity"]["rate_if_all_unresolved_were_biological"])
             + (f". Every one is counted in the rate above; the {MAX_CONTEXT_ROWS} most recent are listed here."
                if pkg['counts']['unreadable_terminations'] > MAX_CONTEXT_ROWS else "."))}

{trial_block("still_open", f"Still open ({pkg['counts']['still_open']} in the cohort)",
             "Not counted either way. Their outcomes will move this cohort's rate in both directions."
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
        pkg["asset_comparison"] = (compare_asset(resolved, pkg["failure_signature"]["assets"]) if resolved else [])
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
