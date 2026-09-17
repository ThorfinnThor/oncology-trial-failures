#!/usr/bin/env python3
"""Offline tests for benchmark definitions and resolution helpers."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.universe.benchmarks import is_bio_stop, phase_groups, summarize, wilson  # noqa: E402
from scripts.universe.chembl_index import norm  # noqa: E402
from scripts.universe.resolve import expand_regimen, modality  # noqa: E402

failures = 0


def check(label, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {label}: expected {expected!r}, got {got!r}")


check("phase 1/2 counts as phase 2", phase_groups(["PHASE1", "PHASE2"]), {"2"})
check("phase 2/3 counts as phase 3", phase_groups(["PHASE2", "PHASE3"]), {"3"})
check("bio stop", is_bio_stop({"overall_status": "TERMINATED", "classification_outcome_v2": "BIOLOGICAL_FAILURE"}), True)
check("withdrawn is not a stop", is_bio_stop({"overall_status": "WITHDRAWN", "classification_outcome_v2": "BIOLOGICAL_FAILURE"}), False)
check("mixed with safety", is_bio_stop({"overall_status": "TERMINATED", "classification_outcome_v2": "MIXED_CAUSES",
                                        "classification_secondary_reasons_v2": "SAFETY; FUNDING"}), True)
check("mixed without bio", is_bio_stop({"overall_status": "TERMINATED", "classification_outcome_v2": "MIXED_CAUSES",
                                        "classification_secondary_reasons_v2": "RECRUITMENT; FUNDING"}), False)
lo, hi = wilson(3, 45)
check("wilson bounds", (round(lo, 3), round(hi, 3)), (0.023, 0.179))
rows = [
    {"_closed": True, "_bio": True, "_reasons": {"SAFETY"}, "overall_status": "TERMINATED", "nct_id": "A"},
    {"_closed": True, "_bio": False, "_reasons": set(), "overall_status": "COMPLETED", "nct_id": "B"},
    {"_closed": False, "_bio": False, "_reasons": set(), "overall_status": "RECRUITING", "nct_id": "C"},
    {"_closed": False, "_bio": False, "_reasons": set(), "overall_status": "WITHDRAWN", "nct_id": "D"},
]
s = summarize(rows)
check("rate among closed", s["rate"], 0.5)
check("lower bound excludes withdrawn", round(s["rate_lower_bound_all_started"], 3), 0.333)
check("norm", norm("MK-3475"), "mk3475")
check("regimen expansion", [g["name"] for g in expand_regimen({"name": "FOLFOX", "other_names": []})], ["fluorouracil", "leucovorin", "oxaliplatin"])
check("adc modality", modality("Sacituzumab govitecan", {"molecule_type": "Antibody"}, "DRUG"), "ADC")
check("chembl conjugate type is ADC", modality("XYZ-101", {"molecule_type": "Antibody drug conjugate"}, "DRUG"), "ADC")
from scripts.universe.resolve import Resolver  # noqa: E402
_r = Resolver({"names": {"erlotinib": ["CHEMBL553"]}, "molecules": {"CHEMBL553": {"pref_name": "ERLOTINIB", "max_phase": 4, "molecule_type": "Small molecule"}},
               "mechanisms": {}, "targets": {}}, {"names": {}, "concepts": {}})
check("dose suffix stripped", _r.component({"name": "Erlotinib DOSE 2", "other_names": []}, "DRUG")["status"], "RESOLVED")
check("bracket brand stripped", _r.component({"name": "erlotinib [Tarceva]", "other_names": []}, "DRUG")["status"], "RESOLVED")
check("supportive excluded", _r.component({"name": "Rescue medication", "other_names": []}, "DRUG")["status"], "SUPPORTIVE")
check("class placeholder", _r.component({"name": "PD-1 inhibitor", "other_names": []}, "DRUG")["target_genes"], ["PDCD1"])
check("code only", _r.component({"name": "HRS-7058", "other_names": []}, "DRUG")["entity_id"], "CODE:HRS-7058")
check("cell modality", modality("CD19 CAR-T cells", None, "BIOLOGICAL"), "Cell therapy")

if failures:
    print(f"{failures} universe test(s) failed")
    sys.exit(1)
print("Universe tests passed.")
