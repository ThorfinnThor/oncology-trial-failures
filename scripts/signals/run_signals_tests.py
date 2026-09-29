#!/usr/bin/env python3
"""Offline unit tests for the Oncology Failure Signals enrichment helpers."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.signals.build_oncology_failure_signals import assign_role, in_scope, name_candidates, research_codes  # noqa: E402
from scripts.signals.sponsors import resolve_sponsor  # noqa: E402

failures = 0


def _dt_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")



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

# A stop reason that names safety only to rule it out is not a safety stop. NCT03860844 read
# "safety in this trial" off "…(stage 2 efficacy criteria not met); not due to safety concerns".
_neg = attribute({"nct_id": "NCT03860844", "why_stopped": "Study was prematurely stopped due to sponsor decision "
                  "(stage 2 efficacy criteria not met); not due to safety concerns."})
check("a denied safety concern is not the evidence", "safety in this trial" in _neg["own_data_evidence"], False)
check("the efficacy criterion is", _neg["own_data_evidence"], ["efficacy criteria not met in this trial"])
check("'No safety concern' alone says nothing about this trial's data",
      attribute({"nct_id": "NCT1", "why_stopped": "Sponsor decision (No safety concern)"})["attribution"], "unclear")
check("a negation ends at 'but'",
      attribute({"nct_id": "NCT1", "why_stopped": "Terminated not based on safety concerns, but due to insufficient efficacy."})["attribution"],
      "own_data")
check("an affirmed safety concern still counts",
      attribute({"nct_id": "NCT1", "why_stopped": "Terminated due to safety concerns."})["own_data_evidence"],
      ["safety in this trial"])
check("other studies' results are somebody else's",
      attribute({"nct_id": "NCT1", "why_stopped": "The study was terminated because 2 large Phase 3 studies showed no "
                 "clinical benefit. This decision was not based on any new safety concerns."})["attribution"],
      "programme_cascade")
check("a study named as the subject is this one",
      attribute({"nct_id": "NCT1", "why_stopped": "Study SPR001-203 did not meet its primary and secondary endpoints "
                 "therefore the sponsor has decided to terminate the study"})["attribution"],
      "own_data")
check("'lack of efficacy' is this trial's own finding",
      attribute({"nct_id": "NCT1", "why_stopped": "Trial was terminated by sponsor due to lack of efficacy."})["attribution"],
      "own_data")

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

# ---------------------------------------------------------------------------
# Watchlists. The failure mode here is silent in both directions: a term that never
# matches looks like a quiet market, and a classifier update sent as news teaches the
# subscriber to ignore the next mail. Both are checked.
# ---------------------------------------------------------------------------
from scripts.signals import send_watchlists as _wl  # noqa: E402
from scripts.signals.build_watch_terms import distinct as _distinct  # noqa: E402

check("punctuation is not part of a term", _wl.norm("PD-(L)1"), _wl.norm("pd l 1"))
check("an empty term normalises to nothing", _wl.norm("  -- "), "")

_events = [
    {"kind": "changed", "nct_id": "NCT00005047", "brief_title": "Chemotherapy in advanced disease",
     "sponsor_group": "SWOG Cancer Research Network", "focus_assets": ["cisplatin", "methotrexate"],
     "focus_target_genes": ["DHFR"], "focus_mechanisms": ["Dihydrofolate reductase inhibitor"],
     "changes": {"overall_status": {"from": "ACTIVE_NOT_RECRUITING", "to": "TERMINATED"}}},
    {"kind": "added", "nct_id": "NCT99999999", "brief_title": "A KRAS G12C inhibitor",
     "sponsor_group": "Amgen", "focus_assets": ["sotorasib"], "focus_target_genes": ["KRAS"],
     "focus_mechanisms": ["KRAS inhibitor"], "changes": {}},
]

check("a target matches", len(_wl.match(_events, ["DHFR"])), 1)
check("a molecule matches", len(_wl.match(_events, ["cisplatin"])), 1)
check("a sponsor matches", len(_wl.match(_events, ["SWOG Cancer Research Network"])), 1)
check("a term nobody in the list carries matches nothing", _wl.match(_events, ["nivolumab"]), [])
check("one event is reported once however many terms hit it",
      len(_wl.match(_events, ["cisplatin", "DHFR", "SWOG"])), 1)
check("both events can match", len(_wl.match(_events, ["cisplatin", "KRAS"])), 2)
check("a new status is matchable text", len(_wl.match(_events, ["TERMINATED"])), 1)

# Only a sponsor's own edit is news about a trial.
_report = {"added": [{"nct_id": "NCT1"}],
           "changed": [{"nct_id": "NCT2", "origin": "registry_event"},
                       {"nct_id": "NCT3", "origin": "reclassification"},
                       {"nct_id": "NCT4", "origin": "remapping"},
                       {"nct_id": "NCT5", "origin": "mixed"}]}
_news = {e["nct_id"] for e in _wl.registry_events(_report)}
check("a registry event is news", "NCT2" in _news, True)
check("a trial entering the dataset is news", "NCT1" in _news, True)
check("our classifier moving is not news", "NCT3" in _news, False)
check("our mappings moving are not news", "NCT4" in _news, False)
check("a change that is partly a registry event is news", "NCT5" in _news, True)

_subject, _body = _wl.render({"_key": "abc123", "email": "a@b.co", "terms": ["DHFR"]},
                             _wl.match(_events, ["DHFR"]), "2026-09-21")
check("the subject counts the trials, not the terms", _subject.startswith("1 registry change "), True)
check("every mail can be stopped from the mail itself", "/watchlist/stop?k=abc123" in _body, True)
check("the stop link is the page, never the raw API", "/api/watch?stop=" in _body, False)
check("a term is escaped, not injected", "<script>" not in _wl.render(
    {"_key": "k", "email": "a@b.co", "terms": ["<script>x</script>"]},
    _wl.match(_events, ["DHFR"]), "v")[1], True)

# Suggested terms: nine tubulin genes on the same trials are one term, not nine.
_tub = {f"TUBB{i}": set(f"NCT{j}" for j in range(40)) for i in range(1, 9)}
_tub["TUBB"] = set(f"NCT{j}" for j in range(41))
_tub["EGFR"] = {"NCT90", "NCT91"}
_kept = _distinct(_tub)
check("a paralogue family collapses to one chip", len(_kept & set(f"TUBB{i}" for i in range(1, 9))), 0)
check("the largest member of the family is the one kept", "TUBB" in _kept, True)
check("an unrelated target survives", "EGFR" in _kept, True)

# ---------------------------------------------------------------------------
# The fortnightly newsletter. Two failure modes worth a test: a week's changes
# quietly dropped because the mail only carries the latest report, and a mail
# that goes out weekly or not at all because the cadence was assumed rather
# than measured.
# ---------------------------------------------------------------------------
from scripts.signals import newsletter as _nl  # noqa: E402

# The weekly workflow's diff of the whole stopped-trial database (scripts/ingest_changes.py), one per run.
_r1 = {"generated_at_utc": "2026-09-07T06:30:00Z", "has_previous_snapshot": True,
       "previous": {"max_last_update_post_date": "2026-08-31"},
       "new_records": [{"nct_id": "NCT1", "brief_title": "One", "disease_area": "Cardiovascular"}],
       "updated_records": [
           {"nct_id": "NCT2", "changed_fields": ["overall_status"], "overall_status": "TERMINATED",
            "previous": {"overall_status": "RECRUITING"}},
           # Ours, not the sponsor's: a re-derived disease area and a reclassification.
           {"nct_id": "NCT3", "changed_fields": ["disease_area", "classification_outcome_v2"]}],
       "status_changes": [], "removed_records": []}
_r2 = {"generated_at_utc": "2026-09-14T06:30:00Z", "has_previous_snapshot": True,
       "new_records": [{"nct_id": "NCT4", "brief_title": "Four", "disease_area": "Oncology"}],
       "updated_records": [
           {"nct_id": "NCT1", "changed_fields": ["why_stopped"], "why_stopped": "x", "previous": {"why_stopped": ""}},
           {"nct_id": "NCT5", "changed_fields": ["overall_status", "last_update_post_date"],
            "overall_status": "WITHDRAWN", "previous": {"overall_status": "SUSPENDED"}},
           {"nct_id": "NCT2", "changed_fields": ["overall_status"], "overall_status": "RECRUITING",
            "previous": {"overall_status": "TERMINATED"}}],
       "status_changes": [], "removed_records": []}

_p = _nl.merge(_nl.merge({}, _r1), _r2)
check("a fortnight keeps both weeks' new trials, from every disease area", sorted(_p["added"]), ["NCT1", "NCT4"])
check("our own reclassifications never enter the mail", "NCT3" in _p["changed"], False)
check("a sponsor's status change does", _p["changed"]["NCT5"]["changes"],
      {"overall_status": {"from": "SUSPENDED", "to": "WITHDRAWN"}})
check("a status edited and edited back is not news", "NCT2" in _p["changed"], False)
check("a trial that entered is not also reported as changed", "NCT1" in _p["changed"], False)
check("every release in the window is recorded", _p["releases"], ["2026-09-07", "2026-09-14"])
check("the window starts where the previous snapshot ended", _p["since"], "2026-08-31")
check("a trial that leaves the stopped set again leaves the mail",
      "NCT4" in _nl.merge(_p, {"generated_at_utc": "2026-09-15", "removed_records": [{"nct_id": "NCT4"}]})["added"], False)
check("stops for efficacy or safety lead the list",
      [i["nct_id"] for i in _nl.order([
          {"nct_id": "A", "classification_outcome_v2": "NON_BIOLOGICAL", "classification_primary_reason_v2": "FUNDING",
           "phases": "PHASE3"},
          {"nct_id": "B", "classification_outcome_v2": "BIOLOGICAL_FAILURE",
           "classification_primary_reason_v2": "EFFICACY_FUTILITY", "phases": "PHASE1"}])], ["B", "A"])
check("registry phase strings read as phases", _nl.phase("PHASE1; PHASE2"), "Phase 1/2")
check("placebo is not a drug", _nl.drugs("Placebo; Latozinemab"), "Latozinemab")

check("a list that has never been mailed is due", _nl.due({}, False), True)
check("a list mailed yesterday is not", _nl.due({"last_sent_at": _dt_now()}, False), False)
check("--force overrides the wait", _nl.due({"last_sent_at": _dt_now()}, True), True)
check("an unparseable timestamp does not block the mail forever",
      _nl.due({"last_sent_at": "not a date"}, False), True)

_subject, _body = _nl.render(_p, {"trial_count": 23822, "brief_count": 51}, "https://example.test/stop?k=KEY")
check("the subject counts both kinds", _subject.startswith("2 new stopped trials, 1 record changed"), True)
check("the mail is about the whole database, not one area", "every disease area" in _body and "23,822" in _body, True)
check("one of a thing is not pluralised",
      _nl.render({"added": {"A": {"nct_id": "A"}}, "changed": {}, "releases": ["v"]}, {}, "u")[0]
      .startswith("1 new stopped trial, 0 records changed"), True)
check("a quiet fortnight says so rather than padding",
      "Nothing moved" in _nl.render({"added": {}, "changed": {}, "releases": ["v"]}, {}, "u")[0], True)
check("every mail can be stopped from the mail", "stop?k=KEY" in _body, True)
check("a registry title cannot smuggle markup",
      "<script>" not in _nl.render({"added": {"A": {"nct_id": "A", "brief_title": "<script>x</script>"}},
                                    "changed": {}, "releases": ["v"]}, {}, "u")[1], True)

check("the plain-text part carries the trials and the way out",
      all(x in _nl.render_text(_p, {}, "https://example.test/stop?k=KEY") for x in ("NCT4", "stop?k=KEY")), True)
check("every mail offers one-click unsubscribe to the mail client",
      _nl.unsubscribe_headers("KEY"), {"List-Unsubscribe": "<https://clinicaltrialfailures.com/api/newsletter?stop=KEY>",
                                      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"})
check("a changed field reads as words, not a column name",
      _nl.move_text("overall_status", {"from": "ACTIVE_NOT_RECRUITING", "to": "TERMINATED"}),
      ("Status", "Active not recruiting → Terminated"))
check("a registry month is a month", _nl.when("2026-03"), "Mar 2026")
# Gmail cuts a mail off at 102 KB and hides the rest, the unsubscribe link with it.
_big = {"added": {f"N{i}": {"nct_id": f"N{i}", "brief_title": "T" * 150, "why_stopped": "W" * 240,
                            "classification_primary_reason_v2": "SAFETY",
                            "classification_outcome_v2": "BIOLOGICAL_FAILURE", "phases": "PHASE2"} for i in range(200)},
        "changed": {f"C{i}": {"nct_id": f"C{i}", "brief_title": "T" * 150,
                              "changes": {"why_stopped": {"from": "a" * 90, "to": "b" * 160}}} for i in range(200)},
        "releases": ["2026-10-12"]}
check("even a huge fortnight stays under Gmail's clipping limit",
      len(_nl.render(_big, {}, "u")[1].encode()) < 100_000, True)
check("a quiet fortnight shows no row of zeros",
      "new stopped trials</div>" in _nl.render({"added": {}, "changed": {}, "releases": ["v"]}, {}, "u")[1], False)

check("a test send says so in the mail itself",
      "Test send." in _nl.render(_p, {}, "u", note="sample")[1], True)
check("a real issue carries no test banner", "Test send." in _nl.render(_p, {}, "u")[1], False)
check("a biopsy is not a drug", _nl.drugs("Biopsy; Biospecimen Collection; Glofitamab"), "Glofitamab")

if failures:
    print(f"{failures} signal test(s) failed")
    sys.exit(1)
print("Signals tests passed.")
