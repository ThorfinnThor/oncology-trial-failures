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
  drug_name_source   where the standard names come from: ChEMBL, NCIt, or both

Rights (docs/provenance_and_rights.md, decided 23 Nov 2026): the standard name of a drug (its INN)
is a fact; the names are used, ChEMBL identifiers, mechanisms and targets are not. Mechanism and
target stay in the licensed signals product. Names are attributed to their sources in the READMEs.

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
    r"standard of care|standard[- ]of[- ]care|soc|usual care|no intervention|observation)\b", re.I)


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


def prepare(rec: dict, rxmap: dict[str, dict]) -> None:
    """Drop assays and placeholders, then name what ChEMBL and NCIt could not, from RxNorm."""
    for iv in rec.get("interventions") or []:
        for c in iv.get("components") or []:
            label = c.get("label") or ""
            if NON_DRUG_LABEL.search(label) and c.get("status") != "RESOLVED":
                c["status"] = "NON_DRUG"
            elif unresolved_status(c) and label.lower() in rxmap:
                hit = rxmap[label.lower()]
                c.update({"status": "RESOLVED", "name": hit["name"], "entity_source": "RXNORM", "rxcui": hit["rxcui"]})


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
        s = c.get("entity_source") or ""
        return "ChEMBL" if "CHEMBL" in s else ("RxNorm" if s == "RXNORM" else "NCIt")
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
    """label (lower case) -> {"name", "rxcui"} for experimental-arm components ChEMBL and NCIt left
    unresolved, from RxNorm (NLM): the ingredient a name normalises to. Cached by the HTTP cache, so a
    later run only asks for new names; the time budget keeps a first run inside the weekly run."""
    import time
    from concurrent.futures import ThreadPoolExecutor
    from scripts.signals.build_oncology_failure_signals import rxnorm_lookup
    labels = sorted({(c.get("label") or "").strip() for rec in records for iv in rec.get("interventions") or []
                     if iv.get("role") == "EXPERIMENTAL_ARM" for c in iv.get("components") or []
                     if unresolved_status(c) and not NON_DRUG_LABEL.search(c.get("label") or "")} - {""})
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


def main() -> int:
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--rxnorm-seconds", type=float, default=1500, help="time budget for RxNorm lookups")
    args = ap.parse_args()
    if not RESOLVED.exists():
        print(f"{RESOLVED.relative_to(ROOT)} missing (resolve.py has not run); trial_drugs.csv left as it is")
        return 0
    from scripts.universe.chembl_index import norm
    try:
        from scripts.universe.ncit_index import load as load_ncit
        ncit = load_ncit()
    except Exception as exc:  # NCIt codes are a bonus; the names do not depend on them
        print(f"NCIt index not available ({exc}); writing names without NCIt codes")
        ncit = None
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
    rxmap = rxnorm_names(records.values(), args.rxnorm_seconds)
    found: dict[str, dict] = {}
    for nct, rec in records.items():
        prepare(rec, rxmap)
        found[nct] = summarise(rec, ncit, norm)
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
    print(json.dumps({"stopped_trials": len(rows), "covered": len(found), "drug_resolution": dict(tally)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
