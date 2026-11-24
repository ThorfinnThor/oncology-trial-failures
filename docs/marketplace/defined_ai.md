# Defined.ai data partnership: application kit (prepared 23 Nov 2026)

Defined.ai runs a marketplace for AI training data. Partners list datasets; Defined.ai sells licences
and pays the partner a licensing fee per sale, on terms the partner approves. What is known (from
public search results, 23 Nov; their own pages could not be opened from the session): any business
that generates or aggregates data can apply; Defined.ai checks quality, volume, metadata, licensing
rights, legal compliance and security before listing; data must be ethically sourced with the right
to commercialise it for AI training. **Not known:** the form fields, the revenue share, exclusivity
terms, payment terms. Check them in the partner agreement before signing.

## What we offer there, and what we keep

| | Listing A: stop-reason labels | Listing B: endpoint labels |
| --- | --- | --- |
| Content | Every stopped trial on ClinicalTrials.gov (24,132 on release 2026-11-23), labelled by why it stopped, with the text each label rests on | Trials whose posted primary superiority analysis reads as met or missed, completed and stopped |
| Rows | 24,132 | **5,559** (first package build, 23 Nov: MET 2,545, MISSED 2,518, MIXED 496; reader v3, read 23 Nov) |
| Public already? | Yes, under CC BY-NC 4.0 (site, Zenodo, Hugging Face sample). The marketplace sells the **commercial** right. Say so in the listing. | Only for stopped trials (576) and a 120-row sample; the completed-trial labels are not public |
| Format | CSV + JSONL + datasheet (README) + manifest with checksums | same |

- **Dated release only.** The weekly feed, custom scopes, clinician review and the drug/target fields stay
  direct sales (contact@clinicaltrialfailures.com).
- **Of ChEMBL only standard drug names (no IDs, mechanisms or targets), no SEC filing text, no PubMed abstracts** in the package
  (`docs/provenance_and_rights.md`). The builder checks the SEC part and fails if filing text is left.
- **Non-exclusive.** Do not grant Defined.ai exclusivity: the same data is sold directly and is public
  under CC BY-NC.
- **Price not below the direct price** for the same release, or the marketplace undercuts every direct
  offer.

## Prices (market research 23 Nov 2026; list prices to enter in the partner form)

Evidence (search snippets, sources in the session of 23 Nov): free commercial-use alternatives exist for
the stop-reason class (Open Targets predicted stop reasons, Apache 2.0; CTO weak outcome labels, MIT);
institutional subscriptions to trial databases run from about $19k/yr (Trialtrove, NCI) to $35k/yr
(Cortellis, NIH) and a median of about $68k/yr (GlobalData); Defined.ai does not publish its revenue
share (one unverified claim: providers keep 65–75 %). Judgement, not evidence:

| Listing | List price | ≈ per trial | Why |
| --- | ---: | ---: | --- |
| A: stop-reason labels (24,132) | **$9,500** | $0.40 | free substitutes cap it; the value is the evidence, the validation and the reviewed causes from SEC filings, publications and the EU register |
| B: endpoint labels (5,559) | **$14,500** | $2.60 | scarcer; no equivalent open set with stated thresholds |
| A + B | **$20,000** | | about one year of an institutional trial-database subscription, as a one-time purchase |

Direct (never cheaper on the marketplace): pilot €2,500 for one or two areas, credited within three
months; one-time A+B €18,000; annual with weekly updates €24,000 (A only €12,000); per record for small
buyers A $0.75, B $4 (minimum $2,500). Raise later rather than lower.

## How it differs from the free datasets (use in the listing and in replies)

