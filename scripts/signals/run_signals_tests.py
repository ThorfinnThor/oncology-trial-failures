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

# Stop attribution: own data or a decision taken elsewhere. Every fixture below is a real
# registry stop reason, and every expected value was read and judged by hand before the
# patterns were written against it.
from scripts.signals.stop_attribution import attribute, attribute_all, summarise  # noqa: E402

_cases = [
    # --- the trial's own finding
    ("NCT03451773", "Study was closed after one treatment related death.", "own_data"),
    ("NCT03840902", "Based on recommendations by an external Independent data Monitoring Committee (IDMC), "
                    "Sponsor decided to discontinue this clinical study.", "own_data"),
    ("NCT04489940", "The study was prematurely discontinued by the sponsor due to probability of success "
                    "which was too low to justify the continuation of recruitment.", "own_data"),
    ("NCT04327986", "Study closed to accrual due to the worsening risk: benefit ratio for participants.", "own_data"),
    ("NCT00000001", "Posdinemab did not achieve statistical significance in slowing clinical decline", "own_data"),
    # --- somebody else's finding
    ("NCT04396535", "EMD Serono recommendation based on three other studies that failed to show benefit "
                    "for bintrafusp alfa", "programme_cascade"),
    ("NCT04952753", "The study was terminated early due to the halt of NIS793 treatment and urgent safety "
                    "measures issued in July 2023.", "programme_cascade"),
    ("NCT00000002", "Discontinued because of lack of efficacy in the parent study (Study M15-566).",
     "programme_cascade"),
    ("NCT00000003", "As the feeder study (AZES) was stopped for futility after an independent assessment, "
                    "this trial was also stopped.", "programme_cascade"),
    ("NCT00000004", "This study was prematurely discontinued because the program for progressive "
                    "supranuclear palsy was stopped.", "programme_cascade"),
    # --- nothing to go on
    ("NCT00000005", "Terminated.", "unclear"),
]
for _nct, _text, _want in _cases:
    _got = attribute({"nct_id": _nct, "why_stopped": _text})["attribution"]
    check(f"attribution: {_text[:46]}…", _got, _want)

# "futility" belongs to whoever ran the trial it happened in.
check("an upstream study's futility is not this trial's",
      attribute({"nct_id": "NCT1", "why_stopped": "The parent study was stopped for futility."})["attribution"],
      "programme_cascade")
check("this trial's own futility is",
      attribute({"nct_id": "NCT1", "why_stopped": "Stopped after the interim analysis crossed the futility boundary."})["attribution"],
      "own_data")

# A trial quoting its own registry id is pointing at itself, not elsewhere.
check("a trial citing its own NCT id is not a cascade",
      attribute({"nct_id": "NCT03352557",
                 "why_stopped": "The study (NCT03352557) was terminated after its own interim analysis."})["attribution"],
      "own_data")

# Several stops of one programme close together are one decision, unless the text says whose.
_sib = [{"nct_id": "NCT1", "why_stopped": "Terminated.", "_sponsor_group": "Acme",
         "focus_entity_ids": ["CHEMBL:1"], "stop_date_estimate": "2020-01-15"},
        {"nct_id": "NCT2", "why_stopped": "Terminated.", "_sponsor_group": "Acme",
         "focus_entity_ids": ["CHEMBL:1"], "stop_date_estimate": "2020-03-02"}]
_res = attribute_all(_sib)
check("siblings in one programme are one decision", summarise(_res)["stops_from_programme_cascade"], 2)
check("that verdict is structural, not textual", summarise(_res)["cascade_structural"], 2)
_far = [dict(_sib[0]), dict(_sib[1], stop_date_estimate="2023-09-01")]
check("stops years apart are not one decision", summarise(attribute_all(_far))["stops_unclear"], 2)
check("different sponsors are never siblings",
      summarise(attribute_all([dict(_sib[0]), dict(_sib[1], _sponsor_group="Other")]))["stops_unclear"], 2)

# Molecules, not registry records. Seven rows can be four drugs, and the count that survives
# a sceptical reader is the one we lead with.
from scripts.signals.stop_attribution import failed_assets, signature  # noqa: E402

def _trial(nct, name, entity, modality, genes, sponsor="Acme"):
    return {"nct_id": nct, "_sponsor_group": sponsor, "why_stopped": "Terminated for futility.",
            "interventions": [{"role": "EXPERIMENTAL_ARM", "components": [
                {"name": name, "entity_id": entity, "modality": modality, "target_genes": genes}]}]}

# One sponsor closing three trials of one drug is one molecule.
_one = [_trial(f"NCT{i}", "TILAVONEMAB", "CHEMBL:1", "Antibody", ["MAPT"]) for i in range(3)]
check("three trials of one drug are one molecule", signature(_one)["molecules"], 1)
check("and the sentence says so", "all of one molecule" in signature(_one)["sentence"], True)

