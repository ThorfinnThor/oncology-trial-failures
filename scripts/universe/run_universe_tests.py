#!/usr/bin/env python3
"""Offline tests for benchmark definitions and resolution helpers."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.universe.benchmarks import is_bio_stop, load, phase_groups, select, summarize, wilson  # noqa: E402
from scripts.universe.chembl_index import norm  # noqa: E402
from scripts.universe.mechanism_classes import CLASSES  # noqa: E402
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

from scripts.briefs.build_brief import NO_REASON, drugs, full, pct  # noqa: E402
check("pct", pct(0.0433), "4.3%")
check("full_verbatim", full("  Terminated   due to\nslow accrual "), "Terminated due to slow accrual")
check("full_escapes", full("a <b> & c"), "a &lt;b&gt; &amp; c")
check("full_no_truncation", len(full("a " * 150).split()), 150)
check("full_empty", full(None) or NO_REASON, NO_REASON)
check("drug list from arms", drugs({"interventions": [
    {"role": "EXPERIMENTAL_ARM", "components": [{"status": "RESOLVED", "name": "PEMBROLIZUMAB", "label": "Keytruda"},
                                                {"status": "SUPPORTIVE", "name": None, "label": "G-CSF"}]},
    {"role": "COMPARATOR", "components": [{"status": "RESOLVED", "name": "DOCETAXEL", "label": "Docetaxel"}]}]}), "PEMBROLIZUMAB")
check("mechanism classes cover PD-(L)1", "PD-(L)1" in CLASSES, True)

# Reconciliation: a published brief must never show parts that disagree with its own headline.
# A single trial stopped for efficacy AND safety used to be counted in both "any mention" tallies,
# so the stat tile added up to one more than the number of stopped trials listed below it.
import glob as _glob  # noqa: E402

_rows = load("Oncology")
_base = select(_rows, phases=["2", "3"], start=(2015, 2024))
for _klass in ["Antifolate / nucleoside", "PD-(L)1", "PARP", "EGFR"]:
    _s = summarize(select(_base, klass=_klass))
    _parts = (_s["stops_efficacy_only"] + _s["stops_safety_only"]
              + _s["stops_efficacy_and_safety"] + _s["stops_benefit_risk_only"])
    check(f"{_klass}: exclusive parts sum to biological_stops", _parts, _s["biological_stops"])
    check(f"{_klass}: any-mention counts are not below exclusive", 
          _s["efficacy_stops"] >= _s["stops_efficacy_only"] and _s["safety_stops"] >= _s["stops_safety_only"], True)
    check(f"{_klass}: closed never exceeds trials", _s["closed"] <= _s["trials"], True)
    check(f"{_klass}: stops never exceed closed", _s["biological_stops"] <= _s["closed"], True)

# Every published brief's facts file must be internally consistent.
for _facts_path in sorted(_glob.glob(str(Path(__file__).resolve().parents[2] / "product/briefs/*.facts.json")))[:60]:
    _f = json.loads(Path(_facts_path).read_text())
    _seg, _name = _f["segment_stats"], Path(_facts_path).name
    _parts = (_seg["stops_efficacy_only"] + _seg["stops_safety_only"]
              + _seg["stops_efficacy_and_safety"] + _seg["stops_benefit_risk_only"])
    check(f"{_name}: parts reconcile", _parts, _seg["biological_stops"])
    check(f"{_name}: one row per stopped trial", len(_f.get("trials", [])), _seg["biological_stops"])
    check(f"{_name}: rate matches counts", round(_seg["biological_stops"] / _seg["closed"], 6), round(_seg["rate"], 6))
    check(f"{_name}: interval brackets the rate",
          _seg["ci95"][0] <= _seg["rate"] <= _seg["ci95"][1], True)
    _cohort_stops = sum(c["biological_stops"] for c in _f["cohorts"])
    check(f"{_name}: cohort stops do not exceed segment stops", _cohort_stops <= _seg["biological_stops"], True)

if failures:
    print(f"{failures} universe test(s) failed")
    sys.exit(1)
print("Universe tests passed.")
