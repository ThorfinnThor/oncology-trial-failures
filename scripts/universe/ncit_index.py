#!/usr/bin/env python3
"""Local NCI Thesaurus index for drug names and research codes missing from ChEMBL.

Downloads the NCIt FLAT release (EVS, ~16 MB zip) and keeps concepts with drug-like
semantic types plus named regimens. NCIt covers many recent investigational agents and
company research codes (e.g. AK117 = ligufalimab, SHR-A1811 = trastuzumab rezetecan).

Writes .cache/universe/ncit_index.json:
  names:     normalized synonym -> sorted NCIt codes
  concepts:  code -> {name, synonyms, definition (first sentence), semantic_types, is_regimen}
NCI Thesaurus: public domain (U.S. National Cancer Institute), attribution requested.
"""
from __future__ import annotations

import io
import json
import re
import sys
import time
import zipfile
from collections import defaultdict
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.universe.chembl_index import norm  # noqa: E402

URL = "https://evs.nci.nih.gov/ftp1/NCI_Thesaurus/Thesaurus.FLAT.zip"
OUT = ROOT / ".cache/universe/ncit_index.json"
MAX_AGE_DAYS = 30
DRUG_TYPES = {
    "Pharmacologic Substance", "Amino Acid, Peptide, or Protein", "Immunologic Factor", "Organic Chemical",
    "Antibiotic", "Inorganic Chemical", "Biologically Active Substance", "Hormone", "Enzyme",
    "Nucleic Acid, Nucleoside, or Nucleotide", "Element, Ion, or Isotope", "Vitamin",
}


def first_sentence(text: str) -> str:
    text = re.sub(r"\s*\((?:NCI|FDA|CDISC|ACC)[^)]*\)\s*$", "", text or "").strip()
    m = re.match(r"(.+?\.)(\s+[A-Z]|$)", text)
    return (m.group(1) if m else text)[:700]


def build() -> dict:
    resp = requests.get(URL, timeout=300, headers={"User-Agent": "ClinicalTrialFailures/1.0 (+https://clinicaltrialfailures.com/contact)"})
    resp.raise_for_status()
    zf = zipfile.ZipFile(io.BytesIO(resp.content))
    member = next(n for n in zf.namelist() if n.endswith(".txt"))
    names: dict[str, set] = defaultdict(set)
    concepts = {}
    with zf.open(member) as raw:
        for line in io.TextIOWrapper(raw, encoding="utf-8"):
            f = line.rstrip("\n").split("\t")
            if len(f) < 8:
                continue
            code, synonyms, definition, status, semtypes = f[0], f[3].split("|"), f[4], f[6], set(f[7].split("|"))
            if "Retired" in status or "Obsolete" in status:
                continue
            is_regimen = "Therapeutic or Preventive Procedure" in semtypes and synonyms and synonyms[0].endswith("Regimen")
            if not (semtypes & DRUG_TYPES) and not is_regimen:
                continue
            concepts[code] = {"name": synonyms[0], "synonyms": sorted(set(synonyms))[:40], "definition": first_sentence(definition),
                              "semantic_types": sorted(semtypes), "is_regimen": bool(is_regimen)}
            for s in synonyms:
                k = norm(s)
                if len(k) >= 3:
                    names[k].add(code)
    return {"built_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "source": URL,
            "names": {k: sorted(v) for k, v in names.items()}, "concepts": concepts}


def load(refresh: bool = False) -> dict:
    if OUT.exists() and not refresh and (time.time() - OUT.stat().st_mtime) < MAX_AGE_DAYS * 86400:
        return json.loads(OUT.read_text())
    idx = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_name(OUT.name + ".tmp")
    tmp.write_text(json.dumps(idx))
    tmp.replace(OUT)
    return idx


if __name__ == "__main__":
    idx = load(refresh="--refresh" in sys.argv)
    print(json.dumps({"names": len(idx["names"]), "concepts": len(idx["concepts"]),
                      "regimens": sum(1 for c in idx["concepts"].values() if c["is_regimen"])}, indent=2))
