# Discontinuation rates — methodology

Discontinuation rates put each biological stop in context: how often trials in a comparable group stopped for
efficacy, safety or benefit–risk reasons.

## Universe (denominator)

- ClinicalTrials.gov interventional trials with Phase 2 or Phase 3 (Phase 1/2 counts as Phase 2,
  Phase 2/3 as Phase 3), start date from 2010, all statuses (`scripts/universe/fetch_universe.py`).
- Disease area uses the same mapping as the stopped-trial dataset; rates default to oncology.
- Stopped trials carry the Classification V2 result from the canonical snapshot, or the same
  classifier with the reviewed-reason index for trials outside the snapshot window.

## Entity resolution

Order of evidence (`scripts/universe/resolve.py`):

1. **ChEMBL** — offline index of clinical-stage molecules (max phase ≥ 0.5) with synonyms, mechanisms
   and targets (`scripts/universe/chembl_index.py`). Exact normalized match of the intervention label,
   parenthetical aliases and cleaned forms (dose, formulation, arm/cohort words removed).
2. **NCI Thesaurus** — offline index of therapeutic-agent concepts (`scripts/universe/ncit_index.py`),
   which covers many recent research codes (e.g. AK117 = ligufalimab). If the NCIt concept's synonyms
   identify exactly one ChEMBL molecule the drug is linked to ChEMBL; otherwise the NCIt concept is the
   entity and targets are extracted from the first sentence of its definition (`target_source =
   NCIT_DEFINITION`). ChEMBL molecules without mechanism records also take targets from NCIt.
3. **Registry other names** — used only when the label has no own research code and every resolvable
   other name points to the same drug (other names often list combination partners).
4. **Research code only** — an unmatched single research code becomes a stable `CODE:` entity.
5. **Class labels** — "PD-1 inhibitor", "CD19 CAR-T cells" carry the target but no drug identity.

Regimen acronyms (FOLFOX, R-CHOP, …) and NCIt named regimens are expanded into components; very short
variants (< 4 characters) are ignored unless curated; supportive care and generic labels are excluded
from resolution metrics. Modality comes from ChEMBL molecule type, NCIt definitions and name rules.

### Resolution quality (release 2026-09-17, oncology, industry sponsors, experimental-arm drugs)

| Metric | Value |
| --- | --- |
| Components | 18,806 |
| Resolved to a canonical drug (ChEMBL or NCIt) | 86.4% |
| Identified (canonical drug, stable research code or target class) | 93.5% |
| With at least one target gene | 70.1% |

Blind audit of 200 resolved components (stratified by source; `validation/resolution_audit_v1.json`),
judged by an independent LLM curator with web look-ups for obscure codes:

| Check | Result |
| --- | --- |
| Identity correct, direct label match (ChEMBL, NCIt, NCIt→ChEMBL) | 173 / 175 (98.9%) |
| Identity correct, via registry other names | 22 / 25 (88%) — rule tightened after the audit |
| Target genes wrong where present | 5 / 145 (3.4%) |
| Target genes missing | 55 / 200 (27.5%) |

Resolution rates are recomputed for every release in `resolution_report.json`.

## Definitions

| Term | Definition |
| --- | --- |
| Closed trial | Status COMPLETED or TERMINATED. WITHDRAWN (never enrolled), SUSPENDED, UNKNOWN and ongoing trials are excluded. |
| Biological stop | TERMINATED with outcome BIOLOGICAL_FAILURE, or MIXED_CAUSES including efficacy, safety or unspecified biological cause. |
| Discontinuation rate | Biological stops ÷ closed trials, with a 95% Wilson interval. |
| Lower bound | Biological stops ÷ all trials that were not withdrawn (assumes every open trial completes). |
| Segment | Target or gene of any experimental-arm drug; combination partners may sit in experimental or backbone arms. |
| Stop date estimate | Actual primary completion date for stopped trials; last update posting when unavailable (basis recorded). |

Default start window ends four years before the current year so most trials have had time to close.

## What the rate is not

