#!/usr/bin/env python3
"""A molecule index small enough to ship with the site, so delivery never depends on a third party.

The evidence package promises to compare the buyer's own asset against the molecules that failed
in the cohort. That comparison needs one thing the prebuilt package cannot know in advance: what
the buyer's molecule acts on. Resolving it when the order arrives means either calling ChEMBL from
the delivery path — putting an external service between a customer and something they paid for —
or carrying the answer ourselves.

The full ChEMBL index is 5.7 MB and mostly fields no comparison uses. What is left here is the
part that decides a verdict: a normalised name, the gene symbols it acts on, the modality and the
mechanism strings. Molecules with neither a target nor a mechanism are dropped, because an entry
that cannot produce a comparison is weight without an answer.

Server-side only: it lands in web/data/private/ and is guarded by scripts/web/check_private_data.py.
It is public data under CC BY-SA 3.0, but a 2 MB download on a page nobody asked it for is not a
kindness.

  python scripts/signals/build_asset_index.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

SOURCE = ROOT / ".cache/universe/chembl_index.json"
OUT = ROOT / "web/data/private/asset_index.json"
MARKER = ("Server-side only. This file is imported by the API route that delivers a paid "
          "package; it must never be imported from a page component, or the bundler will "
          "ship it to the browser.")


def mechanism_classes() -> dict:
    """The curated gene-to-class map, per disease area.

    Without it the comparison reads gene symbols literally, and pembrolizumab against a PD-(L)1
    cohort comes back "different hypothesis" because PD-1 and PD-L1 are two genes. They are one
    axis, and the ontology that groups the trials already knows it.
    """
    from scripts.universe.mechanism_classes import classes_of

    return {area: {name: sorted(genes) for name, genes in classes_of(area).items()}
            for area in ("Oncology", "Neurology", "Immunology & Autoimmune")}


def build(index: dict) -> dict:
    targets = index.get("targets") or {}
    molecules, kept = {}, set()

    for chembl_id, mechs in (index.get("mechanisms") or {}).items():
        genes = sorted({g for m in mechs
                        for g in ((targets.get(m.get("target_chembl_id")) or {}).get("gene_symbols") or [])})
        actions = sorted({m.get("mechanism_of_action") for m in mechs if m.get("mechanism_of_action")})
        if not genes and not actions:
            continue
        mol = (index.get("molecules") or {}).get(chembl_id) or {}
        molecules[chembl_id] = {
            "name": mol.get("pref_name") or chembl_id,
            "modality": mol.get("molecule_type") or "",
            "genes": genes,
            "mechanisms": actions,
        }
        kept.add(chembl_id)

    # A synonym that resolves to several molecules is ambiguous; the first id keeps the file small
    # and the comparison deterministic, and an ambiguous trade name is not worth a wrong verdict.
    names = {}
    for name, ids in (index.get("names") or {}).items():
        usable = [i for i in ids if i in kept]
        if usable:
            names[name] = usable[0] if len(usable) == 1 else sorted(usable)[0]

    return {"schema_version": 2, "note": MARKER, "classes": mechanism_classes(), "source": index.get("source") or "ChEMBL (EMBL-EBI), CC BY-SA 3.0",
            "built_at": index.get("built_at"), "molecule_count": len(molecules), "name_count": len(names),
            "names": names, "molecules": molecules}


def main() -> int:
    if not SOURCE.exists():
        print(f"no ChEMBL index at {SOURCE.relative_to(ROOT)}; run scripts/universe/chembl_index.py first",
              file=sys.stderr)
        return 0
    payload = build(json.loads(SOURCE.read_text()))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    size = OUT.stat().st_size / 1024 / 1024
    print(f"wrote {OUT.relative_to(ROOT)}: {payload['molecule_count']} molecules, "
          f"{payload['name_count']} names, {size:.2f} MB (server-side only)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
