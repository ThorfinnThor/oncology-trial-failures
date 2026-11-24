#!/usr/bin/env python3
"""The drugs of every stopped trial under one standard name, for the public dataset and the packages.

Reads the resolved trial universe (.cache/universe/universe_resolved_v1.jsonl.gz, written by
resolve.py in the weekly run: interventional Phase 2/3 trials started 2010 or later, all areas) and
writes, per stopped trial in data/all_stopped_trials.csv:

  drugs_tested       what the experimental arms received that the control arms did not, i.e. the
                     difference between the arms (CLAUDE.md rule 8), under its standard name
                     ("Pembrolizumab" for "MK-3475", "Keytruda 200 mg" or "pembrolizumab inj.")
  drugs_background   what the control arm received too (the shared backbone): never "tested"
  drugs_comparator   what only the control arms received
  drug_ncit_codes    NCI Thesaurus codes of the tested drugs, where one identifies the drug
  drug_rxcuis        RxNorm ingredient codes, for drugs named from RxNorm
  drugs_unresolved   tested drugs no terminology identified, as the registry lists them
  drug_resolution    RESOLVED (every tested drug identified by name), PARTIAL, CODE_OR_CLASS_ONLY
                     (a research code or a drug class, no standard name), UNRESOLVED, NO_DRUG, or
                     NOT_COVERED (outside the universe: Phase 1, Phase 4, or started before 2010)
  drug_name_source   where the standard names come from: NCIt, RxNorm, or both

Rights (docs/provenance_and_rights.md, decided 24 Nov 2026): nothing from ChEMBL leaves in this
table, not even names. ChEMBL is CC BY-SA 3.0; its ShareAlike condition does not fit the CC BY-NC
public dataset or a commercial licence, and 3.0 does not settle database rights. ChEMBL is used only
inside the resolver, to recognise a drug; the name written out is the NCI Thesaurus preferred name
(CC BY 4.0) or the RxNorm ingredient (NLM, public domain). A drug neither names is written as the
registry lists it and counts as unresolved. Mechanism and target stay in the licensed signals product.

Output: data/trial_drugs.csv (and web/public/trial_drugs.csv, published like the dataset).
"""
from __future__ import annotations

import csv
import gzip
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

RESOLVED = ROOT / ".cache/universe/universe_resolved_v1.jsonl.gz"
EXTRA = ROOT / ".cache/universe/stopped_extra_resolved.jsonl.gz"
STOPPED = ROOT / "data/all_stopped_trials.csv"
OUT = ROOT / "data/trial_drugs.csv"
PUBLIC = ROOT / "web/public/trial_drugs.csv"
FIELDS = ["nct_id", "drugs_tested", "drugs_background", "drugs_comparator", "drug_ncit_codes", "drug_rxcuis",
          "drug_resolution", "drug_name_source", "drugs_unresolved"]
SKIP = {"GENERIC", "SUPPORTIVE", "NON_DRUG"}
# Registry "interventions" that are assays, samples, procedures or a standard-of-care placeholder: not a
# drug, so neither tested nor unresolved (they made trials look unresolved: "gene expression analysis",
# "polymerase chain reaction", "blood sample", "SOC").
NON_DRUG_LABEL = re.compile(
    r"\b(laboratory biomarker analysis|biomarker analysis|gene expression analysis|polymerase chain reaction|pcr|"
    r"microarray analysis|flow cytometry|immunohistochemistry|immunoenzyme technique|sequencing|genotyping|"
    r"pharmacological study|pharmacokinetic study|pharmacogenomic study|quality[- ]of[- ]life assessment|"
    r"questionnaire administration|survey administration|blood samples?|biospecimen collection|tissue samples?|"
    r"diagnostic imaging|computed tomography|magnetic resonance imaging|positron emission tomography|"
    r"cognitive assessment|counseling|educational intervention|best available therapy|"
    r"standard of care|standard[- ]of[- ]care|soc|usual care|no intervention|observation|"
    r"protein expression analysis|western blotting|"
    r"(?:autologous |allogeneic )?(?:hematopoietic |haematopoietic |peripheral blood )?stem cell transplant(?:ation)?|"
    r"bone marrow transplant(?:ation)?)\b", re.I)