# Different drugs are different molecules, and a shared modality is worth saying.
_four = [_trial("NCT1", "TILAVONEMAB", "CHEMBL:1", "Antibody", ["MAPT"]),
         _trial("NCT2", "GOSURANEMAB", "CHEMBL:2", "Antibody", ["MAPT"], "Biogen"),
         _trial("NCT3", "SEMORINEMAB", "CHEMBL:3", "Antibody", ["MAPT"], "Roche")]
_sig = signature(_four)
check("distinct drugs are distinct molecules", _sig["molecules"], 3)
check("a shared modality is reported", _sig["shared_modality"], "Antibody")
check("it reads as a sentence", "all monoclonal antibodies" in _sig["sentence"], True)
check("registry shouting is toned down", "Tilavonemab" in _sig["sentence"], True)

# A mixed modality is not claimed.
_mixed = _four + [_trial("NCT4", "SOMEMOL", "CHEMBL:4", "Small molecule", ["MAPT"], "Other")]
check("a mixed modality is not claimed", signature(_mixed)["shared_modality"], None)
check("and is not listed either", "all " not in signature(_mixed)["sentence"], True)

# A combination partner is not a failure of the class under review.
_combo = [{"nct_id": "NCT9", "_sponsor_group": "Merck", "why_stopped": "Terminated.",
           "interventions": [{"role": "EXPERIMENTAL_ARM", "components": [
               {"name": "BINTRAFUSP ALFA", "entity_id": "CHEMBL:10", "modality": "Protein",
                "target_genes": ["TGFB1", "CD274"]},
               {"name": "GEMCITABINE", "entity_id": "CHEMBL:11", "modality": "Small molecule",
                "target_genes": ["RRM1"]}]}]}]
check("without a class, every experimental drug counts", signature(_combo)["molecules"], 2)
check("with a class, only the drugs that qualify the trial count",
      signature(_combo, area="Oncology", klass="TGF-β")["molecules"], 1)

# An unresolved drug counts as its own molecule, and the sentence admits it.
_unres = [{"nct_id": "NCT7", "_sponsor_group": "Acme", "why_stopped": "Terminated.",
           "interventions": [{"role": "EXPERIMENTAL_ARM", "components": [{"label": "XYZ-123"}]}]}]
_u = signature(_unres)
check("an unresolved drug still counts", _u["molecules"], 1)
check("and is flagged as unresolved", _u["molecules_unresolved"], 1)
check("with the caveat spelled out", "may be lower" in _u["sentence"], True)

check("no stops, no claim", signature([])["molecules"], 0)
check("assets carry the trials behind them",
      sorted(failed_assets(_one)[0]["trials"]), ["NCT0", "NCT1", "NCT2"])

# Comparing the customer's asset against the molecules that failed. The answer "this cohort is
# not about you" has to come out as readily as the answer "it is", or the comparison is just
# a way of agreeing with whoever paid for it.
from scripts.signals.build_evidence_package import compare_asset  # noqa: E402

_failed = [
    {"asset": "Tilavonemab", "modalities": ["Antibody"], "target_genes": ["MAPT"],
     "mechanisms": ["Microtubule-associated protein tau inhibitor"], "trial_count": 3, "trials": ["NCT1"]},
    {"asset": "Verubecestat", "modalities": ["Small molecule"], "target_genes": ["BACE1"],
     "mechanisms": ["Beta-secretase 1 inhibitor"], "trial_count": 1, "trials": ["NCT2"]},
    {"asset": "Unresolvable", "modalities": [], "target_genes": [], "mechanisms": [],
     "trial_count": 1, "trials": ["NCT3"]},
]
_anti_tau_ab = {"asset": "BEPRANEMAB", "modality": "Antibody", "target_genes": ["MAPT"], "mechanisms": []}
_by_asset = {c["asset"]: c for c in compare_asset(_anti_tau_ab, _failed)}
check("same target and modality is the closest match", _by_asset["Tilavonemab"]["verdict"], "closest")
check("a different target is not", _by_asset["Verubecestat"]["verdict"], "distant")
check("an unresolved molecule cannot be compared", _by_asset["Unresolvable"]["verdict"], "unknown")
check("the shared target is named", _by_asset["Tilavonemab"]["shared_target_genes"], ["MAPT"])

# Same target, different modality: related, not closest.
_tau_small = {"asset": "SOMETHING", "modality": "Small molecule", "target_genes": ["MAPT"], "mechanisms": []}
check("same target, different modality is related",
      {c["asset"]: c for c in compare_asset(_tau_small, _failed)}["Tilavonemab"]["verdict"], "related")

# Same modality, different target: weak. An anti-amyloid antibody is not an anti-tau antibody.
_amyloid_ab = {"asset": "LECANEMAB", "modality": "Antibody", "target_genes": ["APP"], "mechanisms": []}
check("same modality alone is weak",
      {c["asset"]: c for c in compare_asset(_amyloid_ab, _failed)}["Tilavonemab"]["verdict"], "weak")

