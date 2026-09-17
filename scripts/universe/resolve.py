#!/usr/bin/env python3
"""Offline entity resolution for the trial universe using the local ChEMBL index.

For every drug component in every trial (arm roles from ClinicalTrials.gov):
  exact normalized match of the component name, its registry other names,
  parenthetical aliases and a cleaned form (dose/formulation words removed)
  against ChEMBL preferred names and synonyms of clinical-stage molecules.
Common chemotherapy regimen acronyms are expanded into their components.
Unique parent molecule -> resolved; several parents -> AMBIGUOUS; none -> UNRESOLVED.

Adds per component: chembl_id, name, max_phase, molecule_type, modality,
mechanisms, target IDs/names, gene symbols. Adds per trial: resolved focus
components, target genes, modalities and a resolution summary.
"""
from __future__ import annotations

import gzip
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.build_oncology_failure_signals import (  # noqa: E402
    assign_role, clean_drug_name, component_groups, intervention_roles, name_candidates, research_codes)
from scripts.universe.chembl_index import load as load_chembl, norm  # noqa: E402

UNIVERSE = ROOT / ".cache/universe/universe_v1.jsonl.gz"
OUT = ROOT / ".cache/universe/universe_resolved_v1.jsonl.gz"

REGIMENS = {
    "folfox": ["fluorouracil", "leucovorin", "oxaliplatin"], "mfolfox6": ["fluorouracil", "leucovorin", "oxaliplatin"],
    "folfiri": ["fluorouracil", "leucovorin", "irinotecan"], "folfirinox": ["fluorouracil", "leucovorin", "irinotecan", "oxaliplatin"],
    "mfolfirinox": ["fluorouracil", "leucovorin", "irinotecan", "oxaliplatin"], "capox": ["capecitabine", "oxaliplatin"],
    "xelox": ["capecitabine", "oxaliplatin"], "rchop": ["rituximab", "cyclophosphamide", "doxorubicin", "vincristine", "prednisone"],
    "chop": ["cyclophosphamide", "doxorubicin", "vincristine", "prednisone"], "abvd": ["doxorubicin", "bleomycin", "vinblastine", "dacarbazine"],
    "bep": ["bleomycin", "etoposide", "cisplatin"], "gemcis": ["gemcitabine", "cisplatin"], "flot": ["fluorouracil", "leucovorin", "oxaliplatin", "docetaxel"],
    "ac": ["doxorubicin", "cyclophosphamide"], "ec": ["epirubicin", "cyclophosphamide"], "tc": ["docetaxel", "cyclophosphamide"],
    "vrd": ["bortezomib", "lenalidomide", "dexamethasone"], "rvd": ["bortezomib", "lenalidomide", "dexamethasone"],
}
ADC_SUFFIX = re.compile(r"(vedotin|deruxtecan|govitecan|mafodotin|emtansine|soravtansine|tesirine|ozogamicin|duocarmazine|pasudotox|tirumotecan|samrotamab)\b", re.I)
CELL_HINT = re.compile(r"\b(car[- ]?t|car t|chimeric antigen|t[- ]cell therapy|tils?\b|tumou?r[- ]infiltrating|nk cell|dendritic cell)", re.I)
VACCINE_HINT = re.compile(r"\bvaccin", re.I)
GENERIC = re.compile(r"^(chemotherapy|standard (of )?care|investigator'?s? choice|physician'?s? choice|best supportive care|placebo|"
                     r"standard chemotherapy|platinum[- ]based chemotherapy|platinum doublet|hormone therapy|endocrine therapy|"
                     r"radiotherapy|radiation|surgery|observation)$", re.I)


def modality(name: str, mol: dict | None, iv_type: str) -> str:
    if ADC_SUFFIX.search(name or "") or ADC_SUFFIX.search((mol or {}).get("pref_name") or ""):
        return "ADC"
    if CELL_HINT.search(name or "") or (mol or {}).get("molecule_type") == "Cell":
        return "Cell therapy"
    if VACCINE_HINT.search(name or ""):
        return "Vaccine"
    mt = (mol or {}).get("molecule_type")
    if mt and "conjugate" in mt.lower():
        return "ADC"
    return {"Small molecule": "Small molecule", "Antibody": "Antibody", "Protein": "Protein", "Oligonucleotide": "Oligonucleotide",
            "Gene": "Gene therapy", "Enzyme": "Protein"}.get(mt, "Unknown" if not mol else mt or "Unknown")