- **Not a failure rate.** Trials that completed and missed their endpoints are not in it; the rate
  measures early discontinuation for biological reasons reported in the registry. Those trials are
  counted separately — see *Missed endpoints* below — but never folded into the rate.
- **Not causal.** Stop reasons are sponsor-reported and can be incomplete.
- **Trial-level, not program-level.** A program discontinued after a completed pivotal trial may show
  no stopped trials.
- Rates among closed trials can be inflated for recent cohorts because early stops close sooner than
  completions; use older start windows and the lower bound for recent cohorts.

## Missed endpoints

A discontinuation rate only sees trials that were stopped. In oncology that is most of how a
programme dies; in endocrine and metabolic disease it is almost none of it — 28 biological stops in
1,637 closed trials — because those fields run large outcome trials to the end and then report that
the drug did not beat placebo. That failure is real and the registry records it.

`scripts/universe/endpoint_outcomes.py` reads it, and reads nothing else: no re-analysis, no
inference from an abstract, no judgement about whether the endpoint was the right one.

What counts, deliberately narrowly:

- only trials whose status is **COMPLETED** — a still-recruiting study that posted an interim
  analysis is not a finished answer;
- only outcome measures the sponsor typed **PRIMARY**;
- only analyses the sponsor typed **SUPERIORITY**. A non-inferiority test that fails to reject is a
  different event; it is counted as skipped and never as a miss;
- only analyses comparing **at least two groups** — a within-arm change from baseline is not a
  comparison;
- only a p-value the record settles against **0.05**. `<0.001` is significant, `>0.05` and an
  explicit `NS` are not, `<0.1` settles nothing and is left unread.

A trial where every qualifying analysis came back non-significant is `MISSED`; all significant,
`MET`; co-primaries that disagree, `MIXED`, reported as its own category because the registry does
not say whether the design needed both.

**It is a floor, not a rate.** Roughly half of completed trials post results at all, and of those
only about a third post a primary superiority analysis with a readable p-value. 1,500 misses across
2015–2024 is what the registry states outright, not what happened.

`MET` is not approval and `MISSED` is not a verdict on the molecule. It is the sponsor's own posted
comparison, read back.

Output: `.cache/universe/endpoint_outcomes.jsonl.gz`, joined into class signatures and evidence
packages by NCT ID. Every consumer treats a missing file as "no endpoint section" rather than an
error, so the fetch can lag a release without breaking one.

## Mechanism classes and briefs

Segments are grouped into 131 curated mechanism classes across five disease areas (`scripts/universe/mechanism_classes.py`) —
the units analysts use ("PD-(L)1", "PARP", "KRAS", "TGF-β"), each defined as a set of HGNC gene
symbols. A trial belongs to a class when any drug in an experimental arm targets one of its genes;
combination filters also consider drugs given as the backbone in both arms.

Each release writes:

| File | Content |
| --- | --- |
| `product/discontinuation_rates/oncology_discontinuation_rates_v1.json` | Baseline plus every segment (class, class × phase, class + PD-(L)1, modality, phase, start year, sponsor class, sponsor group) with counts, rate, 95% CI and the NCT IDs behind each rate |
| `product/discontinuation_rates/oncology_discontinuation_rates_by_*.csv` | Flat tables per dimension |
| `product/briefs/brief_<segment>.html` + `.facts.json` | Discontinuation-rate brief per class with enough data (≥20 closed trials, ≥3 stops), and the facts behind every number |

`scripts/briefs/build_brief.py` generates a brief for any segment on demand:

```bash
python scripts/briefs/build_brief.py --class "TGF-β" --with-class "PD-(L)1" --start 2015:2024
python scripts/briefs/build_brief.py --sponsor-group Novartis
```

## Reproduce

```bash
python scripts/universe/run_universe_tests.py
python scripts/universe/fetch_universe.py
python scripts/universe/chembl_index.py
python scripts/universe/ncit_index.py
python scripts/universe/resolve.py
python scripts/universe/discontinuation_rates.py --tables --pack --start 2015:2024
python scripts/briefs/build_brief_catalog.py
```
