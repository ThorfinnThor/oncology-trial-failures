#!/usr/bin/env python3
"""Build the Oncology Failure Signals product dataset (v1).

Scope: stopped oncology trials whose Classification V2 outcome is
BIOLOGICAL_FAILURE, or MIXED_CAUSES with an efficacy/safety/biological cause.

Enrichment layers (each source-backed and cached; unreachable sources are
reported, never guessed):
  1. ClinicalTrials.gov API v2  -> arms, intervention roles, other names (aliases),
                                   sponsor/collaborator class, enrollment, dates
  2. RxNorm / RxClass (NLM)     -> canonical ingredient (RxCUI), US-marketed flag,
                                   mechanism of action (MED-RT), pharmacologic class (FDA EPC)
  3. Sponsor normalization      -> canonical key + curated parent group
  Planned when network allows:  NCI Thesaurus, ChEMBL targets, PubMed, SEC EDGAR tickers.

Outputs (product/, never published to web/public):
  oncology_failure_signals_v1.jsonl, oncology_failure_signals_v1.csv,
  oncology_failure_signals_assets_v1.json, oncology_failure_signals_v1_meta.json
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.http_cache import SourceUnavailable, get_json  # noqa: E402
from scripts.signals.sponsors import resolve_sponsor  # noqa: E402
from scripts.signals.external_sources import chembl_mechanisms, chembl_molecule, pubmed_for_nct, sec_issuer  # noqa: E402

SOURCE = ROOT / "data/all_oncology_stopped_trials.json"
OUT = ROOT / "product"
PRODUCT_VERSION = "1.0.0"
BIO_REASONS = {"EFFICACY_FUTILITY", "SAFETY", "BIOLOGICAL_UNSPECIFIED"}
DRUG_TYPES = {"DRUG", "BIOLOGICAL", "GENETIC", "COMBINATION_PRODUCT"}
NON_ASSET_NAME = re.compile(
    r"\b(placebo|saline|vehicle|best supportive care|standard of care|laboratory biomarker|biomarker analysis|pharmacological study|"
    r"pharmacokinetic study|quality[- ]of[- ]life|questionnaire|survey|biospecimen|imaging|computed tomography|mri|pet scan|"
    r"radiation therapy|radiotherapy|surgery|resection|observation|physician'?s choice|investigator'?s choice)\b", re.I)
PLACEBO_NAME = re.compile(r"\b(placebo|matching placebo|vehicle)\b", re.I)
RESEARCH_CODE = re.compile(r"^[A-Z]{1,6}[- ]?\d{2,7}[A-Z]?$")
CODE_IN_TEXT = re.compile(r"(?<![A-Za-z0-9])([A-Za-z]{1,6}[- ]?\d{2,7}(?:[-][A-Za-z0-9]{1,4})?[A-Za-z]{0,3})(?![A-Za-z0-9])")
NOT_A_CODE = re.compile(r"^(COVID|SARS|CD|IL|HER|PD|CTLA|FGFR|EGFR|BRAF|KRAS|TP|NCT|DAY|WEEK|CYCLE|ARM|PHASE|STAGE|MG|MCG|MG/M|GY|Q|V|G)[- ]?\d", re.I)
CTGOV = "https://clinicaltrials.gov/api/v2/studies/{nct}"
CTGOV_FIELDS = ",".join([
    "protocolSection.identificationModule.officialTitle",
    "protocolSection.statusModule",
    "protocolSection.sponsorCollaboratorsModule",
    "protocolSection.designModule",
    "protocolSection.armsInterventionsModule",
    "protocolSection.conditionsModule",
    "hasResults",
])
RXNAV = "https://rxnav.nlm.nih.gov/REST"


def split_semicolon(value) -> list[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [p.strip() for p in str(value or "").split(";") if p.strip()]


def in_scope(rec: dict) -> bool:
    outcome = rec.get("classification_outcome_v2")
    if outcome == "BIOLOGICAL_FAILURE":
        return True
    if outcome == "MIXED_CAUSES":
        return bool(BIO_REASONS & set(split_semicolon(rec.get("classification_secondary_reasons_v2"))))
    return False


# ---------------------------------------------------------------- ClinicalTrials.gov
def fetch_design(nct: str, last_update: str = "") -> dict | None:
    # The registry last-update date salts the cache key, so changed records are refetched.
    return get_json("ctgov", CTGOV.format(nct=nct), {"fields": CTGOV_FIELDS, "format": "json"}, cache_salt=last_update or "")


# ---------------------------------------------------------------- RxNorm / RxClass
def clean_drug_name(name: str) -> str:
    value = re.sub(r"[®™©]", "", name or "")
    value = re.sub(r"\(.*?\)", " ", value)
    value = re.sub(r"\b(injection|tablets?|capsules?|oral|intravenous|iv|infusion|solution|hydrochloride|hcl|mesylate|"
                   r"maleate|tosylate|sodium|citrate|acetate|dose level \d+|low dose|high dose)\b", " ", value, flags=re.I)
    return re.sub(r"\s+", " ", value).strip(" ,;-")


def name_candidates(iv: dict) -> list[str]:
    """Expand an intervention into lookup candidates: name, split other names,
    parenthetical aliases and '+' combination components (order preserved)."""
    raw = [iv.get("name", "")] + list(iv.get("other_names") or [])
    parts: list[str] = []
    for item in raw:
        for piece in re.split(r"[;,/]| \+ |\+|\s+(?:plus|and|with)\s+", item or "", flags=re.I):
            piece = piece.strip()
            if not piece:
                continue
            parts.append(piece)
            inner = re.findall(r"\(([^)]+)\)", piece)
            parts.extend(i.strip() for i in inner)
            outer = re.sub(r"\([^)]*\)", " ", piece).strip()
            if outer and outer != piece:
                parts.append(outer)
    seen, out = set(), []
    for p in parts:
        key = p.lower()
        if key not in seen and len(p) >= 3:
            seen.add(key)
            out.append(p)
    return out


COMBO_SPLIT = re.compile(r"\s*\+\s*|\s+(?:plus|and|with)\s+|\s*/\s*(?=[A-Za-z]{4})", re.I)


def component_groups(iv: dict) -> list[dict]:
    """One group per combination partner ('A + B', 'A and B'), otherwise the whole
    intervention with its registry other names as aliases."""
    name = iv.get("name", "")
    parts = [p.strip() for p in COMBO_SPLIT.split(name) if p and p.strip()]
    if len(parts) > 1 and all(len(p) >= 3 for p in parts):
        return [{"name": part, "other_names": []} for part in parts]
    return [iv]


def research_codes(iv: dict) -> list[str]:
    codes = set()
    for cand in name_candidates(iv):
        for m in CODE_IN_TEXT.findall(cand):
            code = re.sub(r"\s+", "-", m.strip()).upper()
            if not NOT_A_CODE.match(code) and re.search(r"[A-Z]", code) and re.search(r"\d{2}", code):
                codes.add(code)
    return sorted(codes)


def rxnorm_lookup(name: str) -> dict | None:
    term = clean_drug_name(name)
    if len(term) < 3 or RESEARCH_CODE.match(term.upper()):
        return None
    body = get_json("rxnav", f"{RXNAV}/rxcui.json", {"name": term, "search": "2"})  # exact or normalized
    ids = ((body or {}).get("idGroup") or {}).get("rxnormId") or []
    if not ids:
        return None
    rxcui = ids[0]
    props = get_json("rxnav", f"{RXNAV}/rxcui/{rxcui}/properties.json") or {}
    prop = props.get("properties") or {}
    tty = prop.get("tty")
    ingredient = {"rxcui": rxcui, "name": prop.get("name"), "tty": tty}
    if tty not in {"IN", "PIN", "MIN"}:
        rel = get_json("rxnav", f"{RXNAV}/rxcui/{rxcui}/related.json", {"tty": "IN"}) or {}
        groups = (rel.get("relatedGroup") or {}).get("conceptGroup") or []
        ins = [c for g in groups for c in (g.get("conceptProperties") or [])]
        if len(ins) != 1:
            return None
        ingredient = {"rxcui": ins[0]["rxcui"], "name": ins[0]["name"], "tty": "IN"}
    return {"ingredient": ingredient, "matched_term": term}


def rxclass(rxcui: str) -> dict:
    out = {"moa": [], "epc": []}
    for rela_source, rela, key in [("MEDRT", "has_moa", "moa"), ("FDASPL", "has_epc", "epc")]:
        body = get_json("rxnav", f"{RXNAV}/rxclass/class/byRxcui.json", {"rxcui": rxcui, "relaSource": rela_source, "relas": rela}) or {}
        items = ((body.get("rxclassDrugInfoList") or {}).get("rxclassDrugInfo")) or []
        out[key] = sorted({i["rxclassMinConceptItem"]["className"] for i in items})
    return out


def us_marketed(rxcui: str) -> bool:
    body = get_json("rxnav", f"{RXNAV}/rxcui/{rxcui}/related.json", {"tty": "SCD SBD GPCK BPCK"}) or {}
    groups = (body.get("relatedGroup") or {}).get("conceptGroup") or []
    if any(g.get("conceptProperties") for g in groups):
        return True
    # Precise ingredients (e.g. "paclitaxel protein-bound" = Abraxane) are often not linked to product
    # concepts in RxNorm; fall back to the base ingredient's marketed status.
    props = (get_json("rxnav", f"{RXNAV}/rxcui/{rxcui}/properties.json") or {}).get("properties") or {}
    if props.get("tty") == "PIN":
        rel = get_json("rxnav", f"{RXNAV}/rxcui/{rxcui}/related.json", {"tty": "IN"}) or {}
        bases = [c["rxcui"] for g in (rel.get("relatedGroup") or {}).get("conceptGroup") or [] for c in g.get("conceptProperties") or []]
        return any(us_marketed(b) for b in bases if b != rxcui)
    return False


# ---------------------------------------------------------------- assembly
def intervention_roles(design: dict) -> list[dict]:
    aim = ((design or {}).get("protocolSection") or {}).get("armsInterventionsModule") or {}
    arm_type = {a.get("label"): (a.get("type") or "UNKNOWN") for a in aim.get("armGroups") or []}
    rows = []
    for iv in aim.get("interventions") or []:
        types = sorted({arm_type.get(label, "UNKNOWN") for label in iv.get("armGroupLabels") or []})
        rows.append({
            "name": iv.get("name", ""),
            "type": iv.get("type", ""),
            "other_names": sorted({p.strip() for n in iv.get("otherNames") or [] for p in re.split(r"[;,]", n or "") if p.strip()}),
            "arm_types": types,
        })
    return rows


def assign_role(iv: dict, asset: dict | None) -> tuple[str, str]:
    name, arms = iv["name"], set(iv["arm_types"])
    if PLACEBO_NAME.search(name):
        return "PLACEBO", "name"
    if iv["type"] not in DRUG_TYPES or NON_ASSET_NAME.search(name):
        return "NON_DRUG", "intervention type/name"
    experimental = bool(arms & {"EXPERIMENTAL"})
    control = bool(arms & {"ACTIVE_COMPARATOR", "PLACEBO_COMPARATOR", "SHAM_COMPARATOR", "NO_INTERVENTION"})
    if experimental and control:
        return "BACKGROUND_OR_BACKBONE", "in experimental and control arms"
    if control and not experimental:
        return "COMPARATOR", "control arms only"
    if experimental or not arms or arms == {"UNKNOWN"} or arms == {"OTHER"}:
        return "EXPERIMENTAL_ARM", "experimental or unlabelled arms"
    return "OTHER", "arm types " + ",".join(sorted(arms))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--step", choices=["ctgov", "rxnorm", "chembl", "pubmed", "sec", "build", "all"], default="all")
    ap.add_argument("--max-seconds", type=float, default=150.0)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--chembl-workers", type=int, default=12, help="ChEMBL latency is high; more parallel requests")
    args = ap.parse_args()
    started = time.monotonic()

    records = [r for r in json.loads(SOURCE.read_text()) if in_scope(r)]
    ncts = sorted({r["nct_id"] for r in records})
    source_status: dict[str, str] = {}

    def time_left() -> bool:
        return time.monotonic() - started < args.max_seconds

    # 1. ClinicalTrials.gov
    designs: dict[str, dict | None] = {}
    if True:  # designs are needed by every step; cached after first run
        pending = list(ncts)
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {}
            last_updates = {r["nct_id"]: r.get("last_update_post_date") or "" for r in records}
            for nct in pending:
                futures[pool.submit(fetch_design, nct, last_updates.get(nct, ""))] = nct
            for done, fut in enumerate(as_completed(futures), 1):
                nct = futures[fut]
                if done % 100 == 0:
                    print(f"ctgov: {done}/{len(futures)} ({time.monotonic() - started:.0f}s)", flush=True)
                try:
                    designs[nct] = fut.result()
                    source_status.setdefault("ctgov", "OK")
                except SourceUnavailable as exc:
                    source_status["ctgov"] = f"UNAVAILABLE: {exc}"
                if not time_left():
                    for f in futures:
                        f.cancel()
                    print(f"ctgov: time budget reached, {len(designs)}/{len(ncts)} cached; re-run to continue")
                    return 3
        print(f"ctgov: {sum(1 for v in designs.values() if v)}/{len(ncts)} designs")
        if args.step == "ctgov":
            return 0

    # 2. RxNorm for unique drug names (+ aliases)
    names: set[str] = set()
    for nct in ncts:
        for iv in intervention_roles(designs.get(nct) or {}):
            if iv["type"] in DRUG_TYPES and not PLACEBO_NAME.search(iv["name"]) and not NON_ASSET_NAME.search(iv["name"]):
                names.update(name_candidates(iv))
    lookups: dict[str, dict | None] = {}
    try:
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {pool.submit(rxnorm_lookup, n): n for n in sorted(names)}
            for done, fut in enumerate(as_completed(futures), 1):
                lookups[futures[fut]] = fut.result()
                if done % 250 == 0:
                    print(f"rxnorm: {done}/{len(futures)} ({time.monotonic() - started:.0f}s)", flush=True)
                if not time_left():
                    for f in futures:
                        f.cancel()
                    print(f"rxnorm: time budget reached, {len(lookups)}/{len(names)}; re-run to continue")
                    return 3
        source_status["rxnorm"] = "OK"
        ingredients = {v["ingredient"]["rxcui"]: v["ingredient"] for v in lookups.values() if v}
        classes, marketed = {}, {}
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            f_cls = {pool.submit(rxclass, c): c for c in ingredients}
            f_mkt = {pool.submit(us_marketed, c): c for c in ingredients}
            for fut in as_completed(list(f_cls) + list(f_mkt)):
                if fut in f_cls:
                    classes[f_cls[fut]] = fut.result()
                else:
                    marketed[f_mkt[fut]] = fut.result()
                if not time_left():
                    print("rxclass: time budget reached; re-run to continue")
                    return 3
    except SourceUnavailable as exc:
        source_status["rxnorm"] = f"UNAVAILABLE: {exc}"
        ingredients, classes, marketed = {}, {}, {}
    print(f"rxnorm: {sum(1 for v in lookups.values() if v)}/{len(names)} names resolved to {len(ingredients)} ingredients")
    if args.step == "rxnorm":
        return 0

    def run_pool(label, fn, items, workers=None):
        results = {}
        with ThreadPoolExecutor(max_workers=workers or args.workers) as pool:
            futures = {pool.submit(fn, item): item for item in items}
            for done, fut in enumerate(as_completed(futures), 1):
                results[futures[fut]] = fut.result()
                if done % 250 == 0:
                    print(f"{label}: {done}/{len(items)} ({time.monotonic() - started:.0f}s)", flush=True)
                if not time_left():
                    for f in futures:
                        f.cancel()
                    print(f"{label}: time budget reached, {len(results)}/{len(items)}; re-run to continue")
                    raise SystemExit(3)
        return results

    # 2b. ChEMBL for every drug-name candidate (exact), then mechanisms/targets for matched molecules
    chembl_hits, chembl_mech = {}, {}
    try:
        # Lazy: per component, query candidates in order and stop at the first exact match.
        candidate_lists = set()
        for nct in ncts:
            for iv in intervention_roles(designs.get(nct) or {}):
                if assign_role(iv, None)[0] in ("PLACEBO", "NON_DRUG"):
                    continue
                for g in component_groups(iv):
                    cands = tuple(name_candidates(g))
                    if cands:
                        candidate_lists.add(cands)

        def first_hit(cands: tuple) -> dict:
            found = {}
            for cand in cands:
                mol = chembl_molecule(cand)
                found[cand] = mol
                if mol:
                    break
            return found

        chembl_hits = {}
        for found in run_pool("chembl", first_hit, sorted(candidate_lists), args.chembl_workers).values():
            chembl_hits.update(found)
        mol_ids = sorted({m["molecule_chembl_id"] for m in chembl_hits.values() if m})
        chembl_mech = run_pool("chembl-mechanisms", chembl_mechanisms, mol_ids, args.chembl_workers)
        source_status["chembl"] = "OK"
    except SourceUnavailable as exc:
        source_status["chembl"] = f"UNAVAILABLE: {exc}"
    print(f"chembl: {sum(1 for v in chembl_hits.values() if v)}/{len(chembl_hits)} queried names matched, {len(chembl_mech)} molecules with mechanism lookups")
    if args.step == "chembl":
        return 0

    # 2c. PubMed publications mentioning each NCT ID
    pubmed = {}
    try:
        pubmed = run_pool("pubmed", pubmed_for_nct, ncts, 2)
        unknown = sum(1 for v in pubmed.values() if v is None)
        source_status["pubmed"] = "OK" if not unknown else f"PARTIAL: {unknown} trials throttled, retried next run"
    except SourceUnavailable as exc:
        source_status["pubmed"] = f"UNAVAILABLE: {exc}"
    print(f"pubmed: {sum(1 for v in pubmed.values() if v)}/{len(ncts)} trials with publications")
    if args.step == "pubmed":
        return 0

    # 2d. SEC issuer lookup is done per record below (single cached index download)
    try:
        sec_issuer("Pfizer")
        source_status["sec"] = "OK"
    except SourceUnavailable as exc:
        source_status["sec"] = f"UNAVAILABLE: {exc}"
    if args.step == "sec":
        return 0

    # 3. Assemble
    assets: dict[str, dict] = {}
    alias_to_asset: dict[str, str] = {}

    def make_asset(ing: dict | None, mol: dict | None) -> dict:
        if mol:
            aid, name, id_source = f"CHEMBL:{mol['molecule_chembl_id']}", (mol.get("pref_name") or "").lower() or (ing or {}).get("name"), "ChEMBL"
        else:
            aid, name, id_source = f"RXCUI:{ing['rxcui']}", ing["name"], "RxNorm"
        a = assets.setdefault(aid, {
            "asset_id": aid, "canonical_name": name, "id_source": id_source, "chembl_id": None, "rxcui": None,
            "chembl_max_phase": None, "chembl_first_approval": None, "molecule_type": None, "approved_chembl": None,
            "us_marketed_rxnorm": None, "mechanism_of_action_medrt": [], "pharmacologic_class_fda_epc": [],
            "chembl_mechanisms": [], "targets": [], "target_gene_symbols": [], "aliases": set(), "nct_ids": set(),
        })
        if mol and not a["chembl_id"]:
            mechs = chembl_mech.get(mol["molecule_chembl_id"]) or []
            a.update({"chembl_id": mol["molecule_chembl_id"], "chembl_max_phase": mol.get("max_phase"),
                      "chembl_first_approval": mol.get("first_approval"), "molecule_type": mol.get("molecule_type"),
                      "approved_chembl": str(mol.get("max_phase")) in ("4", "4.0"),
                      "chembl_mechanisms": sorted({m["mechanism_of_action"] for m in mechs if m.get("mechanism_of_action")}),
                      "targets": sorted({m["target_name"] for m in mechs if m.get("target_name")}),
                      "target_gene_symbols": sorted({g for m in mechs for g in m.get("gene_symbols") or []})})
        if ing and not a["rxcui"]:
            a.update({"rxcui": ing["rxcui"], "us_marketed_rxnorm": marketed.get(ing["rxcui"]),
                      "mechanism_of_action_medrt": classes.get(ing["rxcui"], {}).get("moa", []),
                      "pharmacologic_class_fda_epc": classes.get(ing["rxcui"], {}).get("epc", [])})
        return a

    def components_for(iv: dict) -> list[dict]:
        """One component per combination partner ('A + B'), otherwise one component
        whose aliases are the intervention name and its registry other names."""
        comps = []
        for g in component_groups(iv):
            cands = name_candidates(g)
            ing = next((lookups[c]["ingredient"] for c in cands if lookups.get(c)), None)
            mol = next((chembl_hits[c] for c in cands if chembl_hits.get(c)), None)
            asset = make_asset(ing, mol) if (ing or mol) else None
            method = "+".join(x for x, ok in [("CHEMBL_EXACT", mol), ("RXNORM", ing)] if ok) or "UNRESOLVED"
            comps.append({
                "label": g.get("name", ""), "asset": asset, "match_method": method,
                "research_codes": research_codes(g),
            })
        return comps

    out_rows = []
    for rec in sorted(records, key=lambda r: r["nct_id"]):
        design = designs.get(rec["nct_id"]) or {}
        ps = design.get("protocolSection") or {}
        spons = ps.get("sponsorCollaboratorsModule") or {}
        lead = spons.get("leadSponsor") or {}
        dm = ps.get("designModule") or {}
        sm = ps.get("statusModule") or {}
        sponsor = resolve_sponsor(lead.get("name") or rec.get("lead_sponsor", ""), lead.get("class", ""))
        ivs = []
        focus_components = []
        exp_components = []
        for iv in intervention_roles(design) or [{"name": n, "type": "", "other_names": [], "arm_types": []} for n in split_semicolon(rec.get("intervention_names"))]:
            role, basis = assign_role(iv, None)
            is_drug = role not in ("PLACEBO", "NON_DRUG")
            comps = components_for(iv) if is_drug else []
            for c in comps:
                if c["asset"]:
                    c["asset"]["aliases"].update([c["label"]] + (iv["other_names"] if len(comps) == 1 else []))
                    c["asset"]["nct_ids"].add(rec["nct_id"])
            if role == "EXPERIMENTAL_ARM":
                exp_components.extend(comps)
            ivs.append({
                "name": iv["name"], "type": iv["type"], "other_names": iv["other_names"], "arm_types": iv["arm_types"],
                "role": role, "role_basis": basis,
                "components": [{
                    "label": c["label"],
                    "asset_id": c["asset"]["asset_id"] if c["asset"] else None,
                    "asset_name": c["asset"]["canonical_name"] if c["asset"] else None,
                    "us_marketed_rxnorm": c["asset"]["us_marketed_rxnorm"] if c["asset"] else None,
                    "match_method": c["match_method"],
                    "research_codes": c["research_codes"],
                } for c in comps],
            })
        # investigational focus: experimental-arm components not marketed in the US (incl. unresolved codes);
        # if every experimental component is marketed, the whole experimental regimen is the focus.
        novel = [c for c in exp_components if not (c["asset"] and (c["asset"]["us_marketed_rxnorm"] is True or str(c["asset"].get("chembl_max_phase")) in ("4", "4.0")))]
        focus = novel or exp_components
        out_rows.append({
            "nct_id": rec["nct_id"],
            "brief_title": rec.get("brief_title"),
            "official_title": (ps.get("identificationModule") or {}).get("officialTitle"),
            "registry_url": rec.get("url"),
            "phases": split_semicolon(rec.get("phases")),
            "overall_status": rec.get("overall_status"),
            "why_stopped": rec.get("why_stopped") or None,
            "stop_reason_source": "REGISTRY_WHY_STOPPED" if rec.get("why_stopped") else (
                "REGISTRY_DESCRIPTION" if rec.get("classification_source") == "DESCRIPTION_FALLBACK" else "NONE"),
            "stop_reason_text": rec.get("why_stopped") or (
                (rec.get("classification_evidence") or "").split("source.description_fallback:")[-1].strip()
                if "source.description_fallback:" in (rec.get("classification_evidence") or "") else None),
            "failure_outcome": rec.get("classification_outcome_v2"),
            "failure_primary_reason": rec.get("classification_primary_reason_v2"),
            "failure_secondary_reasons": split_semicolon(rec.get("classification_secondary_reasons_v2")),
            "classification_confidence": rec.get("classification_confidence"),
            "classification_evidence": rec.get("classification_evidence"),
            "classifier_version": rec.get("classification_version"),
            "conditions": split_semicolon(rec.get("conditions")),
            "mesh_terms": split_semicolon(rec.get("mesh_terms")),
            "start_date": rec.get("start_date"),
            "primary_completion_date": rec.get("primary_completion_date"),
            "last_update_post_date": rec.get("last_update_post_date"),
            "enrollment_count": (dm.get("enrollmentInfo") or {}).get("count"),
            "enrollment_type": (dm.get("enrollmentInfo") or {}).get("type"),
            "allocation": (dm.get("designInfo") or {}).get("allocation"),
            "masking": ((dm.get("designInfo") or {}).get("maskingInfo") or {}).get("masking"),
            "has_results": design.get("hasResults"),
            "why_stopped_ctgov_current": sm.get("whyStopped"),
            **sponsor,
            "collaborators": [{"name": c.get("name"), "class": c.get("class")} for c in spons.get("collaborators") or []],
            "interventions": ivs,
            "focus_assets": sorted({(c["asset"]["canonical_name"] if c["asset"] else c["label"]) for c in focus}),
            "focus_asset_ids": sorted({c["asset"]["asset_id"] for c in focus if c["asset"]}),
            "focus_research_codes": sorted({code for c in focus for code in c["research_codes"]}),
            "focus_mechanisms": sorted({m for c in focus if c["asset"] for m in (c["asset"]["chembl_mechanisms"] or c["asset"]["mechanism_of_action_medrt"])}),
            "focus_targets": sorted({t for c in focus if c["asset"] for t in c["asset"]["targets"]}),
            "focus_target_genes": sorted({g for c in focus if c["asset"] for g in c["asset"]["target_gene_symbols"]}),
            "focus_max_phase_chembl": max([float(c["asset"]["chembl_max_phase"]) for c in focus if c["asset"] and c["asset"].get("chembl_max_phase") not in (None, "")] or [None], key=lambda v: -1 if v is None else v),
            "focus_pharmacologic_classes": sorted({m for c in focus if c["asset"] for m in c["asset"]["pharmacologic_class_fda_epc"]}),
            "focus_includes_non_us_marketed": any(not (c["asset"] and (c["asset"]["us_marketed_rxnorm"] is True or str(c["asset"].get("chembl_max_phase")) in ("4", "4.0"))) for c in focus),
            "publications": pubmed.get(rec["nct_id"]) or [],
            "publication_count": len(pubmed.get(rec["nct_id"]) or []),
            "sponsor_issuer_sec": (sec_issuer(sponsor["sponsor_group"], sponsor["lead_sponsor_raw"]) if sponsor["is_industry"] and source_status.get("sec") == "OK" else None),
            "evidence_links": [{"type": "REGISTRY", "url": rec.get("url")}] + [{"type": "PUBMED", "url": p["url"]} for p in (pubmed.get(rec["nct_id"]) or [])[:5]],
            "enrichment_status": {"ctgov": bool(design), "rxnorm": source_status.get("rxnorm", "NOT_RUN"),
                                  "chembl": source_status.get("chembl", "NOT_RUN"), "pubmed": source_status.get("pubmed", "NOT_RUN"),
                                  "sec": source_status.get("sec", "NOT_RUN"), "ncit": "NOT_USED_V1"},
        })

    # asset-level repeated-signal features
    by_asset = defaultdict(list)
    for row in out_rows:
        for aid in row["focus_asset_ids"]:
            by_asset[aid].append(row)
    for aid, a in assets.items():
        rows = by_asset.get(aid, [])
        a["aliases"] = sorted(a["aliases"])
        a["nct_ids"] = sorted(a["nct_ids"])
        a["focus_signal_trial_count"] = len(rows)
        a["focus_efficacy_signal_count"] = sum("EFFICACY_FUTILITY" in ([r["failure_primary_reason"]] + r["failure_secondary_reasons"]) for r in rows)
        a["focus_safety_signal_count"] = sum("SAFETY" in ([r["failure_primary_reason"]] + r["failure_secondary_reasons"]) for r in rows)
        a["repeated_safety_signal"] = a["focus_safety_signal_count"] >= 2
        a["repeated_efficacy_signal"] = a["focus_efficacy_signal_count"] >= 2
    for row in out_rows:
        row["focus_asset_signal_trial_counts"] = {aid: assets[aid]["focus_signal_trial_count"] for aid in row["focus_asset_ids"]}

    OUT.mkdir(exist_ok=True)
    with open(OUT / "oncology_failure_signals_v1.jsonl", "w", encoding="utf-8") as fh:
        for row in out_rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    focus_cov = sum(1 for r in out_rows if r["focus_asset_ids"] or r["focus_research_codes"]) / max(1, len(out_rows))
    flat_cols = ["nct_id", "brief_title", "phases", "overall_status", "failure_outcome", "failure_primary_reason", "failure_secondary_reasons",
                 "stop_reason_text", "stop_reason_source", "sponsor_group", "lead_sponsor_raw", "sponsor_class_ctgov", "is_industry", "focus_assets", "focus_asset_ids",
                 "focus_research_codes", "focus_mechanisms", "focus_targets", "focus_target_genes", "focus_max_phase_chembl", "focus_pharmacologic_classes", "publication_count", "focus_includes_non_us_marketed", "conditions",
                 "enrollment_count", "enrollment_type", "start_date", "primary_completion_date", "last_update_post_date", "registry_url"]
    with open(OUT / "oncology_failure_signals_v1.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=flat_cols)
        w.writeheader()
        for row in out_rows:
            w.writerow({k: "; ".join(map(str, row[k])) if isinstance(row[k], list) else row[k] for k in flat_cols})
    (OUT / "oncology_failure_signals_assets_v1.json").write_text(json.dumps(sorted(assets.values(), key=lambda a: -a["focus_signal_trial_count"]), indent=1, ensure_ascii=False) + "\n")

    focus_iv = [c for r in out_rows for i in r["interventions"] if i["role"] == "EXPERIMENTAL_ARM" for c in i["components"]]
    meta = {
        "product": "Oncology Failure Signals",
        "product_version": PRODUCT_VERSION,
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dataset_version": json.loads((ROOT / "web/public/dataset_meta.json").read_text()).get("version"),
        "scope": "Stopped oncology trials with BIOLOGICAL_FAILURE, or MIXED_CAUSES including an efficacy/safety/biological cause",
        "trial_count": len(out_rows),
        "industry_trial_count": sum(r["is_industry"] for r in out_rows),
        "industry_phase2_3_trial_count": sum(r["is_industry"] and bool({"PHASE2", "PHASE3"} & set(r["phases"])) for r in out_rows),
        "by_outcome": dict(Counter(r["failure_outcome"] for r in out_rows)),
        "by_primary_reason": dict(Counter(r["failure_primary_reason"] for r in out_rows)),
        "ctgov_design_coverage": sum(1 for r in out_rows if r["enrichment_status"]["ctgov"]) / max(1, len(out_rows)),
        "experimental_arm_drug_interventions": len(focus_iv),
        "experimental_arm_drug_resolution_rate": sum(1 for i in focus_iv if i["asset_id"]) / max(1, len(focus_iv)),
        "trials_with_resolved_focus_asset": sum(1 for r in out_rows if r["focus_asset_ids"]) / max(1, len(out_rows)),
        "trials_with_focus_research_code": sum(1 for r in out_rows if r["focus_research_codes"]) / max(1, len(out_rows)),
        "trials_with_focus_asset_or_research_code": focus_cov,
        "trials_with_focus_target_gene": sum(1 for r in out_rows if r["focus_target_genes"]) / max(1, len(out_rows)),
        "trials_with_focus_mechanism": sum(1 for r in out_rows if r["focus_mechanisms"]) / max(1, len(out_rows)),
        "trials_with_pubmed_publication": sum(1 for r in out_rows if r["publications"]) / max(1, len(out_rows)),
        "industry_trials_with_sec_issuer": sum(1 for r in out_rows if r["sponsor_issuer_sec"]) / max(1, sum(r["is_industry"] for r in out_rows)),
        "unique_assets": len(assets),
        "unique_assets_chembl": sum(1 for a in assets.values() if a["chembl_id"]),
        "assets_with_repeated_safety_signal": sum(a["repeated_safety_signal"] for a in assets.values()),
        "assets_with_repeated_efficacy_signal": sum(a["repeated_efficacy_signal"] for a in assets.values()),
        "sponsor_group_curated_rate_industry": sum(r["sponsor_group_method"] != "SELF" for r in out_rows if r["is_industry"]) / max(1, sum(r["is_industry"] for r in out_rows)),
        "source_status": source_status,
        "sources": {
            "ClinicalTrials.gov API v2": "registry fields, arms, interventions, other names, sponsor class",
            "RxNorm / RxClass (U.S. National Library of Medicine)": "ingredient normalization, US-marketed flag, MED-RT mechanism of action, FDA established pharmacologic class",
            "ChEMBL (EMBL-EBI, CC BY-SA 3.0)": "canonical molecule IDs (exact synonym match, parent molecule), max phase, mechanisms, targets, gene symbols",
            "PubMed E-utilities (NCBI)": "publications mentioning the NCT identifier (metadata and links only)",
            "SEC EDGAR company tickers": "issuer CIK and ticker for sponsor groups by exact or unique-prefix normalized name",
        },
        "classification_validation": "docs/validation_heldout_v2.md",
        "limitations": [
            "Assets resolve only on exact ChEMBL/RxNorm name or synonym matches; unmatched investigational codes are retained as research codes.",
            "PubMed links are publications that mention the NCT ID; they are not necessarily the primary results paper.",
            "SEC tickers reflect current registrants; acquired or non-SEC-registered sponsors have no ticker.",
            "US-marketed flag reflects presence of RxNorm clinical/branded drug concepts, not current regulatory status.",
            "Sponsor parent groups come from a small curated table of long-standing subsidiaries plus registry-stated subsidiaries.",
            "Stop reasons are sponsor-reported registry text; when the registry reason is blank, a direct sentence from the registry description is used (stop_reason_source).",
        ],
    }
    (OUT / "oncology_failure_signals_v1_meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps({k: meta[k] for k in ["trial_count", "industry_trial_count", "industry_phase2_3_trial_count", "experimental_arm_drug_resolution_rate",
                                           "trials_with_resolved_focus_asset", "trials_with_focus_research_code", "trials_with_focus_asset_or_research_code", "trials_with_focus_target_gene", "trials_with_pubmed_publication", "industry_trials_with_sec_issuer", "unique_assets", "unique_assets_chembl", "source_status"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
