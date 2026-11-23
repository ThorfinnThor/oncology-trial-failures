#!/usr/bin/env python3
"""Build the full licensed dataset as a dated release, for a marketplace listing (Defined.ai) or a
direct customer who buys a one-time licence.

  stop_reason_labels.csv / .jsonl   every stopped trial (TERMINATED, WITHDRAWN, SUSPENDED), labelled
                                    by why it stopped
  endpoint_labels.csv / .jsonl      every trial whose posted primary superiority analysis was read
                                    as MET, MISSED or MIXED (completed and stopped trials), if the
                                    weekly run's endpoint cache is present
  README.md                         datasheet: definitions, columns, method, validation, limits,
                                    sources and their terms, licence
  manifest.json                     release, row counts, SHA-256 of every file

What it leaves out, on purpose (docs/provenance_and_rights.md):
  * every ChEMBL-derived field (CC BY-SA: its ShareAlike condition would travel with the file);
  * the text of SEC filings. For the 50 trials labelled from a reviewed filing, `label_evidence`
    names the filing (form, date, URL) instead of quoting it; the filing is public at that URL;
  * PubMed abstracts, protocols, results documents (linked, never copied).

Inputs: data/all_stopped_trials.csv, and for endpoint labels .cache/universe/endpoint_outcomes.jsonl.gz
with .cache/universe/universe_v1.jsonl.gz (restored from the weekly run's cache by
.github/workflows/marketplace-package.yml). Without them the package has stop-reason labels only and
the README says so.

  python scripts/marketplace/build_package.py --out /tmp/pkg [--require-endpoints]
"""
from __future__ import annotations

import argparse
import collections
import csv
import gzip
import hashlib
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.samples.build_label_sample import BASIS, STOP_COLUMNS, fmt, pct  # noqa: E402

UNIVERSE = ROOT / ".cache/universe/universe_v1.jsonl.gz"
SEC_EVIDENCE = re.compile(r"(sec\.(?:programme|trial)_filing):(\S+ \S+ https://www\.sec\.gov/\S+?):\s.*$")
ENDPOINT_COLUMNS = ["nct_id", "brief_title", "overall_status", "phases", "disease_area", "lead_sponsor",
                    "start_date", "primary_completion_date", "endpoint_label", "endpoint_label_basis",
                    "sponsor_statement", "primary_comparisons_read", "stop_label_outcome",
                    "stop_label_primary_reason", "why_stopped", "results_url"]


def strip_filing_text(evidence: str) -> str:
    """`label_evidence` of a filing-based label without the filing's words: rule, form, date, URL.
    The evidence string is `;`-joined and a quote can itself hold `;`, so the SEC part is the last."""
    head, sep, tail = evidence.partition(";sec.")
    if not sep:
        return evidence
    m = SEC_EVIDENCE.match("sec." + tail)
    return f"{head};{m.group(1)}:{m.group(2)}" if m else head


