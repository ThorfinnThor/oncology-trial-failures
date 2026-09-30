#!/usr/bin/env python3
"""Offline entity resolution for the trial universe using the local ChEMBL index.

For every drug component in every trial (arm roles from ClinicalTrials.gov):
  exact normalized match of the component name, its registry other names,
  parenthetical aliases and a cleaned form (dose/formulation words removed)
  against ChEMBL preferred names and synonyms of clinical-stage molecules.
Common chemotherapy regimen acronyms are expanded into their components.
Unique parent molecule -> resolved; several parents -> AMBIGUOUS; none -> UNRESOLVED.
Names ChEMBL cannot resolve are looked up in the NCI Thesaurus (research codes, recent agents);
an NCIt concept whose synonyms identify one ChEMBL molecule is linked to ChEMBL, otherwise the
NCIt concept is the entity and targets come from its definition (target_source NCIT_DEFINITION).

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
    assign_role, clean_drug_name, component_groups, intervention_roles, name_candidates, research_codes,
    shared_backbone)
from scripts.universe.chembl_index import load as load_chembl, norm  # noqa: E402
from scripts.universe.ncit_index import load as load_ncit  # noqa: E402
from scripts.universe.targets_lexicon import genes_from_definition  # noqa: E402

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
# Frequent registry abbreviations that are too short or ambiguous for index matching.
ABBREVIATIONS = {"s1": "tegafur", "tegafurgimeraciloteracil": "tegafur", "pld": "doxorubicin", "rc48": "disitamab vedotin",
                 "rc48adc": "disitamab vedotin", "nabpaclitaxel": "paclitaxel", "nabpaclitaxelabraxane": "paclitaxel",
                 "5fu": "fluorouracil", "bcg": "bcg live", "tice bcg": "bcg live", "araC": "cytarabine", "arac": "cytarabine", "atra": "tretinoin", "ctx": "cyclophosphamide"}
ADC_SUFFIX = re.compile(r"(vedotin|deruxtecan|govitecan|mafodotin|emtansine|soravtansine|tesirine|ozogamicin|duocarmazine|pasudotox|tirumotecan|samrotamab)\b", re.I)
CELL_HINT = re.compile(r"\b(car[- ]?t|car t|chimeric antigen|t[- ]cell therapy|tils?\b|tumou?r[- ]infiltrating|nk cell|dendritic cell)", re.I)
VACCINE_HINT = re.compile(r"\bvaccin", re.I)
SUPPORTIVE = re.compile(r"^(rescue medications?|supportive care|premedications?|g-?csf|granulocyte colony[- ]stimulating factor|"
                        r"lymphodepleting chemotherapy|lymphodepletion|conditioning (?:chemotherapy|regimen)|antiemetics?|"
                        r"pain medications?|concomitant medications?)$", re.I)
CLASS_PLACEHOLDER = re.compile(r"^(?:anti[- ]?)?(.{2,40}?)[- ](?:inhibitors?|antibod(?:y|ies)|blockers?|antagonists?|therapy|agents?)$", re.I)
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
    def __init__(self, chembl: dict, ncit: dict | None = None):
        self.ix = chembl
        self.ncit = ncit or {"names": {}, "concepts": {}}
        self.known_genes = {g for t in chembl["targets"].values() for g in t.get("gene_symbols", [])}
        self.cache: dict[tuple, tuple] = {}

    def _variants(self, cand: str):
        yield cand
        yield clean_drug_name(cand)
        stripped = re.sub(r"[™®]|\[[^\]]*\]", " ", cand)
        stripped = re.sub(r"\b(dose(?: level)?\s*\d+[a-z]?|cohort\s*\w+|part\s*[a-z0-9]+|arm\s*[a-z0-9]+)\b", " ", stripped, flags=re.I)
        stripped = re.sub(r"\b(in combination(?: with)?|combination(?: dose escalation| therapy)?|monotherapy|dose escalation|"
                          r"for infusion|for injection|injection|tablets?|capsules?|oral|intravenous|subcutaneous)\b.*$", " ", stripped, flags=re.I)
        yield re.sub(r"\s+", " ", stripped).strip(" ,;-")
        first = re.split(r"[\s(,;/]+", cand.strip())[0] if cand.strip() else ""
        if len(first) >= 7 and first.isalpha():
            yield first  # "Pegaspargase (PEG) Asparaginase" -> "Pegaspargase"
        yield re.sub(r"\b\d+(\.\d+)?\s*(mg|mcg|µg|g|ml|mg/m2|mg/kg)\b.*$", "", cand, flags=re.I)
        yield re.sub(r"\s+(for injection|injection|tablets?|capsules?|for oral suspension)$", "", cand, flags=re.I)
        abbr = ABBREVIATIONS.get(norm(cand))
        if abbr:
            yield abbr

    def lookup(self, cands: tuple) -> tuple[str | None, str, str]:
        """Returns (entity_id, status, source)."""
        if cands in self.cache:
            return self.cache[cands]
        status = "UNRESOLVED"
        # Very short variants (e.g. "PEG", "CAV") collide with unrelated synonyms; only curated abbreviations may be short.
        variants = [v for c in cands for v in self._variants(c) if v and (len(norm(v)) >= 4 or norm(v) in ABBREVIATIONS.values())]
        for v in variants:
            parents = self.ix["names"].get(norm(v))
            if parents and len(parents) == 1:
                return self._store(cands, ("CHEMBL:" + parents[0], "RESOLVED", "CHEMBL"))
            if parents:
                status = "AMBIGUOUS"
        for v in variants:
            codes = [c for c in self.ncit["names"].get(norm(v), []) if self._ncit_is_agent(self.ncit["concepts"][c])]
            if len(codes) != 1:
                continue
            concept = self.ncit["concepts"][codes[0]]
            linked = {p for syn in concept["synonyms"] if len(norm(syn)) >= 5 for p in self.ix["names"].get(norm(syn), [])}
            if len(linked) == 1:
                return self._store(cands, ("CHEMBL:" + next(iter(linked)), "RESOLVED", "NCIT_TO_CHEMBL"))
            return self._store(cands, ("NCIT:" + codes[0], "RESOLVED", "NCIT"))
        return self._store(cands, (None, status, ""))

    @staticmethod
    def _ncit_is_agent(concept: dict) -> bool:
        """Therapeutic agents only: gene products, antigens and generic concepts share names with drugs."""
        if concept["is_regimen"]:
            return False
        types = set(concept["semantic_types"])
        if "Pharmacologic Substance" in types:
            return not re.match(r"^(medication|drug|pharmaceutical preparations?|combination drug therapy)$", concept["name"], re.I)
        d = (concept.get("definition") or "").lower()
        return bool(re.search(r"antineoplastic|monoclonal antibody|vaccine|inhibitor of|therapeutic|immunomodulat|cell therapy|conjugate", d))

    def _store(self, key, value):
        self.cache[key] = value
        return value

    def component(self, group: dict, iv_type: str) -> dict:
        label_cands = tuple(name_candidates({"name": group.get("name", ""), "other_names": []}))
        all_cands = tuple(name_candidates(group))
        label = group.get("name", "")
        clean_label = label.strip()
        if GENERIC.match(clean_label) or SUPPORTIVE.match(clean_label):
            return {"label": label, "status": "GENERIC" if GENERIC.match(clean_label) else "SUPPORTIVE",
                    "entity_id": None, "chembl_id": None, "modality": "Unknown", "research_codes": [], "target_genes": [], "target_names": []}
        cell = re.match(r"^(.{2,40}?)[- ](?:targeted |directed |specific )?(?:car[- ]?t|car[- ]?nk|car)[- ]?(?:cells?|cell therapy)?$", clean_label, re.I)
        if cell:
            genes = genes_from_definition(cell.group(1), self.known_genes)
            if genes:
                return {"label": label, "status": "CLASS_ONLY", "entity_id": None, "entity_source": "LABEL_CLASS", "chembl_id": None,
                        "modality": "Cell therapy", "research_codes": [], "target_genes": genes, "target_names": genes,
                        "target_source": "LABEL_CLASS"}
        m = CLASS_PLACEHOLDER.match(clean_label)
        if m and not research_codes(group):
            genes = genes_from_definition(m.group(1), self.known_genes)
            if genes:
                return {"label": label, "status": "CLASS_ONLY", "entity_id": None, "entity_source": "LABEL_CLASS", "chembl_id": None,
                        "modality": "Unknown", "research_codes": [], "target_genes": genes, "target_names": genes,
                        "target_source": "LABEL_CLASS"}
        eid, status, source = self.lookup(label_cands) if label_cands else (None, "UNRESOLVED", "")
        if not eid and not research_codes({"name": group.get("name", ""), "other_names": []}) and all_cands != label_cands:
            # Registry other names often list combination partners; use them only when the label has no own research code.
            # Accept only when every resolvable other name points to one and the same drug.
            other = [c for c in all_cands if c not in label_cands]
            hits = {self.lookup((c,))[0] for c in other} - {None}
            if len(hits) == 1:
                eid = next(iter(hits))
                source = ("CHEMBL" if eid.startswith("CHEMBL:") else "NCIT") + "_VIA_OTHER_NAME"
                status = "RESOLVED"
        base = {"label": label, "status": status, "entity_id": eid, "entity_source": source, "research_codes": research_codes(group)}
        if eid and eid.startswith("CHEMBL:"):
            cid = eid.split(":", 1)[1]
            mol = self.ix["molecules"].get(cid) or {}
            mechs = self.ix["mechanisms"].get(cid, [])
            tids = sorted({m["target_chembl_id"] for m in mechs if m.get("target_chembl_id")})
            genes = sorted({g for t in tids for g in (self.ix["targets"].get(t) or {}).get("gene_symbols", [])})
            target_source = "CHEMBL_MECHANISM" if genes else None
            if not genes and mol.get("pref_name"):
                # ChEMBL has no mechanism yet (common for recent agents): take targets from the NCIt definition.
                codes = [c for c in self.ncit["names"].get(norm(mol["pref_name"]), []) if self._ncit_is_agent(self.ncit["concepts"][c])]
                if len(codes) == 1:
                    genes = genes_from_definition(self.ncit["concepts"][codes[0]]["definition"], self.known_genes)
                    target_source = "NCIT_DEFINITION" if genes else None
            return {**base, "chembl_id": cid, "name": mol.get("pref_name"), "max_phase": mol.get("max_phase"),
                    "molecule_type": mol.get("molecule_type"), "modality": modality(label, mol, iv_type),
                    "mechanisms": sorted({m["mechanism_of_action"] for m in mechs if m.get("mechanism_of_action")}),
                    "target_ids": tids,
                    "target_names": sorted({(self.ix["targets"].get(t) or {}).get("pref_name") for t in tids} - {None}),
                    "target_genes": genes, "target_source": target_source}
        if eid and eid.startswith("NCIT:"):
            concept = self.ncit["concepts"][eid.split(":", 1)[1]]
            genes = genes_from_definition(concept["definition"], self.known_genes)
            return {**base, "chembl_id": None, "ncit_code": eid.split(":", 1)[1], "name": concept["name"], "max_phase": None,
                    "molecule_type": None, "modality": ncit_modality(concept, label, iv_type), "mechanisms": [],
                    "target_ids": [], "target_names": genes, "target_genes": genes,
                    "target_source": "NCIT_DEFINITION" if genes else None, "definition": concept["definition"]}
        codes = base["research_codes"]
        if status == "UNRESOLVED" and len(codes) == 1:
            # Stable identity for an investigational code not yet in ChEMBL or NCIt (links its trials together).
            return {**base, "status": "CODE_ONLY", "entity_id": "CODE:" + codes[0], "entity_source": "RESEARCH_CODE", "chembl_id": None,
                    "modality": modality(label, None, iv_type), "target_genes": [], "target_names": []}
        return {**base, "chembl_id": None, "modality": modality(label, None, iv_type), "target_genes": [], "target_names": []}


def ncit_modality(concept: dict, label: str, iv_type: str) -> str:
    d = (concept.get("definition") or "").lower()
    if "antibody-drug conjugate" in d or "antibody drug conjugate" in d or ADC_SUFFIX.search(concept.get("name") or ""):
        return "ADC"
    if "bispecific" in d or "trispecific" in d:
        return "Bispecific antibody"
    if "oncolytic" in d:
        return "Oncolytic virus"
    if "vaccine" in d:
        return "Vaccine"
    if re.search(r"\b(car[- ]?t|chimeric antigen receptor|t cells?|nk cells?|natural killer|dendritic cells?)\b", d):
        return "Cell therapy"
    if "monoclonal antibody" in d or "antibody" in d:
        return "Antibody"
    if "fusion protein" in d or "cytokine" in d or "interleukin" in d:
        return "Protein"
    if re.search(r"\b(inhibitor|small molecule|orally bioavailable|agonist|antagonist)\b", d):
        return "Small molecule"
    return modality(label, None, iv_type)


def expand_regimen(group: dict, ncit: dict | None = None) -> list[dict]:
    label = group.get("name", "")
    key = norm(re.sub(r"\(.*?\)", "", label))
    if key in REGIMENS:
        return [{"name": d, "other_names": [], "regimen": label} for d in REGIMENS[key]]
    if ncit:
        codes = [c for c in ncit["names"].get(key, []) if ncit["concepts"][c]["is_regimen"]]
        if len(codes) == 1:
            name = re.sub(r"\s*Regimen$", "", ncit["concepts"][codes[0]]["name"])
            parts = [p.strip() for p in re.split(r"/| and ", name) if p.strip()]
            if len(parts) > 1:
                return [{"name": p, "other_names": [], "regimen": label} for p in parts]
    return [group]


def resolve_trial(rec: dict, resolver: Resolver) -> dict:
    design = {"protocolSection": {"armsInterventionsModule": rec.pop("arms_interventions", {}) or {}}}
    ivs = []
    rows = intervention_roles(design)
    roles = [assign_role(iv, None)[0] for iv in rows]
    backbone = shared_backbone(design, rows, roles)
    for index, (iv, role) in enumerate(zip(rows, roles)):
        if index in backbone:
            role = "BACKGROUND_OR_BACKBONE"
        comps = []
        if role not in ("PLACEBO", "NON_DRUG"):
            for g in component_groups(iv):
                for g2 in expand_regimen(g, resolver.ncit):
                    c = resolver.component(g2, iv.get("type", ""))
                    if g2.get("regimen"):
                        c["regimen"] = g2["regimen"]
                    comps.append(c)
        ivs.append({"name": iv["name"], "type": iv["type"], "arm_types": iv["arm_types"], "role": role, "components": comps})
    exp = [c for i in ivs if i["role"] == "EXPERIMENTAL_ARM" for c in i["components"]]
    novel = [c for c in exp if not (c.get("max_phase") and float(c["max_phase"]) >= 4)]
    focus = novel or exp
    specific = [c for c in exp if c["status"] not in ("GENERIC", "SUPPORTIVE")]
    rec.update({
        "interventions": ivs,
        "focus_components": [c.get("name") or c["label"] for c in focus],
        "focus_chembl_ids": sorted({c["chembl_id"] for c in focus if c.get("chembl_id")}),
        "focus_entity_ids": sorted({c["entity_id"] for c in focus if c.get("entity_id")}),
        "focus_target_genes": sorted({g for c in focus for g in c.get("target_genes", [])}),
        "focus_modalities": sorted({c["modality"] for c in focus}),
        "experimental_target_genes": sorted({g for c in exp for g in c.get("target_genes", [])}),
        "experimental_chembl_ids": sorted({c["chembl_id"] for c in exp if c.get("chembl_id")}),
        "experimental_entity_ids": sorted({c["entity_id"] for c in exp if c.get("entity_id")}),
        "experimental_components_total": len(specific),
        "experimental_components_resolved": sum(1 for c in specific if c["status"] == "RESOLVED"),
    })
    return rec


def main() -> int:
    resolver = Resolver(load_chembl(), load_ncit())
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
                    if c["status"] in ("GENERIC", "SUPPORTIVE"):
                        continue
                    seg = ("onc" if onc else "other") + ("_industry" if industry else "_nonindustry")
                    counts[seg + "_total"] += 1
                    counts[seg + "_resolved"] += c["status"] == "RESOLVED"
                    counts[seg + "_with_target"] += bool(c.get("target_genes"))
                    counts[seg + "_identified"] += c["status"] in ("RESOLVED", "CODE_ONLY", "CLASS_ONLY")
                    counts[seg + "_src_" + (c.get("entity_source") or "none")] += 1
                    if onc and industry and c["status"] not in ("RESOLVED", "CODE_ONLY", "CLASS_ONLY"):
                        unresolved[c["label"]] += 1
    OUT.with_name(OUT.name + ".tmp").replace(OUT)
    rate = lambda s: round(counts[s + "_resolved"] / max(1, counts[s + "_total"]), 3)
    summary = {s: {"components": counts[s + "_total"], "resolution_rate": rate(s),
                   "identified_rate": round(counts[s + "_identified"] / max(1, counts[s + "_total"]), 3),
                   "with_target_rate": round(counts[s + "_with_target"] / max(1, counts[s + "_total"]), 3),
                   "by_source": {k.split("_src_")[1]: v for k, v in counts.items() if k.startswith(s + "_src_")}} for s in ["onc_industry", "onc_nonindustry", "other_industry", "other_nonindustry"]}
    (ROOT / ".cache/universe/resolution_report.json").write_text(json.dumps({"summary": summary, "top_unresolved_oncology_industry": unresolved.most_common(300)}, indent=1))
    print(json.dumps(summary, indent=1))
    print("top unresolved (oncology, industry):", unresolved.most_common(40))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
