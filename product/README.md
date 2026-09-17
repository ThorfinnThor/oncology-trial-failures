# Oncology Failure Signals

Derived dataset of stopped oncology clinical trials with a biological failure signal (efficacy,
safety or unspecified biological cause), linked to investigational drugs, targets, sponsors,
tickers and publications. Rebuilt weekly from the latest ClinicalTrials.gov snapshot.

Built by Clinical Trial Failures from public sources. Registry and reference facts remain public at
their sources; the classification, linkage, validation and curation are derived work.

## Scope

- Stopped (terminated, withdrawn or suspended) oncology trials in ClinicalTrials.gov.
- Classification V2 outcome `BIOLOGICAL_FAILURE`, or `MIXED_CAUSES` that includes an efficacy,
  safety or unspecified biological cause.
- Classification quality (held-out, blind double annotation, n=600): biological failure precision
  95.5% (95% CI 91.6–98.7%), recall 95.3%. See `docs/validation_heldout_v2.md`.
- Coverage figures for each release are in `oncology_failure_signals_v1_meta.json`.

## Files

| File | Content |
| --- | --- |
| `oncology_failure_signals_v1.jsonl` | One record per trial with full nested detail |
| `oncology_failure_signals_v1.csv` | Flat analyst view (list values joined with `; `) |
| `oncology_failure_signals_assets_v1.json` | One record per canonical drug: aliases, mechanisms, targets, approval status, signal counts |
| `oncology_failure_signals_v1_meta.json` | Release date, counts, coverage metrics, source status, limitations |

## Trial record fields

| Field | Meaning | Source |
| --- | --- | --- |
| `nct_id`, `brief_title`, `official_title`, `registry_url` | Trial identity and link | ClinicalTrials.gov |
| `phases`, `overall_status`, `start_date`, `primary_completion_date`, `last_update_post_date` | Registry status and dates | ClinicalTrials.gov |
| `enrollment_count`, `enrollment_type`, `allocation`, `masking`, `has_results` | Design and results flags | ClinicalTrials.gov |
| `conditions`, `mesh_terms` | Indications | ClinicalTrials.gov |
| `stop_reason_text` | Stop reason used for classification | Registry "why stopped"; description sentence when blank |
| `stop_reason_source` | `REGISTRY_WHY_STOPPED` or `REGISTRY_DESCRIPTION` | Derived |
| `failure_outcome` | `BIOLOGICAL_FAILURE` or `MIXED_CAUSES` | Classification V2 |
| `failure_primary_reason`, `failure_secondary_reasons` | `EFFICACY_FUTILITY`, `SAFETY`, `BIOLOGICAL_UNSPECIFIED`, `MULTIPLE` plus secondary causes | Classification V2 |
| `classification_confidence`, `classification_evidence`, `classifier_version` | Confidence and the rule evidence that fired | Classification V2 |
| `sponsor_group` | Canonical company group (e.g. Genentech → Roche) | Registry sponsor; curated subsidiary table; registry-stated subsidiary |
| `lead_sponsor_raw`, `sponsor_class_ctgov`, `is_industry`, `collaborators` | Sponsor as registered | ClinicalTrials.gov |
| `sponsor_issuer_sec` | CIK, ticker(s), registrant name, match method | SEC EDGAR |
| `interventions[]` | Name, type, other names, arm types, `role` (`EXPERIMENTAL_ARM`, `BACKGROUND_OR_BACKBONE`, `COMPARATOR`, `PLACEBO`, `NON_DRUG`) | ClinicalTrials.gov arms |
| `interventions[].components[]` | Combination partners with `asset_id`, `asset_name`, `us_marketed_rxnorm`, `research_codes` | ChEMBL, RxNorm, registry other names |
| `focus_assets`, `focus_asset_ids`, `focus_research_codes` | Investigational focus: experimental-arm components not marketed in the US, or the full experimental regimen when all are marketed | Derived |
| `focus_mechanisms` | Mechanism of action (ChEMBL; MED-RT via RxClass when ChEMBL has none) | ChEMBL, RxClass |
| `focus_targets`, `focus_target_genes` | Molecular targets and gene symbols | ChEMBL |
| `focus_pharmacologic_classes` | FDA established pharmacologic class | RxClass |
| `focus_max_phase_chembl` | Highest development phase of the focus drugs | ChEMBL |
| `focus_includes_non_us_marketed` | At least one focus component is not US-marketed | Derived |
| `focus_asset_signal_trial_counts` | Signal trials per focus drug in this dataset | Derived |
| `publications`, `publication_count` | PubMed records mentioning the NCT ID (PMID, title, journal, date, link) | PubMed |
| `evidence_links` | Registry link plus up to five PubMed links | Derived |
| `enrichment_status` | Per-source status for the record (`OK`, `PARTIAL`, `UNAVAILABLE`) | Pipeline |

## Asset record fields

| Field | Meaning | Source |
| --- | --- | --- |
| `asset_id`, `canonical_name`, `id_source` | `CHEMBL:` or `RXCUI:` identifier and preferred name | ChEMBL, RxNorm |
| `chembl_id`, `rxcui`, `molecule_type`, `chembl_max_phase`, `chembl_first_approval`, `approved_chembl` | Identity and development status | ChEMBL, RxNorm |
| `us_marketed_rxnorm` | US clinical or branded drug concepts exist | RxNorm |
| `chembl_mechanisms`, `targets`, `target_gene_symbols` | Mechanisms and targets | ChEMBL |
| `mechanism_of_action_medrt`, `pharmacologic_class_fda_epc` | NLM/FDA classes | RxClass |
| `aliases`, `nct_ids` | Registry names and linked signal trials | ClinicalTrials.gov |
| `focus_signal_trial_count`, `focus_efficacy_signal_count`, `focus_safety_signal_count` | Signal trials where the drug is the investigational focus | Derived |
| `repeated_efficacy_signal`, `repeated_safety_signal` | Two or more such trials | Derived |

## Limitations

- Stop reasons are sponsor-reported registry text; the true cause can differ.
- Drugs resolve only on exact ChEMBL or RxNorm name or synonym matches; unmatched investigational
  codes are kept as research codes.
- PubMed links mention the NCT ID; they are not necessarily the primary results publication.
- Tickers reflect current SEC registrants; non-SEC-registered or acquired sponsors have none.
- US-marketed status reflects RxNorm product concepts, not current regulatory status.
- Analytical research signals, not clinical or investment advice.

## Sources and licensing

ClinicalTrials.gov, RxNorm and RxClass (U.S. National Library of Medicine), PubMed (NCBI) and SEC
EDGAR are U.S. government sources. ChEMBL (EMBL-EBI) is licensed CC BY-SA 3.0: attribution and
share-alike apply to ChEMBL-derived fields (`chembl_*`, `targets`, `target_gene_symbols`,
`focus_targets`, `focus_target_genes`, `focus_max_phase_chembl`, ChEMBL mechanisms).