| | Clinical Trial Failures | Open Targets stop reasons | CTO outcome labels |
| --- | --- | --- | --- |
| What a label is | rule-based reading of the sponsor's stated reason, or a reviewed decision from the sponsor's SEC filing, the trial's paper or the EU register | model-predicted stop-reason category | weakly supervised outcome (publications, phase links, news, market data) |
| Evidence per label | the exact text and rule; the filing, PMID or CTIS record | none | none per label |
| Negation handled | yes, tested over every stop reason ("not due to safety" is not a safety stop) | to be tested | to be tested |
| Unclear text | kept apart as unresolved | assigned a category | assigned a label |
| Results-based labels | met/missed from posted primary analyses against stated thresholds | no | partly, mixed with business signals |
| Drug tested vs background | yes, standard names, background kept apart | no | no |
| Validation | held-out blind set, second model family, clinician review | published model evaluation | published agreement with manual labels |
| Updates | weekly | periodic | periodic |
| Licence | CC BY-NC public; commercial licence | Apache 2.0 | MIT |

Wording for the listing (fair; no claims about the others beyond their documentation):

> Unlike predicted or weakly supervised labels, every label here can be audited: it keeps the sentence
> it was read from, and where the registry gives no reason, the decision cites the sponsor's SEC filing,
> the trial's own publication (PMID) or the EU trial register. Text the rules cannot read is left
> unresolved instead of being assigned a class. Endpoint labels come from the posted primary analyses,
> read against the threshold each record states.

## Listing text

**Title A:** Clinical Trial Stop Reasons: 24,000 Labelled Terminated and Withdrawn Trials (ClinicalTrials.gov)

**Short description A:** Every terminated, withdrawn or suspended trial on ClinicalTrials.gov, labelled
by why it stopped (efficacy/futility, safety, benefit–risk, recruitment, funding, strategy and 10 more
causes), with the sponsor's verbatim reason and the rule trace behind every label. Validated against
blind annotation and a clinician review.

**Description A:**
> Why do clinical trials fail? This dataset labels every stopped trial on ClinicalTrials.gov (24,132
> trials, all disease areas, start years 1990 onward) by the reason the sponsor gave. The failure class,
> BIOLOGICAL_FAILURE (2,584 trials: efficacy/futility 1,737, safety 666, benefit–risk 181), separates
> trials stopped because of the drug's effect from those stopped for recruitment, funding, strategy,
> supply or regulatory reasons (14,230), several causes (258), planned transitions (1,621), and trials
> whose reason is missing or ambiguous (5,439), which are kept apart rather than guessed.
>
> Each row carries the registry fields (phase, conditions, interventions, sponsor, dates), the drugs tested
> under their standard name (fully identified for 76 % of trials with a drug), kept apart from the
> background the control arm also received, the sponsor's verbatim stop reason, the label, secondary
> causes, and a machine-readable trace of the rule and the text it matched. For 257 trials whose
> registry entry gives no cause, the label comes from a per-trial review of the sponsor's SEC filing
> (50), the trial's own publication (194) or the EU Clinical Trials Information System (13), each cited.
>
> Quality: on a held-out set of 600 texts labelled blind, biological-failure precision 95.5% and
> recall 95.3%; 98.2% agreement with an independent second annotator on biological vs. non-biological;
> a clinician confirmed 101 of 103 biological labels in a blind oncology review (one reviewer so far).
> Every rule change is published with each label it changed.
>
> Unlike predicted or weakly supervised labels, every label here can be audited back to the text,
> filing, paper or register record it rests on.
>
> Use: training and evaluating trial-outcome and probability-of-success models, failure-reason
> classifiers, and benchmarks for clinical text understanding.
>
> A non-commercial version is public under CC BY-NC 4.0; this listing grants commercial use for
> training, evaluation and deployment with no restriction on the trained models.

**Title B:** Clinical Trial Primary Endpoint Outcomes: Met or Missed, Read from Posted Results

