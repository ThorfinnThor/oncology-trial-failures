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
STOPPED = ROOT / "data/all_stopped_trials.csv"
OUT = ROOT / "data/trial_drugs.csv"
PUBLIC = ROOT / "web/public/trial_drugs.csv"
FIELDS = ["nct_id", "drugs_tested", "drugs_background", "drugs_comparator", "drug_ncit_codes",
          "drug_resolution", "drug_name_source"]
SKIP = {"GENERIC", "SUPPORTIVE"}


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
    return name


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
    sources = sorted({"ChEMBL" if (c.get("entity_source") or "").find("CHEMBL") >= 0 else "NCIt"
                      for c in tested if c.get("status") == "RESOLVED"})
    codes = []
    for c in tested:
        if c.get("status") == "RESOLVED":
            code = ncit_code(c, ncit, norm)
            if code and code not in codes:
                codes.append(code)
    return {"nct_id": rec["nct_id"], "drugs_tested": "; ".join(names(tested)),
            "drugs_background": "; ".join(names(by_role["BACKGROUND_OR_BACKBONE"])),
            "drugs_comparator": "; ".join(names(by_role["COMPARATOR"])),
            "drug_ncit_codes": "; ".join(codes), "drug_resolution": resolution,
            "drug_name_source": " + ".join(sources)}


def main() -> int:
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
    found: dict[str, dict] = {}
    with gzip.open(RESOLVED, "rt", encoding="utf-8") as fh:
        for line in fh:
            rec = json.loads(line)
            if rec.get("nct_id") in wanted:
                found[rec["nct_id"]] = summarise(rec, ncit, norm)
    rows = [found.get(n) or {"nct_id": n, "drugs_tested": "", "drugs_background": "", "drugs_comparator": "",
                             "drug_ncit_codes": "", "drug_resolution": "NOT_COVERED", "drug_name_source": ""}
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
