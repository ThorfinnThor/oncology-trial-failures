#!/usr/bin/env python3
"""Local ChEMBL index of clinical-stage molecules for offline entity resolution.

Downloads (paginated REST, ~40 requests instead of tens of thousands of lookups):
  * molecules with max_phase >= 0.5 (preferred name, synonyms, type, phase, hierarchy)
  * all drug mechanisms
  * targets referenced by those mechanisms (name, type, gene symbols)

Writes .cache/universe/chembl_index.json:
  names:      normalized name/synonym -> sorted parent ChEMBL IDs
  molecules:  parent ID -> {pref_name, max_phase, molecule_type, first_approval}
  mechanisms: parent ID -> [{mechanism_of_action, action_type, target_chembl_id}]
  targets:    target ID -> {pref_name, target_type, gene_symbols}
ChEMBL data: CC BY-SA 3.0 (EMBL-EBI).
"""
from __future__ import annotations

import json
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.http_cache import get_json  # noqa: E402

API = "https://www.ebi.ac.uk/chembl/api/data"
OUT = ROOT / ".cache/universe/chembl_index.json"
MAX_AGE_DAYS = 30


def norm(term: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (term or "").lower())


def paged(resource: str, key: str, params: dict) -> list[dict]:
    rows, offset = [], 0
    while True:
        body = get_json("chembl", f"{API}/{resource}.json", {**params, "limit": 1000, "offset": offset},
                        timeout=180, retries=5) or {}
        batch = body.get(key) or []
        rows.extend(batch)
        total = (body.get("page_meta") or {}).get("total_count") or 0
        offset += len(batch)
        print(f"{resource}: {offset}/{total}", flush=True)
        if not batch or offset >= total:
            return rows


def build() -> dict:
    molecules = paged("molecule", "molecules", {
        "max_phase__gte": 0.5,
        "only": "molecule_chembl_id,pref_name,max_phase,molecule_type,first_approval,molecule_hierarchy,molecule_synonyms",
    })
    names: dict[str, set] = defaultdict(set)
    mols: dict[str, dict] = {}
    for m in molecules:
        mid = m["molecule_chembl_id"]
        parent = ((m.get("molecule_hierarchy") or {}).get("parent_chembl_id")) or mid
        if parent == mid or parent not in mols:
            mols.setdefault(parent, {"pref_name": m.get("pref_name"), "max_phase": m.get("max_phase"),
                                     "molecule_type": m.get("molecule_type"), "first_approval": m.get("first_approval")})
        if parent == mid:
            mols[parent].update({"pref_name": m.get("pref_name") or mols[parent]["pref_name"],
                                 "max_phase": m.get("max_phase"), "molecule_type": m.get("molecule_type"),
                                 "first_approval": m.get("first_approval")})
        for n in [m.get("pref_name")] + [s.get("molecule_synonym") for s in m.get("molecule_synonyms") or []]:
            k = norm(n)
            if len(k) >= 3:
                names[k].add(parent)

    mechanisms = paged("mechanism", "mechanisms", {
        "only": "molecule_chembl_id,parent_molecule_chembl_id,mechanism_of_action,action_type,target_chembl_id",
    })
    mech: dict[str, list] = defaultdict(list)
    target_ids = set()
    for x in mechanisms:
        pid = x.get("parent_molecule_chembl_id") or x.get("molecule_chembl_id")
        mech[pid].append({"mechanism_of_action": x.get("mechanism_of_action"), "action_type": x.get("action_type"),
                          "target_chembl_id": x.get("target_chembl_id")})
        if x.get("target_chembl_id"):
            target_ids.add(x["target_chembl_id"])

    targets_raw = paged("target", "targets", {"only": "target_chembl_id,pref_name,target_type,target_components"})
    targets = {}
    for t in targets_raw:
        if t["target_chembl_id"] not in target_ids:
            continue
        genes = sorted({s["component_synonym"] for c in t.get("target_components") or []
                        for s in c.get("target_component_synonyms") or [] if s.get("syn_type") == "GENE_SYMBOL"})
        targets[t["target_chembl_id"]] = {"pref_name": t.get("pref_name"), "target_type": t.get("target_type"), "gene_symbols": genes}

    return {
        "built_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "ChEMBL REST API (EMBL-EBI), CC BY-SA 3.0",
        "names": {k: sorted(v) for k, v in names.items()},
        "molecules": mols,
        "mechanisms": mech,
        "targets": targets,
    }


def load(refresh: bool = False) -> dict:
    if OUT.exists() and not refresh and (time.time() - OUT.stat().st_mtime) < MAX_AGE_DAYS * 86400:
        return json.loads(OUT.read_text())
    index = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_name(OUT.name + ".tmp")
    tmp.write_text(json.dumps(index))
    tmp.replace(OUT)
    return index


if __name__ == "__main__":
    idx = load(refresh="--refresh" in sys.argv)
    print(json.dumps({"names": len(idx["names"]), "molecules": len(idx["molecules"]),
                      "molecules_with_mechanism": len(idx["mechanisms"]), "targets": len(idx["targets"])}, indent=2))
