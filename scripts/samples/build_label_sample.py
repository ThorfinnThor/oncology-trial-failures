#!/usr/bin/env python3
"""Build an evaluation sample of our labels for a prospective data customer.

Two files and a data dictionary, in the format a licence would deliver:

  stop_reason_labels_sample.csv   stopped trials, labelled by why they stopped
  endpoint_labels_sample.csv      trials whose posted primary analysis met or missed
  README.md                       label definitions, columns, method, validation, limits, licence

Inputs are what the repository already holds: data/all_stopped_trials.csv (stop-reason labels),
web/public/trial_endpoints.json (posted-result verdicts for stopped trials that have a page),
validation/heldout_v2_metrics.json and validation/crosscheck_gpt61/summary.json (quality figures).
Completed trials' endpoint verdicts live only in the weekly run's cache and are not included.

Examples:
  python scripts/samples/build_label_sample.py --out /tmp/sample
  python scripts/samples/build_label_sample.py --out /tmp/sample --area Oncology --area Neurology \\
      --phase 2 --phase 3 --for "Example Bio"

The draw is seeded, so the same release and options give the same rows. No ChEMBL-derived field
is included (CC BY-SA; see docs/provenance_and_rights.md). Check the release first: never build a
sample for a customer from a release whose signals build failed (TODO.md).
"""
from __future__ import annotations

import argparse
import collections
import csv
import json
import random
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

BASIS = {"RULE_V2": "rule", "REVIEWED_EXACT": "reviewed_decision",
         "DESCRIPTION_FALLBACK": "rule_on_description", "UNCLASSIFIED": "unresolved"}

# Share of the stop-reason sample per stratum. Rare classes are over-drawn on purpose.
STRATA = [
    ("BIOLOGICAL_FAILURE", "EFFICACY_FUTILITY", 0.19),
    ("BIOLOGICAL_FAILURE", "SAFETY", 0.125),
    ("BIOLOGICAL_FAILURE", None, 0.04),            # the other biological categories
    ("MIXED_CAUSES", None, 0.085),
    ("NON_BIOLOGICAL", None, 0.29),
    ("NON_FAILURE_TRANSITION", None, 0.085),
    ("CAUSE_NOT_STATED", None, 0.085),
    ("UNRESOLVED", None, 0.10),
]
ENDPOINT_SHARES = (("MET", 1 / 3), ("MISSED", 1 / 2), ("MIXED", 1 / 6))

STOP_COLUMNS = [
    ("nct_id", "nct_id"), ("brief_title", "brief_title"), ("overall_status", "overall_status"),
    ("phases", "phases"), ("disease_area", "disease_area"), ("conditions", "conditions"),
    ("intervention_names", "intervention_names"), ("intervention_types", "intervention_types"),
    ("lead_sponsor", "lead_sponsor"), ("start_date", "start_date"),
    ("primary_completion_date", "primary_completion_date"), ("why_stopped", "why_stopped"),
    ("label_outcome", "classification_final_outcome"),
    ("label_primary_reason", "classification_final_category"),
    ("label_secondary_reasons", "classification_secondary_reasons_v2"),
    ("label_evidence", "classification_evidence"), ("label_basis", None),
    ("needs_review", "classification_needs_review"), ("classifier_version", "classification_version"),
    ("registry_url", "url"),
]
ENDPOINT_COLUMNS = ["nct_id", "brief_title", "overall_status", "phases", "disease_area", "lead_sponsor",
                    "intervention_names", "endpoint_label", "endpoint_label_basis", "sponsor_statement",
                    "sponsor_statement_location", "primary_comparisons_read", "stop_label_outcome",
                    "stop_label_primary_reason", "why_stopped", "results_url"]


def in_scope(r: dict, areas: set[str], phases: set[str]) -> bool:
    if r["study_type"] != "INTERVENTIONAL":
        return False
    if areas and r["disease_area"] not in areas:
        return False
    return any(f"PHASE{p}" in r["phases"] for p in phases)


def spread(rows: list[dict], n: int, rng: random.Random) -> list[dict]:
    """n rows, round-robin over disease areas so one area cannot fill a stratum."""
    by_area = collections.defaultdict(list)
    for r in rows:
        by_area[r["disease_area"]].append(r)
    for bucket in by_area.values():
        rng.shuffle(bucket)
    order = sorted(by_area)
    rng.shuffle(order)
    out: list[dict] = []
    while len(out) < n and any(by_area.values()):
        for a in order:
            if by_area[a] and len(out) < n:
                out.append(by_area[a].pop())
    return out