# A class or a generic description, not one drug: identified as a class, not "unresolved".
CLASS_LABEL = re.compile(
    r"^(treatment|therapy|systemic chemotherapy|chemotherapy|immunotherapy|corticosteroids?|antibiotics?|"
    r"antivirals?|vaccines?|influenza vaccine|stem cells?|mesenchymal (?:stem|stromal) cells|car-?t|dc vaccine|"
    r"dendritic cell vaccine|convalescent plasma|targeted therapy|hormone therapy|anticoagulants?)$", re.I)


DRUG_COLUMNS = ["drugs_tested", "drugs_background", "drugs_comparator", "drug_ncit_codes", "drug_resolution"]


def load_trial_drugs(path: Path = OUT) -> dict[str, dict]:
    """nct_id -> drug columns, for the samples and packages. A trial not in the table (or no table
    yet) reads as NOT_COVERED, so a build never fails for want of it."""
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as fh:
        return {r["nct_id"]: {k: r.get(k, "") for k in DRUG_COLUMNS} for r in csv.DictReader(fh)}


def drug_fields(table: dict[str, dict], nct: str) -> dict:
    return table.get(nct) or {"drugs_tested": "", "drugs_background": "", "drugs_comparator": "",
                              "drug_ncit_codes": "", "drug_resolution": "NOT_COVERED"}


def display_name(component: dict) -> str:
    """ChEMBL writes names in capitals ("TRASTUZUMAB DERUXTECAN"); NCIt in normal case. Codes keep
    their capitals ("AZD9291"), everything else is written as a sentence."""
    name = component.get("name")
    if component.get("status") == "CODE_ONLY":
        return (component.get("entity_id") or "").removeprefix("CODE:") or component.get("label", "")
    if not name:
        return ""
    if name.isupper():
        words = [w if re.search(r"\d", w) else w.lower() for w in name.split()]
        name = " ".join(words)
        name = name[:1].upper() + name[1:]
    return re.sub(r"\s+anhydrous$", "", name, flags=re.I)


def ncit_code(component: dict, ncit: dict | None, norm) -> str:
    if component.get("ncit_code"):
        return "NCIT:" + component["ncit_code"]
    if ncit and component.get("name"):
        codes = [c for c in ncit["names"].get(norm(component["name"]), [])
                 if not ncit["concepts"][c]["is_regimen"]
                 and "Pharmacologic Substance" in set(ncit["concepts"][c]["semantic_types"])]
        if len(codes) == 1:
            return "NCIT:" + codes[0]
    return ""


def unresolved_status(c: dict) -> bool:
    return c.get("status") in ("UNRESOLVED", "AMBIGUOUS")


def from_chembl(c: dict) -> bool:
    return c.get("status") == "RESOLVED" and "CHEMBL" in (c.get("entity_source") or "")


def ncit_is_agent(concept: dict) -> bool:
    from scripts.universe.resolve import Resolver
    return Resolver._ncit_is_agent(concept)


def chembl_to_ncit(ncit: dict, chembl_names: dict) -> dict[str, list[str]]:
    """ChEMBL parent ID -> NCIt agent concepts one of whose synonyms names that molecule and no other.
    Used only to find the NCIt concept of a drug ChEMBL recognised; nothing of ChEMBL is written."""
    from scripts.universe.chembl_index import norm
    out: dict[str, list[str]] = {}
    for code, concept in ncit["concepts"].items():
        if not ncit_is_agent(concept):
            continue
        linked = {p for syn in concept["synonyms"] if len(norm(syn)) >= 5 for p in chembl_names.get(norm(syn), [])}
        if len(linked) == 1:
            out.setdefault(next(iter(linked)), []).append(code)
    return out