def write_table(base: Path, columns: list[str], rows: list[list]) -> None:
    with open(base.with_suffix(".csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(columns)
        w.writerows(rows)
    with open(base.with_suffix(".jsonl"), "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(dict(zip(columns, r)), ensure_ascii=False) + "\n")


def endpoint_rows(stopped: dict[str, dict]) -> tuple[list[list], dict]:
    try:
        from scripts.universe.endpoint_outcomes import READER_VERSION, evidence_of, load_verdicts, read_on
    except Exception as exc:  # the reader imports heavy modules; a broken import loses the section only
        print(f"endpoint reader not importable: {exc}", file=sys.stderr)
        return [], {}
    verdicts = load_verdicts()
    if not verdicts or not UNIVERSE.exists():
        return [], {}
    stale = sum(1 for v in verdicts.values() if v.get("reader_version") != READER_VERSION)
    reg: dict[str, dict] = {}
    with gzip.open(UNIVERSE, "rt", encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            if r.get("nct_id") in verdicts:
                reg[r["nct_id"]] = r
    out = []
    for nct in sorted(verdicts):
        ev = evidence_of(verdicts[nct], limit=6)
        if not ev or nct not in reg:
            continue
        r, s = reg[nct], stopped.get(nct, {})
        out.append([nct, r.get("brief_title"), r.get("overall_status"), "|".join(r.get("phases") or []),
                    r.get("disease_area"), r.get("lead_sponsor"), r.get("start_date"), r.get("primary_completion_date"),
                    ev["verdict"], ev["basis"], ev.get("statement") or "", " || ".join(ev["lines"]),
                    s.get("classification_final_outcome", ""), s.get("classification_final_category", ""),
                    s.get("why_stopped", ""), ev["results_url"]])
    return out, {"read_on": read_on(), "reader_version": READER_VERSION, "rows_from_older_reader": stale}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--require-endpoints", action="store_true", help="fail if the endpoint cache is missing")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    meta = json.loads((ROOT / "web/public/dataset_meta.json").read_text())
    release = meta.get("version") or date.today().isoformat()
    rows = list(csv.DictReader(open(ROOT / "data/all_stopped_trials.csv", encoding="utf-8")))

    # 1. Stop-reason labels: every row, the sample's columns.
    stop_cols = [c for c, _ in STOP_COLUMNS]
    stop = []
    for r in rows:
        vals = []
        for col, src in STOP_COLUMNS:
            if col == "label_basis":
                vals.append(BASIS.get(r["classification_source"], r["classification_source"]))
            elif col == "label_evidence":
                vals.append(strip_filing_text(r["classification_evidence"]))
            else:
                vals.append(r[src])
        stop.append(vals)
    write_table(args.out / "stop_reason_labels", stop_cols, stop)
    leaked = [r[0] for r in stop if "sec.gov" in r[stop_cols.index("label_evidence")]
              and re.search(r"https://www\.sec\.gov/\S+:\s", r[stop_cols.index("label_evidence")])]
    if leaked:
        raise SystemExit(f"filing text left in label_evidence for {leaked[:5]}")

    # 2. Endpoint labels, where the weekly run's cache is present.
    ep, ep_meta = endpoint_rows({r["nct_id"]: r for r in rows})
    if args.require_endpoints and not ep:
        raise SystemExit("no endpoint labels: the endpoint cache is missing (run via marketplace-package.yml)")
    if ep:
        write_table(args.out / "endpoint_labels", ENDPOINT_COLUMNS, ep)

    # 3. Datasheet.
    full = collections.Counter(r["classification_final_outcome"] for r in rows)
    cats = collections.defaultdict(collections.Counter)
    for r in rows:
        cats[r["classification_final_outcome"]][r["classification_final_category"]] += 1
    basis = collections.Counter(BASIS.get(r["classification_source"], r["classification_source"]) for r in rows)
    areas = collections.Counter(r["disease_area"] for r in rows)
    statuses = collections.Counter(r["overall_status"] for r in rows)
    val = json.loads((ROOT / "validation/heldout_v2_metrics.json").read_text())
    est, ci = val["weighted_estimates"], val["weighted_estimates_ci95"]
    cc = json.loads((ROOT / "validation/crosscheck_gpt61/summary.json").read_text())
    cr = json.loads((ROOT / "validation/clinician_review/oncology-2026-11.json").read_text())
    epc = collections.Counter(r[8] for r in ep)
    ep_completed = sum(1 for r in ep if r[2] == "COMPLETED")
    bio = cats["BIOLOGICAL_FAILURE"]
    L = [f"# Clinical Trial Failures: labelled stopped trials and trial outcomes (release {release})", "",
         f"ClinicalTrials.gov snapshot imported {(meta.get('imported_at_utc') or '')[:10]}; package built "
         f"{date.today().isoformat()}; classifier {rows[0]['classification_version']}. Publisher: Clinical Trial "
         "Failures, https://clinicaltrialfailures.com, contact@clinicaltrialfailures.com.", "",
         "| File | Rows | What it is |", "| --- | ---: | --- |",
         f"| `stop_reason_labels.csv` / `.jsonl` | {fmt(len(stop))} | Every stopped trial, labelled by **why** it stopped |"]
    if ep:
        L.append(f"| `endpoint_labels.csv` / `.jsonl` | {fmt(len(ep))} | Trials whose posted primary analysis was read "
                 f"as met or missed ({fmt(ep_completed)} completed, {fmt(len(ep) - ep_completed)} other) |")
    L += ["| `manifest.json` | — | Row counts and SHA-256 checksums |", "",
          "Both tables are keyed by `nct_id` and can be joined. No patient-level data: every field is trial-level "
          "registry data or a label derived from it.", "",
          "## 1. Stop-reason labels", "",
          f"{fmt(len(stop))} trials, all {len(areas)} disease areas (" + ", ".join(f"{a} {fmt(n)}" for a, n in areas.most_common(5))
          + ", …), status " + ", ".join(f"{s} {fmt(n)}" for s, n in statuses.most_common()) + ".", "",
          "| `label_outcome` | Trials | Meaning |", "| --- | ---: | --- |",
          f"| `BIOLOGICAL_FAILURE` | {fmt(full['BIOLOGICAL_FAILURE'])} | The stated reason is about the drug's effect: "
          f"`EFFICACY_FUTILITY` {fmt(bio['EFFICACY_FUTILITY'])}, `SAFETY` {fmt(bio['SAFETY'])}, "
          f"`BIOLOGICAL_UNSPECIFIED` (benefit–risk) {fmt(bio['BIOLOGICAL_UNSPECIFIED'])} |",
          f"| `MIXED_CAUSES` | {fmt(full['MIXED_CAUSES'])} | Several explicit causes; see `label_secondary_reasons` |",
          f"| `NON_BIOLOGICAL` | {fmt(full['NON_BIOLOGICAL'])} | A reason unrelated to the drug's effect: "
          + ", ".join(f"`{c}` {fmt(n)}" for c, n in cats["NON_BIOLOGICAL"].most_common()) + " |",
          f"| `NON_FAILURE_TRANSITION` | {fmt(full['NON_FAILURE_TRANSITION'])} | Not a failure: planned milestone, "
          "replacement study, never started |",
          f"| `CAUSE_NOT_STATED` | {fmt(full['CAUSE_NOT_STATED'])} | A decision is stated without its cause |",
          f"| `UNRESOLVED` | {fmt(full['UNRESOLVED'])} | No reason or too ambiguous; not guessed |", "",
          "For a success/failure model, `BIOLOGICAL_FAILURE` is the failure class. The other outcomes are not "
          "success labels; we recommend excluding them rather than treating them as negatives.", "",
          "| Column | Content | Source |", "| --- | --- | --- |",
          "| `nct_id`, `brief_title`, `overall_status`, `phases`, `conditions`, `intervention_names`, "
          "`intervention_types`, `lead_sponsor`, `start_date`, `primary_completion_date`, `why_stopped`, "
          "`registry_url` | Registry fields as filed (`why_stopped` verbatim) | ClinicalTrials.gov |",
          "| `disease_area` | One of the areas above, from conditions and MeSH terms (keyword-based) | Ours |",
          "| `label_outcome`, `label_primary_reason`, `label_secondary_reasons` (`; `-separated) | The label | Ours |",
          "| `label_evidence` | Trace: classifier version, outcome, reason, each rule that fired and the text it "
          "matched. For `sec_filing` rows: the filing's form, date and URL | Ours |",
          "| `label_basis` | `rule`; `reviewed_decision` (the exact text was decided in an earlier AI-assisted review "
          "and the decision is reused); `sec_filing` (the registry gives no cause; the sponsor's own SEC filing "
          "states it, reviewed per trial with AI assistance, not by a clinician); `rule_on_description`; `unresolved` | Ours |",
          "| `needs_review`, `classifier_version` | Review flag; rule version | Ours |", "",
          "By basis: " + " · ".join(f"`{k}` {fmt(v)}" for k, v in basis.most_common()) + ".", ""]
    if ep:
        L += ["## 2. Endpoint labels", "",
              f"{fmt(len(ep))} trials: `MET` {fmt(epc['MET'])}, `MISSED` {fmt(epc['MISSED'])}, `MIXED` {fmt(epc['MIXED'])}. "
              f"Read from ClinicalTrials.gov posted results on {ep_meta.get('read_on')} (reader version "
              f"{ep_meta.get('reader_version')}).", "",
              "- Only outcome measures the sponsor marked PRIMARY, only superiority comparisons of at least two groups. "
              "Non-inferiority, equivalence, within-arm and Bayesian analyses are not read.",
              "- Called met or missed only against a threshold the record states, one its posted interval implies, or "
              "where every conventional threshold agrees. Anything else is not assessable and not in the file.",
              "- A sponsor's own sentence that the primary endpoint was not met wins over the numbers (`endpoint_label_basis` "
              "`sponsor_statement`); \"met\" is never read from prose.",
              "- `MET` means statistically significant, not approval and not the direction of benefit. `MISSED` can "
              "reflect dose, population, endpoint or comparator, not only the molecule.", "",
              "| Column | Content |", "| --- | --- |",
              "| registry columns | As in section 1 (ClinicalTrials.gov) |",
              "| `endpoint_label`, `endpoint_label_basis` | `MET`/`MISSED`/`MIXED`; `posted_analysis` or `sponsor_statement` |",
              "| `sponsor_statement` | The sponsor's sentence in the posted results, where the label rests on one |",
              "| `primary_comparisons_read` | Each comparison read, `||`-separated: measure, p or interval, threshold and why |",
              "| `stop_label_*`, `why_stopped` | The stop-reason label, for trials that stopped |",
              "| `results_url` | The posted results |", ""]
    else:
        L += ["## 2. Endpoint labels", "", "Not in this build: the weekly run's endpoint cache was not available.", ""]
    a = cc["agreement_with_reference"]
    L += ["## 3. Quality", "",
          f"- Held-out validation: {val['sample_size']} stop-reason texts never used to build the rules, labelled blind by "
          f"AI annotators. Biological-failure precision {pct(est['biological_precision'])} (95% CI "
          f"{pct(ci['biological_precision'][0])}–{pct(ci['biological_precision'][1])}), recall {pct(est['biological_recall'])} "
          f"(classifier {val['classifier_version']}).",
          f"- Cross-check by a second model family: {pct(a['biological_yes_no'])} agreement on biological vs. non-biological.",
          f"- Clinician review: one {cr['reviewer_role']} judged {cr['sample_size']} oncology stop reasons blind to our "
          f"label; {cr['labelled_biological_confirmed']} of {cr['labelled_biological']} biological labels confirmed "
          f"(precision {pct(cr['precision_biological'])}, 95% CI {pct(cr['precision_biological_ci95'][0])}–"
          f"{pct(cr['precision_biological_ci95'][1])}). One reviewer so far, oncology only.",
          "- Every rule change is listed with each label it changed. Protocol: https://clinicaltrialfailures.com/validation", "",
          "## 4. Limits", "",
          "- A stop reason is what the sponsor wrote, not independent proof of why a drug failed.",
          "- Safety failures are labelled from stop reasons only; adverse-event tables are not analysed.",
          "- Only ClinicalTrials.gov; trials registered elsewhere only are not included. Publications are not read.",
          "- `disease_area` is keyword-based. Registry fields are as filed, including sponsors' errors.", "",
          "## 5. Sources and terms", "",
          "| Source | What is used | Terms |", "| --- | --- | --- |",
          "| ClinicalTrials.gov (US National Library of Medicine) | Registry fields and posted results, as filed | "
          "ClinicalTrials.gov terms of use; registry fields stay under them |",
          "| SEC EDGAR | For `sec_filing` rows: the filing's identity and URL (no filing text) | Public filings |",
          "| Clinical Trial Failures | All labels, evidence traces, disease areas, the datasheet | Licensed under the agreement "
          "this package is delivered with |", "",
          "No ChEMBL, PubMed or other third-party database content is included.", "",
          "## Licence", "",
          "Delivered under a commercial licence (the agreement or marketplace terms it was obtained under), covering "
          "training, evaluation and deployment of models, with no restriction on the trained models or their outputs. "
          "Redistribution of the dataset itself is not included. The public sample is under CC BY-NC 4.0 "
          "(https://huggingface.co/datasets/clinical-trial-failures/clinical-trial-failures-sample).", "",
          "Cite: Clinical Trial Failures, https://clinicaltrialfailures.com, Zenodo DOI 10.5281/zenodo.23558833."]
    (args.out / "README.md").write_text("\n".join(L) + "\n", encoding="utf-8")

    files = sorted(p for p in args.out.iterdir() if p.is_file() and p.name != "manifest.json")
    manifest = {"release": release, "built": date.today().isoformat(), "classifier": rows[0]["classification_version"],
                "rows": {"stop_reason_labels": len(stop), "endpoint_labels": len(ep)}, "endpoint_reader": ep_meta,
                "files": {p.name: {"bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                          for p in files}}
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {args.out}: {len(stop)} stop-reason rows, {len(ep)} endpoint rows ({dict(epc)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