def fmt(n: int) -> str:
    return f"{n:,}"


def pct(x: float) -> str:
    return f"{100 * x:.1f}%"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", required=True, type=Path, help="directory to write (created)")
    ap.add_argument("--area", action="append", default=[], help="disease area, repeatable (default: all)")
    ap.add_argument("--phase", action="append", default=[], choices=["1", "2", "3", "4"],
                    help="phase, repeatable (default: 2 and 3)")
    ap.add_argument("--stop-n", type=int, default=240, help="rows in the stop-reason sample")
    ap.add_argument("--endpoint-n", type=int, default=120, help="rows in the endpoint sample")
    ap.add_argument("--for", dest="recipient", default="", help="recipient name for the README title")
    ap.add_argument("--seed", type=int, default=20261107)
    ap.add_argument("--huggingface", action="store_true",
                    help="write README.md as a Hugging Face dataset card: YAML header, public CC BY-NC 4.0 terms")
    args = ap.parse_args()

    areas, phases = set(args.area), set(args.phase or ["2", "3"])
    rng = random.Random(args.seed)
    rows = list(csv.DictReader(open(ROOT / "data/all_stopped_trials.csv", encoding="utf-8")))
    known_areas = {r["disease_area"] for r in rows}
    unknown = areas - known_areas
    if unknown:
        raise SystemExit(f"unknown disease area(s) {sorted(unknown)}; known: {sorted(known_areas)}")
    by_id = {r["nct_id"]: r for r in rows}
    meta = json.loads((ROOT / "web/public/dataset_meta.json").read_text())
    pool = [r for r in rows if in_scope(r, areas, phases)]

    # 1. Stop-reason labels
    picked, seen = [], set()
    for outcome, cat, share in STRATA:
        n = round(args.stop_n * share)
        cand = [r for r in pool if r["classification_final_outcome"] == outcome and r["nct_id"] not in seen
                and (r["classification_final_category"] == cat if cat else
                     outcome != "BIOLOGICAL_FAILURE" or r["classification_final_category"] not in ("EFFICACY_FUTILITY", "SAFETY"))]
        take = spread(cand, n, rng)
        seen.update(r["nct_id"] for r in take)
        picked += take

    args.out.mkdir(parents=True, exist_ok=True)
    with open(args.out / "stop_reason_labels_sample.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([c for c, _ in STOP_COLUMNS])
        for r in picked:
            w.writerow([BASIS.get(r["classification_source"], r["classification_source"]) if src is None else r[src]
                        for _, src in STOP_COLUMNS])

    # 2. Endpoint labels
    ep = json.loads((ROOT / "web/public/trial_endpoints.json").read_text())
    groups = collections.defaultdict(list)
    for nct, v in ep["trials"].items():
        if nct in by_id and in_scope(by_id[nct], areas, phases):
            groups[v["verdict"]].append(nct)
    ep_pick = []
    for verdict, share in ENDPOINT_SHARES:
        ids = sorted(groups[verdict])
        rng.shuffle(ids)
        ep_pick += ids[:round(args.endpoint_n * share)]
    with open(args.out / "endpoint_labels_sample.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(ENDPOINT_COLUMNS)
        for nct in ep_pick:
            v, r = ep["trials"][nct], by_id[nct]
            st = v.get("statement") or {}
            w.writerow([nct, r["brief_title"], r["overall_status"], r["phases"], r["disease_area"], r["lead_sponsor"],
                        r["intervention_names"], v["verdict"], v["basis"], st.get("text", ""), st.get("where", ""),
                        " || ".join(v["lines"]), r["classification_final_outcome"], r["classification_final_category"],
                        r["why_stopped"], v["results_url"]])

    # 3. README with this release's numbers
    full = collections.Counter(r["classification_final_outcome"] for r in rows)
    cats = collections.defaultdict(collections.Counter)
    for r in rows:
        cats[r["classification_final_outcome"]][r["classification_final_category"]] += 1
    basis = collections.Counter(BASIS.get(r["classification_source"], r["classification_source"]) for r in rows)
    in_sample = collections.Counter(r["classification_final_outcome"] for r in picked)
    ep_counts = collections.Counter(ep["trials"][n]["verdict"] for n in ep_pick)
    val = json.loads((ROOT / "validation/heldout_v2_metrics.json").read_text())
    est, ci = val["weighted_estimates"], val["weighted_estimates_ci95"]
    cc_path = ROOT / "validation/crosscheck_gpt61/summary.json"
    cc = json.loads(cc_path.read_text()) if cc_path.exists() else None
    cr_path = ROOT / "validation/clinician_review/oncology-2026-11.json"
    cr = json.loads(cr_path.read_text()) if cr_path.exists() else None
    scope = (", ".join(sorted(areas)) if areas else f"{len(known_areas)} disease areas") + \
        "; phase " + "/".join(sorted(phases))
    bio = cats["BIOLOGICAL_FAILURE"]

    hf_header = ["---", "license: cc-by-nc-4.0", "language:", "- en",
                 "pretty_name: Clinical Trial Failures - why trials stopped (labelled sample)",
                 "task_categories:", "- text-classification", "size_categories:", "- n<1K",
                 "tags:", "- clinical-trials", "- drug-development", "- clinicaltrials-gov", "- oncology", "- biomedical",
                 "configs:", "- config_name: stop_reasons", "  data_files: stop_reason_labels_sample.csv", "  default: true",
                 "- config_name: endpoints", "  data_files: endpoint_labels_sample.csv", "---", ""]
    L = (hf_header if args.huggingface else []) + [
         ("# Clinical Trial Failures — why trials stopped (labelled sample)" if args.huggingface else
          f"# Clinical Trial Failures — evaluation sample{' for ' + args.recipient if args.recipient else ''}"), "",
         *(["*Why did a clinical trial stop?* Every terminated, withdrawn or suspended trial on ClinicalTrials.gov, "
            "classified from the sponsor's stated reason into biological failure (efficacy, safety) and non-biological "
            "causes. This is a sample of the full, weekly-updated dataset at "
            "[clinicaltrialfailures.com](https://clinicaltrialfailures.com); validation at "
            "[clinicaltrialfailures.com/validation](https://clinicaltrialfailures.com/validation).", ""]
           if args.huggingface else []),
         f"Release {meta.get('version')} (ClinicalTrials.gov snapshot, imported "
         f"{(meta.get('imported_at_utc') or '')[:10]}). Prepared {date.today().isoformat()}.", "",
         "This sample shows the two kinds of labels we produce, in the format we would deliver. "
         + ("The public sample is under CC BY-NC 4.0; the full, weekly-updated data is licensed commercially (see *Licence*)."
          if args.huggingface else "It is for evaluation only (see *Licence*)."), "",
         "| File | Rows | What it is |", "| --- | ---: | --- |",
         f"| `stop_reason_labels_sample.csv` | {len(picked)} | Stopped trials, labelled by **why** they stopped |",
         f"| `endpoint_labels_sample.csv` | {len(ep_pick)} | Trials labelled by whether the sponsor's **posted primary analysis** met or missed |",
         "| `README.md` | — | Label definitions, columns, method, validation, limits |", "",
         f"Scope: interventional trials, {scope}. Both samples are drawn with a fixed seed; the stop-reason "
         "sample is stratified by outcome and spread across disease areas, so rare classes are over-represented "
         "compared with the full data.", "", "---", "", "## 1. Stop-reason labels", "",
         f"The full dataset holds {fmt(len(rows))} trials with status TERMINATED, WITHDRAWN or SUSPENDED on "
         "ClinicalTrials.gov, all disease areas, rebuilt every week.", "",
         "| `label_outcome` | Full dataset | In this sample |", "| --- | ---: | ---: |"]
    for o in ("BIOLOGICAL_FAILURE", "MIXED_CAUSES", "NON_BIOLOGICAL", "NON_FAILURE_TRANSITION", "CAUSE_NOT_STATED", "UNRESOLVED"):
        L.append(f"| `{o}` | {fmt(full[o])} | {in_sample[o]} |")
    L += ["", "### Label definitions", "", "| `label_outcome` | Meaning | `label_primary_reason` values |", "| --- | --- | --- |",
          "| `BIOLOGICAL_FAILURE` | The sponsor's stated reason is about the drug's effect: efficacy/futility, safety, "
          f"or an explicitly unfavourable benefit–risk | `EFFICACY_FUTILITY` ({fmt(bio['EFFICACY_FUTILITY'])}), "
          f"`SAFETY` ({fmt(bio['SAFETY'])}), `BIOLOGICAL_UNSPECIFIED` ({fmt(bio['BIOLOGICAL_UNSPECIFIED'])}) |",
          "| `MIXED_CAUSES` | Several explicit causes, kept together rather than forced into one. Not necessarily "
          "biological: check `label_secondary_reasons` for `EFFICACY_FUTILITY`, `SAFETY` or `BIOLOGICAL_UNSPECIFIED` | `MULTIPLE` |",
          "| `NON_BIOLOGICAL` | Stopped for a reason unrelated to the drug's effect | "
          + ", ".join(f"`{c}`" for c, _ in cats["NON_BIOLOGICAL"].most_common()) + " |",
          "| `NON_FAILURE_TRANSITION` | Not a failure: a planned milestone, a replacement study, or a trial that never "
          "started | `PLANNED_MILESTONE`, `REPLACEMENT_TRANSITION`, `NOT_INITIATED` |",
          "| `CAUSE_NOT_STATED` | A decision is stated (\"sponsor decision\") but no cause | "
          "`DECISION_WITHOUT_STATED_CAUSE`, `PROGRAM_ACTION_WITHOUT_STATED_CAUSE` |",
          "| `UNRESOLVED` | No stop reason, or text too ambiguous to label; routed to review instead of guessed | "
          "`UNRESOLVED_*` (the suffix says why) |", "",
          "For a success/failure model, `BIOLOGICAL_FAILURE` is the failure class. The other outcomes are **not** "
          "success labels: they say the trial stopped for another reason, or that we cannot tell. We recommend "
          "excluding them rather than treating them as negatives.", "",
          "### Columns — `stop_reason_labels_sample.csv`", "", "| Column | Content | Source |", "| --- | --- | --- |",
          "| `nct_id`, `brief_title`, `overall_status`, `phases`, `conditions`, `intervention_names`, `intervention_types`, "
          "`lead_sponsor`, `start_date`, `primary_completion_date` | Registry fields as filed | ClinicalTrials.gov |",
          "| `disease_area` | One of 15 areas, derived from conditions and MeSH terms | Ours |",
          "| `why_stopped` | The sponsor's stop reason, verbatim | ClinicalTrials.gov |",
          "| `label_outcome`, `label_primary_reason` | See above | Ours |",
          "| `label_secondary_reasons` | Further explicit causes, separated by `; ` | Ours |",
          "| `label_evidence` | Machine-readable trace: classifier version, outcome, reason, and each rule that fired with "
          "the text it matched | Ours |",
          "| `label_basis` | `rule`, `reviewed_decision` (this exact text was decided in an earlier review — AI-assisted, a few "
          "by the maintainer — not by clinicians, and the decision is reused), `rule_on_description` (no stop reason; a description sentence was "
          "used), `unresolved` | Ours |",
          "| `needs_review` | `True` where the classifier flags the row | Ours |",
          "| `classifier_version` | Version of the rules | Ours |",
          "| `registry_url` | Link to the trial record | ClinicalTrials.gov |", "",
          f"Full dataset by `label_basis`: " + " · ".join(f"`{k}` {fmt(v)}" for k, v in basis.most_common()) + ".", "",
          "---", "", "## 2. Endpoint labels (posted primary results)", "",
          "For trials that posted results on ClinicalTrials.gov, we read the sponsor's own primary superiority "
          "comparison: `MET` (every comparison read was significant), `MISSED` (none was, or the sponsor states the "
          "primary endpoint was not met), `MIXED` (some were, some not).", "",
          "- Only outcome measures the sponsor marked PRIMARY; only superiority analyses. Non-inferiority, adverse-event "
          "outcomes and Bayesian analyses are not read.",
          "- A result is called met or missed only against a threshold the record states, one its posted interval "
          "implies, or where every conventional threshold agrees. Everything else is \"not assessable\" and left out.",
          "- Only misses are read from prose; \"met\" is never read from prose.",
          "- `MET` means statistically significant. It does not check the direction of the effect and is not approval. "
          "`MISSED` can reflect dose, population, endpoint or comparator, not only the molecule.", "",
          f"This sample: stopped trials that posted results ({ep_counts['MET']} `MET`, {ep_counts['MISSED']} `MISSED`, "
          f"{ep_counts['MIXED']} `MIXED`). A stopped trial can still be `MET`, e.g. when stopped early for efficacy — "
          "compare `stop_label_outcome`. The same reader runs over completed Phase 2/3 trials; those labels can be "
          "included on request.", "",
          "| Column | Content |", "| --- | --- |",
          "| `endpoint_label`, `endpoint_label_basis` | `MET`/`MISSED`/`MIXED`; `posted_analysis` or `sponsor_statement` |",
          "| `sponsor_statement`, `sponsor_statement_location` | The sponsor's own sentence, where the label rests on one |",
          "| `primary_comparisons_read` | Each primary comparison read, `\\|\\|`-separated: measure, p or interval, the "
          "threshold applied and why, effect estimate, method |",
          "| `stop_label_outcome`, `stop_label_primary_reason`, `why_stopped` | The stop-reason label of the same trial |",
          "| `results_url` | The posted results |", "",
          "---", "", "## 3. How the labels are produced and checked", "",
          "- A versioned rule-based classifier reads the registry stop reason. Every rule must survive negation (\"not "
          "due to safety concerns\" is not a safety stop). Novel or empty language goes to `UNRESOLVED`.",
          "- Exact stop-reason texts decided in an earlier review (AI-assisted, a few by the maintainer) override the rules.",
          f"- Validation: a held-out sample of {val['sample_size']} stop-reason texts never used to build the rules, "
          "labelled blind by AI annotators. Biological-failure precision "
          f"{pct(est['biological_precision'])} (95% CI {pct(ci['biological_precision'][0])}–{pct(ci['biological_precision'][1])}), "
          f"recall {pct(est['biological_recall'])}. Measured on classifier {val['classifier_version']}; the labels here come from "
          "a later version, whose rule changes are each listed with every label they changed."]
    if cc:
        a = cc["agreement_with_reference"]
        L.append(f"- Cross-check by a model from a second model family: {pct(a['biological_yes_no'])} agreement on "
                 "biological vs. non-biological; against its labels, biological-failure precision is "
                 f"{pct(cc['estimates_crosscheck_reference']['biological_precision'])}. "
                 f"{cc['disputed_awaiting_review']} disputed texts await clinician review.")
    if cr:
        wd = cr["without_discussed_cases"]
        L.append(f"- Clinician review (first batch): one {cr['reviewer_role']} judged {cr['sample_size']} oncology stop "
                 f"reasons blind to our label. Of the {cr['labelled_biological']} we label biological, "
                 f"{cr['labelled_biological_confirmed']} were confirmed: precision {pct(cr['precision_biological'])} "
                 f"(95% CI {pct(cr['precision_biological_ci95'][0])}–{pct(cr['precision_biological_ci95'][1])}); "
                 f"biological yes/no agreed on {cr['agreement']['biological_yes_no']} of {cr['sample_size']}. One reviewer "
                 f"so far; {cr['sample_size'] - wd['sample_size']} texts had been discussed with us before they were "
                 f"answered (without them: {wd['biological_yes_no']} of {wd['sample_size']}). Individual clinician "
                 "verdicts are not part of this sample.")
    else:
        L.append("- Not available today: labels reviewed by clinical experts.")
    L += [
          "- Full protocol and results: https://clinicaltrialfailures.com/validation", "",
          "## 4. Limits", "",
          "- A stop reason is what the sponsor wrote, not independent proof of why a drug failed.",
          "- Safety failures are labelled from stop reasons only; adverse-event outcomes are not analysed.",
          "- Endpoint labels cover results posted on ClinicalTrials.gov; publications are not read.",
          "- `disease_area` is keyword-based.", "",
          "## Licence", ""]
    if args.huggingface:
        L += ["CC BY-NC 4.0: free for non-commercial use, including research and model training, with attribution. "
              "Commercial use — in a product, a commercial model or for a company's own pipeline decisions — needs a "
              "commercial licence, which also covers the full dataset, weekly updates and the clinician-reviewed labels as review proceeds. "
              "Registry fields remain under ClinicalTrials.gov's terms.", "",
              "Cite: Clinical Trial Failures, https://clinicaltrialfailures.com, Zenodo DOI 10.5281/zenodo.23558833.", "",
              "Contact: contact@clinicaltrialfailures.com"]
    else:
        L += ["This sample is for evaluation only. It may not be used to train or evaluate models, or in a product, without "
              "a commercial licence. Registry fields remain under ClinicalTrials.gov's terms. The public dataset is under "
              "CC BY-NC 4.0.", "", "Contact: contact@clinicaltrialfailures.com"]
    (args.out / "README.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"wrote {args.out}: {len(picked)} stop-reason rows ({dict(in_sample)}), "
          f"{len(ep_pick)} endpoint rows ({dict(ep_counts)})")
    if len(picked) < args.stop_n or len(ep_pick) < args.endpoint_n:
        print("note: fewer rows than asked — the scope does not hold enough trials in some strata")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
