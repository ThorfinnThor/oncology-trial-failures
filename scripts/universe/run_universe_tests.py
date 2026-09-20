#!/usr/bin/env python3
"""Offline tests for discontinuation-rate definitions and resolution helpers."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.universe.discontinuation_rates import is_bio_stop, load, phase_groups, select, summarize, wilson  # noqa: E402
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

# ---------------------------------------------------------------------------
# Cumulative incidence (competing risks)
# ---------------------------------------------------------------------------
from scripts.universe.cumulative_incidence import (  # noqa: E402
    EVENT_BIO, EVENT_NONE, EVENT_OTHER, aalen_johansen, at, bootstrap_ci, curve, observation,
)

# Hand-computable example. Four trials: a biological stop at 1 month, a completion at 2, a
# censoring at 3, a biological stop at 4.
#   t=1  n=4  d1=1        CIF = 1.00 * 1/4          = 0.25   S = 0.75
#   t=2  n=3        d2=1  CIF unchanged                       S = 0.50
#   t=3  n=2  censored
#   t=4  n=1  d1=1        CIF = 0.25 + 0.50 * 1/1   = 0.75
_toy = [(1.0, EVENT_BIO), (2.0, EVENT_OTHER), (3.0, EVENT_NONE), (4.0, EVENT_BIO)]
_pts = aalen_johansen(_toy)
check("CIF after the first event", round(at(_pts, 1)["cif"], 6), 0.25)
check("competing event does not raise the CIF", round(at(_pts, 2)["cif"], 6), 0.25)
check("CIF before anything happens", round(at(_pts, 0.5)["cif"], 6), 0.0)
check("CIF after the last event", round(at(_pts, 4)["cif"], 6), 0.75)

# Treating the competing event as censoring (1 - Kaplan-Meier) would give 1.0 here: the
# completed trial would be assumed to still be capable of terminating. That overstatement is
# the whole reason this module uses Aalen-Johansen.
check("Aalen-Johansen stays below 1 - KM", at(_pts, 4)["cif"] < 1.0, True)

# The curve can only go up, and the competing risks together cannot exceed certainty.
_mono = all(b["cif"] >= a["cif"] - 1e-12 for a, b in zip(_pts, _pts[1:]))
check("CIF is non-decreasing", _mono, True)
_other = aalen_johansen([(t, EVENT_BIO if c == EVENT_OTHER else EVENT_OTHER if c == EVENT_BIO else c) for t, c in _toy])
check("the two cumulative incidences sum to at most 1", at(_pts, 99)["cif"] + at(_other, 99)["cif"] <= 1 + 1e-9, True)

# A trial that never enrolled, or was never observed running, contributes no follow-up.
check("withdrawn trials are excluded", observation({"start_date": "2018-01-01", "overall_status": "WITHDRAWN"}), None)
check("a record last updated before its start date is excluded",
      observation({"start_date": "2024-06-01", "overall_status": "UNKNOWN", "last_update_post_date": "2023-01-01"}), None)
_term = observation({"start_date": "2018-01-01", "overall_status": "TERMINATED", "completion_date": "2019-01-01",
                     "last_update_post_date": "2021-05-01", "_bio": True})
check("a stop is dated at its completion date, not its last update", round(_term[0]), 12)
check("a stop is the event of interest", _term[1], EVENT_BIO)

# Against the real cohort: the two metrics must share a numerator, and the analytic interval
# must agree with a bootstrap that makes no distributional assumption at all.
_rows = load("Oncology")
_onc = select(_rows, phases=["2", "3"], start=(2015, 2024))
_c = curve(_onc)
_naive = summarize(_onc)
check("CIF keeps every biological stop the closed-trial rate counts", _c["events_biological"], _naive["biological_stops"])
check("the risk set is larger than the closed set", _c["trials"] > _naive["closed"], True)
check("every excluded trial has a stated reason", sum(_c["excluded"].values()), _c["excluded_total"])

_seg = [o for o in (observation(r) for r in select(_rows, klass="PD-(L)1", phases=["2", "3"], start=(2015, 2024))) if o]
for _t in (24, 48):
    _a = at(aalen_johansen(_seg), _t)["ci95"]
    _b = bootstrap_ci(_seg, _t, draws=200)
    # Within a fifth of the analytic width: the two should agree closely at this sample size.
    _tol = 0.2 * (_a[1] - _a[0])
    check(f"analytic interval at {_t}m matches the bootstrap",
          abs(_a[0] - _b[0]) < _tol and abs(_a[1] - _b[1]) < _tol, True)

if failures:
    print(f"{failures} universe test(s) failed")
    sys.exit(1)
print("Universe tests passed.")