**Description B:**
> For trials that posted results on ClinicalTrials.gov, whether the sponsor's primary superiority
> analysis met or missed, read from the posted comparison against the threshold the record states, or
> from the sponsor's own statement that the endpoint was not met. Results that cannot be called
> without assuming a threshold are left out rather than guessed. Each row lists the comparisons read
> (p-value or interval, threshold and why) and links the results. Includes completed Phase 2/3 trials,
> which most trial-status datasets cannot label as failures. 5,559 trials (2,545 met, 2,518 missed, 496
> mixed), with the drugs tested under their standard name. Joins to the stop-reason dataset by NCT ID.

**Data card fields:** modality text/tabular · domain healthcare, life sciences, drug development ·
language English · no personal data (trial-level registry records, no patient-level data) · source
ClinicalTrials.gov (US National Library of Medicine) plus our labels · update: dated release ·
sample: https://huggingface.co/datasets/clinical-trial-failures/clinical-trial-failures-sample

## Application text (partner form, "about your data")

> Clinical Trial Failures (clinicaltrialfailures.com) builds labelled datasets of clinical trial
> outcomes from public registry records. Our main dataset labels every stopped trial on
> ClinicalTrials.gov (24,132 trials) by why it stopped, with the evidence for each label; a second
> labels whether trials met or missed their primary endpoint from posted results. Labels come from a
> versioned, published rule set, validated on a held-out blind sample and a clinician review
> (clinicaltrialfailures.com/validation), and are rebuilt weekly. We would like to list dated
> releases of both for AI training and evaluation (trial-outcome prediction, probability of success,
> biomedical text classification), non-exclusively. Rights: the underlying records are public
> registry data; the labels, evidence traces and documentation are our own work; no personal data;
> no third-party licensed databases are included. A 360-row public sample with data dictionary is on
> Hugging Face (clinical-trial-failures/clinical-trial-failures-sample); a DOI release is on Zenodo
> (10.5281/zenodo.23558833).

## Rights and provenance statement (for their due diligence)

- **Source records:** ClinicalTrials.gov, operated by the US National Library of Medicine. Records are
  submitted by sponsors and published for public access; we redistribute registry fields as filed
  under ClinicalTrials.gov's terms and link every record. No protocols, statistical analysis plans or
  results documents are included.
- **Our work:** labels, evidence traces, disease-area assignment, endpoint verdicts and documentation
  are created by Clinical Trial Failures. We hold the rights and can grant a commercial licence.
- **Third-party content:** of ChEMBL (CC BY-SA) only the standard names of drugs (facts), attributed; NCI
  Thesaurus codes (CC BY 4.0), attributed; no PubMed abstracts; no SEC filing text in the package (only
  links to public filings).
- **Personal data:** none. Trial-level records; sponsor and organisation names only. No patient data,
  no investigator contact details.
- **Human review:** AI-assisted review decisions and one clinician reviewer so far; individual
  reviewer verdicts are not part of the package.
- **Non-commercial version:** public under CC BY-NC 4.0; commercial use needs our licence.
- **Not warranted:** clinical truth of a sponsor's stated reason, completeness of the registry.

## Who does what

| Step | Who |
| --- | --- |
| Confirm the list prices above (A $9,500, B $14,500, A+B $20,000) and the minimum terms (non-exclusive, no sub-licensing, dated release) | Schayan |
| Add the repository secret `PACKAGE_PASSPHRASE` (GitHub → Settings → Secrets and variables → Actions) | Schayan |
| Build the package: Actions → **Marketplace package** → Run workflow; download the artifact; decrypt (command in the workflow file) | Schayan, or Claude can start the run |
| Submit the partner application (defined.ai → Partnerships → Data partner) with the text above, company details, payout details | Schayan |
| Answer due-diligence questions: the rights statement above; the datasheet is the package README | Schayan, Claude drafts answers |
| Review the partner agreement: exclusivity, revenue share, payment terms, liability, whether Defined.ai may sub-license | Schayan (lawyer if it asks for exclusivity or warranties of clinical accuracy) |
| Upload the package once accepted; keep the release date in the listing | Schayan |

The listing texts' numbers are from release 2026-11-20; update them from the package's README when
building the release that is uploaded.
