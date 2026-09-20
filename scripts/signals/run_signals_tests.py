#!/usr/bin/env python3
"""Offline unit tests for the Oncology Failure Signals enrichment helpers."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.signals.build_oncology_failure_signals import assign_role, in_scope, name_candidates, research_codes  # noqa: E402
from scripts.signals.sponsors import resolve_sponsor  # noqa: E402

failures = 0


def check(label, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {label}: expected {expected!r}, got {got!r}")


# sponsor groups
check("msd", resolve_sponsor("Merck Sharp & Dohme LLC", "INDUSTRY")["sponsor_group"], "Merck & Co.")
check("kgaa", resolve_sponsor("Merck KGaA, Darmstadt, Germany", "INDUSTRY")["sponsor_group"], "Merck KGaA")
check("emd", resolve_sponsor("EMD Serono Research & Development Institute, Inc.", "INDUSTRY")["sponsor_group"], "Merck KGaA")
check("bare merck is not guessed", resolve_sponsor("Merck", "INDUSTRY")["sponsor_group_method"], "SELF")
check("subsidiary", resolve_sponsor("Immune Design, a subsidiary of Merck & Co., Inc. (Rahway, New Jersey USA)", "INDUSTRY")["sponsor_group"], "Merck & Co.")
check("a gilead company", resolve_sponsor("Kite, A Gilead Company", "INDUSTRY")["sponsor_group"], "Gilead Sciences")
check("academic self", resolve_sponsor("M.D. Anderson Cancer Center", "OTHER")["sponsor_group"], "M.D. Anderson Cancer Center")
check("academic not industry", resolve_sponsor("M.D. Anderson Cancer Center", "OTHER")["is_industry"], False)

# names and codes
check("paren alias", name_candidates({"name": "TH-4000 (Tarloxotinib)", "other_names": []}), ["TH-4000 (Tarloxotinib)", "Tarloxotinib", "TH-4000"])
check("combo split", name_candidates({"name": "PF-3512676 + Paclitaxel", "other_names": ["Taxol; Paraplatin"]})[:2], ["PF-3512676", "Paclitaxel"])
check("codes", research_codes({"name": "Pembrolizumab", "other_names": ["Keytruda, MK-3475, SCH 900475"]}), ["MK-3475", "SCH-900475"])
check("code with suffix", research_codes({"name": "HA121-28 tablets", "other_names": []}), ["HA121-28"])
check("targets are not codes", research_codes({"name": "Anti-CD19 CAR-T", "other_names": ["COVID-19"]}), [])

check("and-combo", name_candidates({"name": "Gemcitabine and Capecitabine and Avastin", "other_names": []}), ["Gemcitabine", "Capecitabine", "Avastin"])

from scripts.signals.external_sources import _same_legal_entity  # noqa: E402
check("kgaa is not merck & co", _same_legal_entity("Merck KGaA", "Merck & Co., Inc."), False)
check("merck & co matches", _same_legal_entity("Merck & Co.", "Merck & Co., Inc."), True)
check("plain names match", _same_legal_entity("Pfizer", "PFIZER INC"), True)

# roles
iv = lambda name, typ, arms: {"name": name, "type": typ, "other_names": [], "arm_types": arms}
check("placebo", assign_role(iv("Matching placebo", "DRUG", ["PLACEBO_COMPARATOR"]), None)[0], "PLACEBO")
check("backbone", assign_role(iv("Cisplatin", "DRUG", ["EXPERIMENTAL", "PLACEBO_COMPARATOR"]), None)[0], "BACKGROUND_OR_BACKBONE")
check("comparator", assign_role(iv("Docetaxel", "DRUG", ["ACTIVE_COMPARATOR"]), None)[0], "COMPARATOR")
check("experimental", assign_role(iv("AUY922", "DRUG", ["EXPERIMENTAL"]), None)[0], "EXPERIMENTAL_ARM")
check("procedure", assign_role(iv("IMRT", "RADIATION", ["EXPERIMENTAL"]), None)[0], "NON_DRUG")
check("lab", assign_role(iv("Laboratory Biomarker Analysis", "OTHER", ["EXPERIMENTAL"]), None)[0], "NON_DRUG")

# scope
check("bio in scope", in_scope({"classification_outcome_v2": "BIOLOGICAL_FAILURE"}), True)
check("mixed bio in scope", in_scope({"classification_outcome_v2": "MIXED_CAUSES", "classification_secondary_reasons_v2": "SAFETY; FUNDING"}), True)
check("mixed non-bio out", in_scope({"classification_outcome_v2": "MIXED_CAUSES", "classification_secondary_reasons_v2": "RECRUITMENT; FUNDING"}), False)

# public sample: the page promises "every column of the licensed file", and a comment preamble
# makes Excel and Numbers read the whole CSV as one column.
from scripts.signals.build_public_sample import COLUMNS, LICENSED_COLUMNS  # noqa: E402

check("sample covers licensed columns", [c for c in LICENSED_COLUMNS if c not in COLUMNS], [])
check("sample adds ticker", "sponsor_ticker" in COLUMNS, True)
check("sample header is first column", COLUMNS[0], "nct_id")

# Change-report attribution: a licensee must be able to tell a trial moving from our pipeline moving.
from scripts.signals.build_change_report import origin  # noqa: E402

check("a status change is a registry event", origin({"overall_status": {}}), "registry_event")
check("a stop reason change is a registry event", origin({"why_stopped": {}}), "registry_event")
check("our classifier changing its mind is not news about the trial",
      origin({"failure_primary_reason": {}}), "reclassification")
check("an ontology update is not news about the trial", origin({"focus_target_genes": {}}), "remapping")
check("a sponsor remap is not news about the trial", origin({"sponsor_group": {}}), "remapping")
check("both sides moving is flagged as mixed",
      origin({"overall_status": {}, "failure_outcome": {}}), "mixed")

# Event ascertainment: the extractor must find reported stops and reject everything that only
# looks like one. Each rejection below is a real false positive caught in review, not a guess.
from scripts.signals.event_ascertainment import stop_sentences  # noqa: E402

_reported = [
    "The interim analysis for the POC study A9541004 demonstrated futility, and the study was stopped on the 6th of November 2013.",
    "This study has been terminated in response to a reported serious adverse event (SAE).",
    "On 26-Sep-2024, Novartis made the decision to terminate the study due to safety findings and DMC recommendation.",
]
for _s in _reported:
    check(f"reported stop is found: {_s[:40]}…", len(stop_sentences(_s)), 1)

_rejected = {
    "a protocol stopping rule is not an event":
        "The study will be stopped if the failures are 2 or more, otherwise 27 patients will be included.",
    "a dose-escalation rule is not an event":
        "If the dose panel is assessed as safe, the current dose arm will be stopped and subjects recruited to the next panel.",
    "a treatment rule is not an event":
        "Patients are treated until documentation of progressive disease, evidence of unacceptable toxicity or other decision to discontinue treatment.",
    "a negated stop says the opposite":
        "As the development program was not being discontinued for safety reasons or due to a lack of efficacy, BioCryst remained confident in the asset.",
    "two sentences run together are not one statement":
        "Study was terminated by Novartis Primary Objective for this study is to evaluate changes in chronic low grade non-hematological adverse events experienced by patients.",
}
for _label, _text in _rejected.items():
    check(_label, stop_sentences(_text), [])

check("no stop language at all yields nothing",
      stop_sentences("This is a randomised, double-blind study of drug X in patients with advanced disease."), [])

if failures:
    print(f"{failures} signal test(s) failed")
    sys.exit(1)
print("Signals tests passed.")