def pick_ncit(ncit: dict, codes: list[str]) -> str | None:
    """One concept, or the base form when every candidate is the same molecule (salt and base:
    "Sunitinib" before "Sunitinib Malate"): the shortest preferred name, if it is contained in the others."""
    if len(codes) == 1:
        return codes[0]
    if not codes:
        return None
    names = sorted(((ncit["concepts"][c]["name"], c) for c in codes), key=lambda x: (len(x[0]), x[0]))
    base = names[0][0].lower()
    return names[0][1] if all(n.lower().startswith(base) for n, _ in names[1:]) else None


def rename_from_ncit(rec: dict, ncit: dict | None, norm, chembl_names: dict | None = None,
                     by_chembl: dict | None = None) -> None:
    """Replace every ChEMBL name by the NCI Thesaurus preferred name of the same drug. Tried in order:
    the NCIt concepts ChEMBL's name or the registry label point to (narrowed to those that name the same
    ChEMBL molecule), then the NCIt concepts linked to that molecule. What NCIt does not name loses its
    ChEMBL name; prepare() then tries RxNorm and the research code. Nothing of ChEMBL is written."""
    from scripts.universe.resolve import Resolver
    for iv in rec.get("interventions") or []:
        for c in iv.get("components") or []:
            if not from_chembl(c):
                continue
            cid = c.get("chembl_id")
            code = None
            if ncit:
                keys = [v for key in (c.get("name") or "", c.get("label") or "") if key
                        for v in [key, *Resolver._variants(None, key)] if v and len(norm(v)) >= 4]
                for key in keys:
                    codes = [x for x in ncit["names"].get(norm(key), []) if ncit_is_agent(ncit["concepts"][x])]
                    if chembl_names is not None and cid and len(codes) > 1:
                        same = [x for x in codes if cid in {p for syn in ncit["concepts"][x]["synonyms"]
                                                            if len(norm(syn)) >= 5 for p in chembl_names.get(norm(syn), [])}]
                        codes = same or codes
                    code = pick_ncit(ncit, codes)
                    if code:
                        break
                if not code and by_chembl and cid:
                    code = pick_ncit(ncit, by_chembl.get(cid, []))
            if code:
                c.update({"name": ncit["concepts"][code]["name"], "ncit_code": code, "entity_id": "NCIT:" + code,
                          "entity_source": "NCIT_RENAMED"})
            else:
                c.update({"status": "UNRESOLVED", "match_name": c.get("name"), "name": None, "entity_id": None,
                          "entity_source": "NAME_NOT_WRITTEN"})
            for k in ("chembl_id", "mechanisms", "target_ids", "target_names", "target_genes", "molecule_type"):
                c.pop(k, None)


def prepare(rec: dict, rxmap: dict[str, dict]) -> None:
    """Drop assays and placeholders, then name what NCIt could not, from RxNorm."""
    for iv in rec.get("interventions") or []:
        for c in iv.get("components") or []:
            label = c.get("label") or ""
            if NON_DRUG_LABEL.search(label) and c.get("status") != "RESOLVED":
                c["status"] = "NON_DRUG"
            elif unresolved_status(c) and CLASS_LABEL.match(label.strip()):
                c["status"] = "CLASS_ONLY"
            elif unresolved_status(c) and (label.lower() in rxmap or (c.get("match_name") or "").lower() in rxmap):
                hit = rxmap.get(label.lower()) or rxmap[c["match_name"].lower()]
                c.update({"status": "RESOLVED", "name": hit["name"], "entity_source": "RXNORM", "rxcui": hit["rxcui"]})
            elif c.get("entity_source") == "NAME_NOT_WRITTEN" and len(c.get("research_codes") or []) == 1:
                # A research code the registry itself gives ("MK-2206"): an identity, not a standard name.
                c.update({"status": "CODE_ONLY", "entity_id": "CODE:" + c["research_codes"][0]})
            c.pop("match_name", None)


