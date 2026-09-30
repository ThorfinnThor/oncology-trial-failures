#!/usr/bin/env python3
"""Offline tests for discontinuation-rate definitions and resolution helpers."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.universe.discontinuation_rates import is_bio_stop, load, phase_groups, select, summarize, wilson  # noqa: E402
from scripts.universe.endpoint_outcomes import (disclosure_gap, evidence_line, evidence_of, parse_p,  # noqa: E402
                                               read_analyses, row_for, significant, stated_threshold,
                                               statement_in, verdict_of, _NOT_EFFICACY)
from scripts.universe.chembl_index import norm  # noqa: E402
from scripts.universe.mechanism_classes import CLASSES  # noqa: E402
from scripts.universe.resolve import expand_regimen, modality  # noqa: E402

failures = 0


def check(label, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {label}: expected {expected!r}, got {got!r}")


# A safety endpoint is not a test of efficacy (NCT04623775: "TRAEs Leading to Discontinuation").
for _t in ["Number of Participants With TRAEs Leading to Discontinuation", "Incidence of irAEs",
           "Percentage of participants with TEAEs", "Participants with AEs leading to treatment discontinuation"]:
    check(f"safety endpoint not read as efficacy: {_t}", bool(_NOT_EFFICACY.search(_t)), True)
for _t in ["Overall Response Rate (ORR)", "Progression-free survival", "Time to treatment discontinuation"]:
    check(f"efficacy endpoint still read: {_t}", bool(_NOT_EFFICACY.search(_t)), False)
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

# ---------------------------------------------------------------------------
# Multiplicity: exact binomial tails and false-discovery control
# ---------------------------------------------------------------------------
from math import comb as _comb  # noqa: E402
from fractions import Fraction as _Frac  # noqa: E402

from scripts.universe.multiplicity import (  # noqa: E402
    benjamini_hochberg, benjamini_yekutieli, binom_sf,
)


def _exact_sf(k, n, p):
    """Brute force with exact rationals — the oracle for the beta-function version."""
    q = _Frac(p).limit_denominator(10 ** 6)
    return float(sum(_comb(n, i) * q ** i * (1 - q) ** (n - i) for i in range(k, n + 1)))


for _k, _n, _p in [(11, 44, 0.05), (7, 10, 0.085), (4, 4, 0.085), (2, 30, 0.05), (97, 2063, 0.05)]:
    _got, _want = binom_sf(_k, _n, _p), _exact_sf(_k, _n, _p)
    check(f"exact binomial tail {_k}/{_n} vs {_p}", abs(_got - _want) / max(_want, 1e-300) < 1e-9, True)

check("no successes is certain", binom_sf(0, 44, 0.05), 1.0)
check("more successes than trials is impossible", binom_sf(45, 44, 0.05), 0.0)

_ps = [0.001, 0.01, 0.03, 0.2, 0.5]
_bh, _by = benjamini_hochberg(_ps), benjamini_yekutieli(_ps)
check("BH never reports below the raw p", all(q >= p - 1e-12 for p, q in zip(_ps, _bh)), True)
check("Yekutieli is never laxer than Hochberg", all(b >= h - 1e-12 for h, b in zip(_bh, _by)), True)
check("q-values keep the p-value ordering", _bh == sorted(_bh), True)
check("q-values stay in [0, 1]", all(0 <= q <= 1 for q in _by), True)
check("a lone test is uncorrected", round(benjamini_hochberg([0.04])[0], 10), 0.04)


# ---------------------------------------------------------------------------
# Endpoint outcomes. The p-value field is free text and the verdict is a claim
# about somebody's drug, so anything the record does not settle stays unread.
check("plain p", parse_p("0.0506"), (0.0506, "="))
check("leading p=", parse_p("P = .03"), (0.03, "="))
check("less than", parse_p("<0.001"), (0.001, "<"))
check("greater than", parse_p(">0.999"), (0.999, ">"))
check("unicode <=", parse_p("\u2264 0.05"), (0.05, "<="))
check("spelled out", parse_p("NS"), (1.0, ">"))
check("prose is not a p-value", parse_p("see publication"), (None, None))
check("out of range is not a p-value", parse_p("12"), (None, None))
check("empty", parse_p(""), (None, None))

check("below alpha", significant(0.01, "="), True)
check("at alpha is not below it", significant(0.05, "="), False)
check("<0.001 settles it", significant(0.001, "<"), True)
check(">0.05 settles it the other way", significant(0.05, ">"), False)
# "<0.1" is compatible with 0.03 and with 0.08. Guessing here would invent findings.
check("<0.1 settles nothing", significant(0.1, "<"), None)
check(">0.01 settles nothing", significant(0.01, ">"), None)

_miss = [{"type": "PRIMARY", "title": "OS", "analyses": [
    {"nonInferiorityType": "SUPERIORITY", "groupIds": ["g1", "g2"], "pValue": "0.6945"}]}]
_hit = [{"type": "PRIMARY", "title": "PFS", "analyses": [
    {"nonInferiorityType": "SUPERIORITY", "groupIds": ["g1", "g2"], "pValue": "<0.001"}]}]
check("a non-significant primary is a miss", verdict_of(read_analyses(_miss)["considered"]), "MISSED")
check("a significant primary is met", verdict_of(read_analyses(_hit)["considered"]), "MET")
check("co-primaries that split are their own case",
      verdict_of(read_analyses(_miss + _hit)["considered"]), "MIXED")

# A failed non-inferiority test is a different event and is never counted as a miss.
_ni = [{"type": "PRIMARY", "title": "HbA1c", "analyses": [
    {"nonInferiorityType": "NON_INFERIORITY", "groupIds": ["g1", "g2"], "pValue": "0.4"}]}]
check("non-inferiority is not read", verdict_of(read_analyses(_ni)["considered"]), "UNREADABLE")
check("and it is counted as skipped", read_analyses(_ni)["skipped"]["non_inferiority"], 1)

# A change from baseline within one arm is not a comparison against anything.
_one = [{"type": "PRIMARY", "title": "Change from baseline", "analyses": [
    {"nonInferiorityType": "SUPERIORITY", "groupIds": ["g1"], "pValue": "0.9"}]}]
check("a one-group analysis is not a comparison", verdict_of(read_analyses(_one)["considered"]), "UNREADABLE")

_secondary = [{"type": "SECONDARY", "title": "QoL", "analyses": [
    {"nonInferiorityType": "SUPERIORITY", "groupIds": ["g1", "g2"], "pValue": "0.9"}]}]
check("secondary outcomes are not read", verdict_of(read_analyses(_secondary)["considered"]), "UNREADABLE")


def _one_analysis(title="Primary efficacy", **analysis):
    base = {"nonInferiorityType": "SUPERIORITY", "groupIds": ["g1", "g2"]}
    return [{"type": "PRIMARY", "title": title, "analyses": [{**base, **analysis}]}]


def _verdict(outcomes):
    return verdict_of(read_analyses(outcomes)["considered"])


# The sponsor's own bar, where it wrote one down. A phase 2 run at one-sided 0.10 that came in at
# 0.07 met its aim; a Bonferroni-split comparison at 0.04 against 0.025 did not.
check("stated one-sided 0.10 is the bar",
      _verdict(_one_analysis(pValue="0.07", pValueComment="Test for Arm B vs. Arm A was carried out at one-sided 10% alpha.")),
      "MET")
check("stated corrected 0.025 is the bar",
      _verdict(_one_analysis(pValue="0.043", groupDescription="tested at a Bonferroni-corrected significance level of 0.025")),
      "MISSED")
check("the threshold is read out of the words",
      stated_threshold({"pValueComment": "Threshold for significance \u2264 0.0125."})["values"], [0.0125])
check("the excerpt keeps the whole first sentence",
      stated_threshold({"pValueComment": "One-sided p-value."})["excerpt"], "One-sided p-value.")
check("p on the stated bar is decided by rounding, so unread",
      _verdict(_one_analysis(pValue="0.0167", groupDescription="conducted at the 0.0167 significance level")), "UNREADABLE")
# One-sided with no number: only what every one-sided design would agree on is read.
check("one-sided, clearly significant", _verdict(_one_analysis(pValue="0.01", statisticalMethod="t-test, 1 sided")), "MET")
check("one-sided, clearly not", _verdict(_one_analysis(pValue="0.35", pValueComment="One-sided p-value.")), "MISSED")
check("one-sided, depends on a number we lack",
      _verdict(_one_analysis(pValue="0.12", pValueComment="One-sided p-value.")), "UNREADABLE")

# The older registry answer "not a non-inferiority or equivalence analysis" is a comparison…
check("superiority-or-other is read", _verdict(_one_analysis(nonInferiorityType="SUPERIORITY_OR_OTHER", pValue="0.4")),
      "MISSED")
# …unless the sponsor's own words describe a margin.
check("a margin in the words makes it non-inferiority",
      _verdict(_one_analysis(nonInferiorityType="SUPERIORITY_OR_OTHER_LEGACY", pValue="0.13",
                             groupDescription="Null hypothesis: the E/C/F/TAF group was >= 12% worse than the TDF group")),
      "UNREADABLE")
_ni_then_sup = [{"type": "PRIMARY", "title": "HIV-1 RNA < 50 copies/mL", "analyses": [
    {"nonInferiorityType": "NON_INFERIORITY", "groupIds": ["g1", "g2"], "pValue": "<0.001"},
    {"nonInferiorityType": "SUPERIORITY", "groupIds": ["g1", "g2"], "pValue": "1.00"}]}]
check("a non-inferiority trial's superiority step is not read on its own", _verdict(_ni_then_sup), "UNREADABLE")
check("a posterior probability is not a p-value",
      _verdict(_one_analysis(pValue="0.447", groupDescription="Posterior Probability the True Treatment Ratio <1")),
      "UNREADABLE")
check("no difference in adverse events is not a missed endpoint",
      _verdict(_one_analysis(title="Number of Participants With Treatment-Emergent Adverse Events", pValue="0.8")),
      "UNREADABLE")

# No p-value: a two-sided 95% interval against no effect, and nothing else.
_ci = dict(ciNumSides="TWO_SIDED", ciPctValue="95")
check("a hazard ratio interval across 1 is a miss",
      _verdict(_one_analysis(paramType="Hazard Ratio (HR)", paramValue="1.02", ciLowerLimit="0.77", ciUpperLimit="1.35", **_ci)),
      "MISSED")
check("a difference interval clear of 0 is met",
      _verdict(_one_analysis(paramType="LS Mean Difference", paramValue="-3", ciLowerLimit="-5", ciUpperLimit="-1", **_ci)),
      "MET")
check("a 90% interval is not a 0.05 test",
      _verdict(_one_analysis(paramType="Hazard Ratio (HR)", paramValue="1.02", ciLowerLimit="0.8", ciUpperLimit="1.3",
                             ciNumSides="TWO_SIDED", ciPctValue="90")), "UNREADABLE")
check("an interval ending on no effect is unread",
      _verdict(_one_analysis(paramType="Odds Ratio (OR)", paramValue="2", ciLowerLimit="1.00", ciUpperLimit="4", **_ci)),
      "UNREADABLE")

# The sponsor saying it in words — about this trial, as a result, not a rule or somebody else's study.
_own = "This study was terminated early by the Sponsor because the study did not meet the primary endpoint."
check("the sponsor's sentence is read", statement_in(_own, "NCT04757610"), _own)
check("another study's miss is not this trial's",
      statement_in("Development was discontinued after Study HZNP-ACT-301 (NCT02415127) failed to meet its primary "
                   "efficacy endpoint.", "NCT02593773"), None)
check("a pronoun pointing back at another study is not this trial",
      statement_in("The study was prematurely terminated because of the results of the TRIO-013/LOGiC trial. It failed "
                   "to meet its primary survival endpoint.", "NCT01395537"), None)
check("patients not meeting an endpoint is not the trial missing it",
      statement_in("14/18 were analyzed because 4 pts did not meet the study primary endpoint.", "NCT01794117"), None)
check("a rule is not a result",
      statement_in("The trial would be stopped if the primary endpoint was not met at interim.", "NCT00000001"), None)
check("no answer is not a negative answer",
      statement_in("Study did not reach primary objective; study didn't accrue enough patients.", "NCT01313884"), None)
_study = {"protocolSection": {"identificationModule": {"nctId": "NCT03790865"}, "statusModule": {"overallStatus": "TERMINATED"}},
          "resultsSection": {"moreInfoModule": {"limitationsAndCaveats": {"description":
              "The double-blind, placebo-controlled phase 2b study did not meet the primary endpoint or any of the "
              "secondary endpoints."}},
              "outcomeMeasuresModule": {"outcomeMeasures": _hit}}}
_row = row_for(_study)
check("the sponsor's sentence beats the posted numbers", (_row["endpoint_verdict"], _row["basis"]),
      ("MISSED", "sponsor_statement"))
check("and the numbers are still kept", _row["statistical_verdict"], "MET")
check("registry escapes are removed from what we quote",
      stated_threshold({"groupDescription": "Using a 1-sided alpha=0.2 \\[HR\\] =0.75"})["excerpt"],
      "Using a 1-sided alpha=0.2 [HR] =0.75")
_ev = evidence_of(_row)
check("the evidence carries the sponsor's sentence", _ev["statement"]["where"], "limitations and caveats")
check("and a link straight to the results tab", _ev["results_url"], "https://clinicaltrials.gov/study/NCT03790865?tab=results")
check("an unread trial has no evidence record", evidence_of({"nct_id": "X", "endpoint_verdict": "UNREADABLE"}), None)
check("a stated bar is named in the line",
      evidence_line({"outcome": "6MWD", "p": "0.048", "significant": False, "threshold": 0.025,
                     "threshold_basis": "stated", "method": "MMRM", "estimate": None}),
      "6MWD — p 0.048 against the sponsor's stated threshold of 0.025: not significant. Method: MMRM.")

# The evidence gap: finished more than thirteen months ago with an actual date, nothing posted.
from datetime import date as _date  # noqa: E402
_gap = disclosure_gap([
    {"overall_status": "COMPLETED", "primary_completion_date": "2024-05", "primary_completion_date_type": "ACTUAL",
     "has_results": False, "lead_sponsor_class": "INDUSTRY"},
    {"overall_status": "COMPLETED", "primary_completion_date": "2026-01", "primary_completion_date_type": "ACTUAL",
     "has_results": False},
    {"overall_status": "COMPLETED", "primary_completion_date": "2020-01", "primary_completion_date_type": "ACTUAL",
     "has_results": True},
    {"overall_status": "COMPLETED", "primary_completion_date": "2020-01", "primary_completion_date_type": "ESTIMATED",
     "has_results": False},
    {"overall_status": "TERMINATED", "primary_completion_date": "2020-01", "has_results": False},
], _date(2026, 9, 28))
check("the gap counts only completed trials past the deadline", (_gap["due"], _gap["not_posted"]), (2, 1))
check("and says how much of it is industry", _gap["not_posted_industry"], 1)

# The second way a class earns a brief: completed trials that missed, from independent sponsors.
from scripts.briefs.build_brief_catalog import MIN_MISSED, MIN_MISSED_SPONSORS, missed_endpoints  # noqa: E402
from scripts.universe.mechanism_classes import CURATED_AREAS  # noqa: E402

_v = {"A": {"endpoint_verdict": "MISSED"}, "B": {"endpoint_verdict": "MISSED"}, "C": {"endpoint_verdict": "MET"},
      "D": {"endpoint_verdict": "MISSED"}}
_rows = [{"nct_id": "A", "overall_status": "COMPLETED", "_sponsor_group": "X"},
         {"nct_id": "B", "overall_status": "COMPLETED", "_sponsor_group": "X"},
         {"nct_id": "C", "overall_status": "COMPLETED", "_sponsor_group": "Y"},
         # A terminated trial's posted result is not a completed trial's miss.
         {"nct_id": "D", "overall_status": "TERMINATED", "_sponsor_group": "Z"}]
check("misses are counted among completed trials only, with their sponsors", missed_endpoints(_rows, _v), (2, 1))
check("the endpoint rule needs more than one sponsor's answer", (MIN_MISSED, MIN_MISSED_SPONSORS), (4, 3))
check("psychiatry and respiratory are curated areas",
      {"Psychiatry & Mental Health", "Respiratory"} <= set(CURATED_AREAS), True)

# Nothing may be called unusual on the site that the correction does not support.
_index = json.loads((Path(__file__).resolve().parents[2] / "web/data/briefs_index.json").read_text())
for _b in _index["briefs"]:
    if _b.get("q_value_by") is None:
        continue
    check(f"{_b['slug']}: the survivor flag matches its q",
          _b["survives_fdr_10pct"], _b["q_value_by"] <= 0.10)

if failures:
    print(f"{failures} universe test(s) failed")
    sys.exit(1)
print("Universe tests passed.")