# A shared mechanism string counts even when the gene symbols differ.
_mech = {"asset": "OTHER", "modality": "Peptide", "target_genes": [],
         "mechanisms": ["Microtubule-associated protein tau inhibitor"]}
check("an overlapping mechanism counts",
      {c["asset"]: c for c in compare_asset(_mech, _failed)}["Tilavonemab"]["verdict"], "related")

# Closest matches sort to the top, because that is the row someone has to answer for.
check("the closest match leads the table", compare_asset(_anti_tau_ab, _failed)[0]["asset"], "Tilavonemab")

# The change report end to end, against a previous release built to contain known differences.
# Attribution unit tests check the rule; this checks that the diff actually finds them, which
# is the part that was shipped without ever having run against a release that differed.
import gzip as _gzip  # noqa: E402
import json as _json  # noqa: E402
import importlib as _importlib  # noqa: E402
import tempfile as _tempfile  # noqa: E402

_cr = _importlib.import_module("scripts.signals.build_change_report")

with _tempfile.TemporaryDirectory() as _tmp:
    _tmp = Path(_tmp)
    _base = {"nct_id": "NCT00000001", "brief_title": "A", "phases": "PHASE2", "sponsor_group": "Acme",
             "overall_status": "TERMINATED", "why_stopped": "Lack of efficacy.",
             "failure_outcome": "BIOLOGICAL_FAILURE", "failure_primary_reason": "EFFICACY_FUTILITY",
             "failure_secondary_reasons": "", "focus_assets": "DRUG A", "focus_asset_ids": "CHEMBL:1",
             "focus_target_genes": "AAA", "focus_mechanisms": "inhibitor",
             "primary_completion_date": "2020-01-01", "classifier_version": "2.7.0"}

    def _rec(nct, **over):
        return {**_base, "nct_id": nct, **over}

    _current = [_rec("NCT1"), _rec("NCT2"), _rec("NCT3"), _rec("NCT4"), _rec("NCT_NEW")]
    _previous = [
        _rec("NCT1", why_stopped="Text the sponsor has since replaced."),   # registry event
        _rec("NCT2", failure_outcome="NON_BIOLOGICAL"),                      # our classifier moved
        _rec("NCT3", focus_target_genes="OLDGENE"),                          # our mapping moved
        _rec("NCT4"),                                                        # unchanged
        _rec("NCT_GONE"),                                                    # left the dataset
    ]

    (_tmp / "current.jsonl").write_text("\n".join(_json.dumps(r) for r in _current) + "\n")
    with _gzip.open(_tmp / "previous.jsonl.gz", "wt") as _fh:
        _fh.write("\n".join(_json.dumps(r) for r in _previous) + "\n")
    (_tmp / "meta.json").write_text(_json.dumps({"product": "Test", "dataset_version": "2026-09-14"}))
    (_tmp / "prev_meta.json").write_text(_json.dumps({"dataset_version": "2026-09-07"}))

    _saved = (_cr.CURRENT, _cr.META, _cr.SNAPSHOT, _cr.SNAPSHOT_META, _cr.OUT_JSON, _cr.OUT_MD)
    _cr.CURRENT, _cr.META = _tmp / "current.jsonl", _tmp / "meta.json"
    _cr.SNAPSHOT, _cr.SNAPSHOT_META = _tmp / "previous.jsonl.gz", _tmp / "prev_meta.json"
    _cr.OUT_JSON, _cr.OUT_MD = _tmp / "report.json", _tmp / "report.md"
    try:
        _cr.main()
        _report = _json.loads((_tmp / "report.json").read_text())
    finally:
        (_cr.CURRENT, _cr.META, _cr.SNAPSHOT, _cr.SNAPSHOT_META, _cr.OUT_JSON, _cr.OUT_MD) = _saved

    _c = _report["counts"]
    check("change report: a trial that entered the dataset is added", _c["added"], 1)
    check("change report: a trial that left it is removed", _c["removed"], 1)
    check("change report: three trials changed, one did not", _c["changed"], 3)
    _origin = {c["nct_id"]: c["origin"] for c in _report["changed"]}
    check("a new stop reason is a registry event", _origin.get("NCT1"), "registry_event")
    check("our classifier moving is not", _origin.get("NCT2"), "reclassification")
    check("nor is our mapping moving", _origin.get("NCT3"), "remapping")
    check("an unchanged trial is not reported", "NCT4" in _origin, False)
    check("the origins add up to the changed count",
          sum(_c["by_origin"].values()), _c["changed"])

    # The classifier version is read off the records, because the meta file does not carry it.
    check("the current classifier version is recovered", _report["pipeline"]["classifier_version_current"], "2.7.0")
    check("identical versions are not reported as a pipeline change",
          _report["pipeline"]["pipeline_changed"], False)
    check("the written report names the registry event", "NCT1" in (_tmp / "report.md").read_text(), True)

if failures:
    print(f"{failures} signal test(s) failed")
    sys.exit(1)
print("Signals tests passed.")