def summarise(rec: dict, ncit: dict | None, norm) -> dict:
    by_role: dict[str, list[dict]] = {"EXPERIMENTAL_ARM": [], "BACKGROUND_OR_BACKBONE": [], "COMPARATOR": []}
    for iv in rec.get("interventions") or []:
        if iv.get("role") in by_role:
            by_role[iv["role"]] += [c for c in iv.get("components") or [] if c.get("status") not in SKIP]

    def names(comps: list[dict], resolved_only: bool = False) -> list[str]:
        out: list[str] = []
        for c in comps:
            if c.get("status") == "RESOLVED":
                n = display_name(c)
            elif resolved_only:
                continue
            else:
                n = display_name(c) or c.get("label", "")
            if n and n.lower() not in {x.lower() for x in out}:
                out.append(n)
        return out

    tested = by_role["EXPERIMENTAL_ARM"]
    statuses = [c.get("status") for c in tested]
    if not tested:
        resolution = "NO_DRUG"
    elif all(s == "RESOLVED" for s in statuses):
        resolution = "RESOLVED"
    elif any(s == "RESOLVED" for s in statuses):
        resolution = "PARTIAL"
    elif any(s in ("CODE_ONLY", "CLASS_ONLY") for s in statuses):
        resolution = "CODE_OR_CLASS_ONLY"
    else:
        resolution = "UNRESOLVED"
    def source(c: dict) -> str:
        if from_chembl(c) and not c.get("ncit_code"):
            raise ValueError(f"{rec['nct_id']}: a ChEMBL name reached the export")  # rename_from_ncit runs first
        return "RxNorm" if c.get("entity_source") == "RXNORM" else "NCIt"
    sources = sorted({source(c) for c in tested if c.get("status") == "RESOLVED"})
    rxcuis = sorted({"RXCUI:" + c["rxcui"] for c in tested if c.get("rxcui")})
    unresolved = sorted({c.get("label", "") for c in tested if unresolved_status(c)} - {""})
    codes = []
    background_lower = {b.lower() for b in names(by_role["BACKGROUND_OR_BACKBONE"]) + names(by_role["COMPARATOR"])}
    for c in tested:
        if c.get("status") == "RESOLVED" and display_name(c).lower() not in background_lower:
            code = ncit_code(c, ncit, norm)
            if code and code not in codes:
                codes.append(code)
    # A drug the control arms received too is background, also when an experimental arm lists it
    # again in a combination ("Deferasirox + Azacitidine" against "Azacitidine"): rule 8.
    background = names(by_role["BACKGROUND_OR_BACKBONE"]) + names(by_role["COMPARATOR"])
    tested_names = [n for n in names(tested) if n.lower() not in {b.lower() for b in background}]
    return {"nct_id": rec["nct_id"], "drugs_tested": "; ".join(tested_names),
            "drugs_background": "; ".join(names(by_role["BACKGROUND_OR_BACKBONE"])),
            "drugs_comparator": "; ".join(names(by_role["COMPARATOR"])),
            "drug_ncit_codes": "; ".join(codes), "drug_rxcuis": "; ".join(rxcuis), "drug_resolution": resolution,
            "drug_name_source": " + ".join(sources), "drugs_unresolved": "; ".join(unresolved)}