class Resolver:
    def __init__(self, index: dict):
        self.ix = index
        self.cache: dict[tuple, tuple] = {}

    def lookup(self, cands: tuple) -> tuple[str | None, str]:
        if cands in self.cache:
            return self.cache[cands]
        status = "UNRESOLVED"
        for cand in cands:
            for variant in (cand, clean_drug_name(cand), re.sub(r"\b\d+(\.\d+)?\s*(mg|mcg|µg|g|ml|mg/m2|mg/kg)\b.*$", "", cand, flags=re.I)):
                parents = self.ix["names"].get(norm(variant))
                if parents and len(parents) == 1:
                    self.cache[cands] = (parents[0], "RESOLVED")
                    return self.cache[cands]
                if parents:
                    status = "AMBIGUOUS"
        self.cache[cands] = (None, status)
        return self.cache[cands]

    def component(self, group: dict, iv_type: str) -> dict:
        cands = tuple(name_candidates(group))
        label = group.get("name", "")
        if GENERIC.match(label.strip()):
            return {"label": label, "status": "GENERIC", "chembl_id": None, "modality": "Unknown", "research_codes": []}
        cid, status = self.lookup(cands) if cands else (None, "UNRESOLVED")
        mol = self.ix["molecules"].get(cid) if cid else None
        mechs = self.ix["mechanisms"].get(cid, []) if cid else []
        tids = sorted({m["target_chembl_id"] for m in mechs if m.get("target_chembl_id")})
        genes = sorted({g for t in tids for g in (self.ix["targets"].get(t) or {}).get("gene_symbols", [])})
        return {
            "label": label, "status": status, "chembl_id": cid,
            "name": (mol or {}).get("pref_name"), "max_phase": (mol or {}).get("max_phase"),
            "molecule_type": (mol or {}).get("molecule_type"), "modality": modality(label, mol, iv_type),
            "mechanisms": sorted({m["mechanism_of_action"] for m in mechs if m.get("mechanism_of_action")}),
            "target_ids": tids, "target_names": sorted({(self.ix["targets"].get(t) or {}).get("pref_name") for t in tids} - {None}),
            "target_genes": genes, "research_codes": research_codes(group),
        }


def expand_regimen(group: dict) -> list[dict]:
    key = norm(re.sub(r"\(.*?\)", "", group.get("name", "")))
    if key in REGIMENS:
        return [{"name": d, "other_names": [], "regimen": group.get("name")} for d in REGIMENS[key]]
    return [group]


def resolve_trial(rec: dict, resolver: Resolver) -> dict:
    design = {"protocolSection": {"armsInterventionsModule": rec.pop("arms_interventions", {}) or {}}}
    ivs = []
    for iv in intervention_roles(design):
        role, _ = assign_role(iv, None)
        comps = []
        if role not in ("PLACEBO", "NON_DRUG"):
            for g in component_groups(iv):
                for g2 in expand_regimen(g):
                    c = resolver.component(g2, iv.get("type", ""))
                    if g2.get("regimen"):
                        c["regimen"] = g2["regimen"]
                    comps.append(c)
        ivs.append({"name": iv["name"], "type": iv["type"], "arm_types": iv["arm_types"], "role": role, "components": comps})
    exp = [c for i in ivs if i["role"] == "EXPERIMENTAL_ARM" for c in i["components"]]
    novel = [c for c in exp if not (c.get("max_phase") and float(c["max_phase"]) >= 4)]
    focus = novel or exp
    specific = [c for c in exp if c["status"] != "GENERIC"]
    rec.update({
        "interventions": ivs,
        "focus_components": [c.get("name") or c["label"] for c in focus],
        "focus_chembl_ids": sorted({c["chembl_id"] for c in focus if c.get("chembl_id")}),
        "focus_target_genes": sorted({g for c in focus for g in c.get("target_genes", [])}),
        "focus_modalities": sorted({c["modality"] for c in focus}),
        "experimental_target_genes": sorted({g for c in exp for g in c.get("target_genes", [])}),
        "experimental_chembl_ids": sorted({c["chembl_id"] for c in exp if c.get("chembl_id")}),
        "experimental_components_total": len(specific),
        "experimental_components_resolved": sum(1 for c in specific if c["status"] == "RESOLVED"),
    })
    return rec


def main() -> int:
    index = load_chembl()
    resolver = Resolver(index)
    counts = Counter()
    unresolved = Counter()
    with gzip.open(UNIVERSE, "rt", encoding="utf-8") as fh, gzip.open(OUT.with_name(OUT.name + ".tmp"), "wt", encoding="utf-8") as out:
        for line in fh:
            rec = resolve_trial(json.loads(line), resolver)
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            onc = "Oncology" in (rec.get("disease_areas_matched") or rec.get("disease_area") or "")
            industry = rec.get("lead_sponsor_class") == "INDUSTRY"
            for i in rec["interventions"]:
                if i["role"] != "EXPERIMENTAL_ARM":
                    continue
                for c in i["components"]:
                    if c["status"] == "GENERIC":
                        continue
                    seg = ("onc" if onc else "other") + ("_industry" if industry else "_nonindustry")
                    counts[seg + "_total"] += 1
                    counts[seg + "_resolved"] += c["status"] == "RESOLVED"
                    if onc and industry and c["status"] != "RESOLVED":
                        unresolved[c["label"]] += 1
    OUT.with_name(OUT.name + ".tmp").replace(OUT)
    rate = lambda s: round(counts[s + "_resolved"] / max(1, counts[s + "_total"]), 3)
    summary = {s: {"components": counts[s + "_total"], "resolution_rate": rate(s)} for s in ["onc_industry", "onc_nonindustry", "other_industry", "other_nonindustry"]}
    (ROOT / ".cache/universe/resolution_report.json").write_text(json.dumps({"summary": summary, "top_unresolved_oncology_industry": unresolved.most_common(300)}, indent=1))
    print(json.dumps(summary, indent=1))
    print("top unresolved (oncology, industry):", unresolved.most_common(40))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
