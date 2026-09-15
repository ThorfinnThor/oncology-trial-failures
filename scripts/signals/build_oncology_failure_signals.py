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
CODE_IN_TEXT = re.compile(r"(?<![A-Za-z0-9])([A-Za-z]{1,6}[- ]?\d{2,7}(?:[-][A-Za-z0-9]{1,4})?[A-Za-z]?)(?![A-Za-z0-9])")
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
def fetch_design(nct: str) -> dict | None:
    return get_json("ctgov", CTGOV.format(nct=nct), {"fields": CTGOV_FIELDS, "format": "json"})


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
        for piece in re.split(r"[;,/]| \+ |\+", item or ""):
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
    return any(g.get("conceptProperties") for g in groups)


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
    ap.add_argument("--step", choices=["ctgov", "rxnorm", "build", "all"], default="all")
    ap.add_argument("--max-seconds", type=float, default=150.0)
    ap.add_argument("--workers", type=int, default=4)
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
            for nct in pending:
                futures[pool.submit(fetch_design, nct)] = nct
            for fut in as_completed(futures):
                nct = futures[fut]
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
            for fut in as_completed(futures):
                lookups[futures[fut]] = fut.result()
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

    # 3. Assemble
    assets: dict[str, dict] = {}
    alias_to_asset: dict[str, str] = {}

    def make_asset(ing: dict) -> dict:
        aid = f"RXCUI:{ing['rxcui']}"
        return assets.setdefault(aid, {
            "asset_id": aid, "canonical_name": ing["name"], "id_source": "RxNorm", "rxcui": ing["rxcui"],
            "us_marketed_rxnorm": marketed.get(ing["rxcui"]), "mechanism_of_action_medrt": classes.get(ing["rxcui"], {}).get("moa", []),
            "pharmacologic_class_fda_epc": classes.get(ing["rxcui"], {}).get("epc", []), "aliases": set(), "nct_ids": set(),
        })

    def components_for(iv: dict) -> list[dict]:
        """One component per combination partner ('A + B'), otherwise one component
        whose aliases are the intervention name and its registry other names."""
        name = iv.get("name", "")
        if re.search(r"\s\+\s|\+", name):
            groups = [{"name": part.strip(), "other_names": []} for part in re.split(r"\s*\+\s*", name) if part.strip()]
        else:
            groups = [iv]
        comps = []
        for g in groups:
            cands = name_candidates(g)
            asset, method = None, "UNRESOLVED"
            for idx, cand in enumerate(cands):
                hit = lookups.get(cand)
                if hit:
                    asset, method = make_asset(hit["ingredient"]), ("RXNORM_NAME" if idx == 0 else "RXNORM_ALIAS")
                    break
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
        novel = [c for c in exp_components if not (c["asset"] and c["asset"]["us_marketed_rxnorm"] is True)]
        focus = novel or exp_components
        out_rows.append({
            "nct_id": rec["nct_id"],
            "brief_title": rec.get("brief_title"),
            "official_title": (ps.get("identificationModule") or {}).get("officialTitle"),
            "registry_url": rec.get("url"),
            "phases": split_semicolon(rec.get("phases")),
            "overall_status": rec.get("overall_status"),
            "why_stopped": rec.get("why_stopped"),
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
            "focus_mechanisms": sorted({m for c in focus if c["asset"] for m in c["asset"]["mechanism_of_action_medrt"]}),
            "focus_pharmacologic_classes": sorted({m for c in focus if c["asset"] for m in c["asset"]["pharmacologic_class_fda_epc"]}),
            "focus_includes_non_us_marketed": any(not (c["asset"] and c["asset"]["us_marketed_rxnorm"] is True) for c in focus),
            "evidence_links": [{"type": "REGISTRY", "url": rec.get("url")}],
            "enrichment_status": {"ctgov": bool(design), "rxnorm": source_status.get("rxnorm", "NOT_RUN"),
                                  "ncit": "PENDING_NETWORK", "chembl_targets": "PENDING_NETWORK", "pubmed": "PENDING_NETWORK", "sec_ticker": "PENDING_NETWORK"},
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
                 "why_stopped", "sponsor_group", "lead_sponsor_raw", "sponsor_class_ctgov", "is_industry", "focus_assets", "focus_asset_ids",
                 "focus_research_codes", "focus_mechanisms", "focus_pharmacologic_classes", "focus_includes_non_us_marketed", "conditions",
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
        "unique_assets": len(assets),
        "assets_with_repeated_safety_signal": sum(a["repeated_safety_signal"] for a in assets.values()),
        "assets_with_repeated_efficacy_signal": sum(a["repeated_efficacy_signal"] for a in assets.values()),
        "sponsor_group_curated_rate_industry": sum(r["sponsor_group_method"] != "SELF" for r in out_rows if r["is_industry"]) / max(1, sum(r["is_industry"] for r in out_rows)),
        "source_status": source_status,
        "sources": {
            "ClinicalTrials.gov API v2": "registry fields, arms, interventions, other names, sponsor class",
            "RxNorm / RxClass (U.S. National Library of Medicine)": "ingredient normalization, US-marketed flag, MED-RT mechanism of action, FDA established pharmacologic class",
        },
        "classification_validation": "docs/validation_heldout_v2.md",
        "limitations": [
            "Investigational compounds without an RxNorm ingredient remain unresolved to a canonical asset in v1; research codes from registry other-names are retained.",
            "US-marketed flag reflects presence of RxNorm clinical/branded drug concepts, not current regulatory status.",
            "Sponsor parent groups come from a small curated table of long-standing subsidiaries; tickers are not assigned in v1.",
        ],
    }
    (OUT / "oncology_failure_signals_v1_meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps({k: meta[k] for k in ["trial_count", "industry_trial_count", "industry_phase2_3_trial_count", "experimental_arm_drug_resolution_rate",
                                           "trials_with_resolved_focus_asset", "trials_with_focus_research_code", "trials_with_focus_asset_or_research_code", "unique_assets", "source_status"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