def rxnorm_names(records, budget: float) -> dict[str, dict]:
    """label (lower case) -> {"name", "rxcui"} for experimental-arm components NCIt left unresolved,
    and for any component whose ChEMBL name was not written (rename_from_ncit), from RxNorm (NLM): the
    ingredient a name normalises to. Cached by the HTTP cache, so a later run only asks for new names;
    the time budget keeps a first run inside the weekly run."""
    import time
    from concurrent.futures import ThreadPoolExecutor
    from scripts.signals.build_oncology_failure_signals import rxnorm_lookup
    labels = sorted({(key or "").strip() for rec in records for iv in rec.get("interventions") or []
                     for c in iv.get("components") or [] for key in (c.get("label"), c.get("match_name"))
                     if unresolved_status(c) and not NON_DRUG_LABEL.search(c.get("label") or "")
                     and (iv.get("role") == "EXPERIMENTAL_ARM" or c.get("entity_source") == "NAME_NOT_WRITTEN")} - {""})
    started, out, done = time.monotonic(), {}, 0

    def one(label: str):
        try:
            hit = rxnorm_lookup(label)
        except Exception:  # an RxNorm outage leaves the name unresolved, never fails the export
            return label, None
        ing = (hit or {}).get("ingredient") or {}
        return label, ({"name": ing["name"][:1].upper() + ing["name"][1:], "rxcui": ing["rxcui"]} if ing.get("rxcui") else None)

    with ThreadPoolExecutor(max_workers=8) as pool:
        for i in range(0, len(labels), 200):
            if time.monotonic() - started > budget:
                break
            for label, hit in pool.map(one, labels[i:i + 200]):
                done += 1
                if hit:
                    out[label.lower()] = hit
    print(json.dumps({"rxnorm_names_asked": done, "of": len(labels), "resolved": len(out)}))
    return out


def drug_rows(records: dict[str, dict], rxnorm_seconds: float) -> dict[str, dict]:
    """nct_id -> drug columns for resolved trial records, with no ChEMBL name or ID in them. The only
    way to name drugs for an export: the packages call it too, so no export can skip the renaming."""
    from scripts.universe.chembl_index import norm
    try:
        from scripts.universe.ncit_index import load as load_ncit
        ncit = load_ncit()
    except Exception as exc:  # without NCIt only RxNorm names are written (no ChEMBL name ever is)
        print(f"NCIt index not available ({exc}); writing RxNorm names only")
        ncit = None
    chembl_file = ROOT / ".cache/universe/chembl_index.json"  # read as it is; never rebuilt from here
    chembl_names = json.loads(chembl_file.read_text())["names"] if chembl_file.exists() else None
    by_chembl = chembl_to_ncit(ncit, chembl_names) if ncit and chembl_names else None
    for rec in records.values():
        rename_from_ncit(rec, ncit, norm, chembl_names, by_chembl)
    rxmap = rxnorm_names(records.values(), rxnorm_seconds)
    found: dict[str, dict] = {}
    for nct, rec in records.items():
        prepare(rec, rxmap)
        found[nct] = summarise(rec, ncit, norm)
    return found


def main() -> int:
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--rxnorm-seconds", type=float, default=1500, help="time budget for RxNorm lookups")
    args = ap.parse_args()
    if not RESOLVED.exists():
        print(f"{RESOLVED.relative_to(ROOT)} missing (resolve.py has not run); trial_drugs.csv left as it is")
        return 0
    stopped = [r["nct_id"] for r in csv.DictReader(open(STOPPED, encoding="utf-8"))]
    wanted = set(stopped)
    records: dict[str, dict] = {}
    # The universe first, then the stopped trials outside it (resolve_stopped_extra.py).
    for path in (RESOLVED, EXTRA):
        if not path.exists():
            continue
        with gzip.open(path, "rt", encoding="utf-8") as fh:
            for line in fh:
                rec = json.loads(line)
                if rec.get("nct_id") in wanted and rec["nct_id"] not in records:
                    records[rec["nct_id"]] = rec
    found = drug_rows(records, args.rxnorm_seconds)
    rows = [found.get(n) or {"nct_id": n, "drugs_tested": "", "drugs_background": "", "drugs_comparator": "",
                             "drug_ncit_codes": "", "drug_rxcuis": "", "drug_resolution": "NOT_COVERED",
                             "drug_name_source": "", "drugs_unresolved": ""}
            for n in stopped]
    for path in (OUT, PUBLIC):
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=FIELDS, lineterminator="\n")
            w.writeheader()
            w.writerows(rows)
    tally = Counter(r["drug_resolution"] for r in rows)
    print(json.dumps({"stopped_trials": len(rows), "covered": len(found), "drug_resolution": dict(tally),
                      "drug_name_source": dict(Counter(r["drug_name_source"] for r in rows if r["drug_name_source"]))}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
