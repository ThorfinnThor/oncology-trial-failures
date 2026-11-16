#!/usr/bin/env python3
"""Run build_oncology_failure_signals.main() end to end, offline, with every source stubbed.

The unit tests cover the helpers; nothing covered main() itself, so a name clash inside it
(7 Nov 2026: a ChEMBL counter called `lookups` overwrote the RxNorm `lookups` dict) failed the
weekly build twice while every test passed — and every step after it, the newsletter included,
was skipped. This drives the real main() with fake ClinicalTrials.gov, RxNorm, ChEMBL, PubMed
and SEC answers, including ChEMBL searches that fail with HTTP 500, and checks the output.

Writes only to a temporary directory, never to product/.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

import scripts.signals.build_oncology_failure_signals as build  # noqa: E402
from scripts.signals.http_cache import SourceUnavailable  # noqa: E402


def main() -> int:
    records = [r for r in json.loads(build.SOURCE.read_text()) if build.in_scope(r)][:200]
    by_id = {r["nct_id"]: r for r in records}
    failed = {"chembl": 0}

    def fake_design(nct: str, last_update: str = "") -> dict:
        names = [n.strip() for n in (by_id[nct].get("intervention_names") or "").split(";") if n.strip()] or ["placebo"]
        return {"protocolSection": {"armsInterventionsModule": {
            "armGroups": [{"label": "A", "type": "EXPERIMENTAL"}],
            "interventions": [{"name": n, "type": "DRUG", "armGroupLabels": ["A"]} for n in names]}}}

    def fake_rxnorm(name: str):
        term = build.clean_drug_name(name)
        if len(term) <= 5:
            return None
        return {"ingredient": {"rxcui": str(sum(map(ord, term.lower()))), "name": term.lower(), "tty": "IN"},
                "matched_term": term}

    def fake_chembl(term: str):
        if term.lower().startswith("g"):  # a persistent server error on one search, as on 2 Nov
            failed["chembl"] += 1
            raise SourceUnavailable(f"chembl: HTTP 500 for search {term}")
        if len(term) % 2:
            return None
        return {"molecule_chembl_id": f"CHEMBL{sum(map(ord, term.lower()))}", "pref_name": term.upper(),
                "max_phase": "4", "molecule_type": "Small molecule", "first_approval": 2000}

    def fake_mechanisms(chembl_id: str) -> list[dict]:
        return [{"mechanism_of_action": "Kinase inhibitor", "action_type": "INHIBITOR", "target_chembl_id": "CHEMBLT1",
                 "target_name": "Kinase X", "target_type": "SINGLE PROTEIN", "gene_symbols": ["KX1"]}]

    build.fetch_design = fake_design
    build.rxnorm_lookup = fake_rxnorm
    build.rxclass = lambda rxcui: {"moa": [], "epc": []}
    build.us_marketed = lambda rxcui: True
    build.chembl_molecule = fake_chembl
    build.chembl_mechanisms = fake_mechanisms
    build.pubmed_for_nct = lambda nct: []
    build.sec_issuer = lambda *a, **k: None
    original_source = build.SOURCE

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        subset = tmp / "source.json"
        subset.write_text(json.dumps(records))
        build.SOURCE = subset
        build.OUT = tmp / "product"
        sys.argv = ["build_oncology_failure_signals.py", "--step", "all", "--max-seconds", "600"]
        rc = build.main()
        assert rc == 0, f"main() returned {rc}"
        meta = json.loads((build.OUT / "oncology_failure_signals_v1_meta.json").read_text())

    build.SOURCE = original_source
    status = meta["source_status"]["chembl"]
    assert failed["chembl"] > 0, "the stub should have failed some ChEMBL searches"
    assert status.startswith("PARTIAL"), f"a few failed ChEMBL lookups must give PARTIAL, got {status!r}"
    assert meta["unique_assets_chembl"] > 0, "ChEMBL assets were dropped"
    assert meta["trials_with_focus_target_gene"] > 0, "target genes were dropped"
    print(f"smoke: main() ran on {meta['trial_count']} trials; chembl {status.split(';')[0]}; "
          f"target genes on {meta['trials_with_focus_target_gene']:.0%} of trials")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
