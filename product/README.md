# Oncology Failure Signals (v1)

Commercial derived dataset. **Generated files in this folder are not committed and are never
published to `web/public`.** Rebuild locally:

```bash
python scripts/signals/run_signals_tests.py
python scripts/signals/build_oncology_failure_signals.py --step all   # re-run until it prints the summary (cached, resumable)
```

## Scope

Stopped oncology trials whose Classification V2 outcome is `BIOLOGICAL_FAILURE`, or
`MIXED_CAUSES` with an efficacy, safety or unspecified-biological cause. Classification quality is
documented in `docs/validation_heldout_v2.md` (held-out biological precision 95.5%, recall 95.3%).

## Files

| File | Content |
| --- | --- |
| `oncology_failure_signals_v1.jsonl` | One record per trial, full nested detail |
| `oncology_failure_signals_v1.csv` | Flat analyst view |
| `oncology_failure_signals_assets_v1.json` | Canonical assets with aliases, mechanism, class and repeated-signal flags |
| `oncology_failure_signals_v1_meta.json` | Counts, coverage metrics, source status, limitations |

## Key fields

| Field | Meaning | Source |
| --- | --- | --- |
| `failure_outcome`, `failure_primary_reason`, `failure_secondary_reasons` | Classification V2 result | Registry stop text, CTF classifier |
| `classification_evidence` | Rule evidence that fired | CTF classifier |
| `sponsor_group` | Canonical company group | Registry sponsor + curated subsidiary table / registry-stated subsidiary |
| `sponsor_class_ctgov`, `is_industry` | Sponsor class | ClinicalTrials.gov |
| `interventions[].role` | `EXPERIMENTAL_ARM`, `BACKGROUND_OR_BACKBONE`, `COMPARATOR`, `PLACEBO`, `NON_DRUG` | ClinicalTrials.gov arm types |
| `interventions[].components[]` | Combination partners with `asset_id`, `asset_name`, `us_marketed_rxnorm`, `research_codes` | RxNorm; registry other names |
| `focus_assets`, `focus_asset_ids`, `focus_research_codes` | The investigational focus: experimental-arm components not marketed in the US (or the full experimental regimen when all are marketed) | Derived |
| `focus_mechanisms`, `focus_pharmacologic_classes` | MED-RT mechanism of action, FDA established pharmacologic class | RxClass |
| `focus_asset_signal_trial_counts` | Number of signal trials per focus asset | Derived |
| `enrichment_status` | Per-source status; `PENDING_NETWORK` = source not yet reachable | Pipeline |

| `focus_targets`, `focus_target_genes`, `focus_max_phase_chembl` | Targets, gene symbols and highest development phase | ChEMBL |
| `publications`, `publication_count` | PubMed records mentioning the NCT ID | PubMed E-utilities |
| `sponsor_issuer_sec` | CIK, ticker, registrant name, match method | SEC EDGAR |

## Source licensing notes

ChEMBL is CC BY-SA 3.0 (attribution and share-alike apply to redistributed ChEMBL-derived fields);
RxNorm/RxClass, PubMed metadata, ClinicalTrials.gov and SEC EDGAR are U.S. government sources.
Review ChEMBL share-alike obligations before selling ChEMBL-derived fields under a restrictive license.
