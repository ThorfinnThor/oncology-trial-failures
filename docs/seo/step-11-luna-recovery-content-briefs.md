# Step 11 — Luna recovery content briefs

**Model:** Luna
**Status:** Ready for Sol implementation; not deployed
**Dataset used:** `2026-10-05`, ClinicalTrials.gov API v2, 23,868 stopped-trial records
**Purpose:** Improve the six largest loss pages with genuinely useful, evidence-led content rather than adding interchangeable SEO text.

## Editorial rule for all six pages

These are six different search destinations, not six copies of one landing-page template. Sol should preserve each page's existing data product and give it a distinct editorial shape:

- Do not copy the same introduction, section sequence, FAQ block, or conclusion across the pages.
- Do not write a paragraph merely to increase word count. Every new passage must answer a page-specific question, interpret a current dataset pattern, or help the reader verify a record.
- Counts, shares, rankings, and examples must be generated from the current server data. Do not copy older hard-coded values from `seoLandingPages.ts`.
- Every scientific interpretation must distinguish registry evidence from an inference. Use language such as “the registry records…” or “this is classified as…” rather than claiming that the database proves a drug failed.
- Use a small number of strong examples with direct NCT/source links. Do not create a wall of trial cards.
- Keep the existing canonical and `index,follow` policy for these six pages. This work is content improvement, not an indexability experiment.

## Page 1 — `/`

### Editorial job

The homepage is the database's front door. Its job is to answer “What is this dataset, and how do I use it?” quickly, then give the reader a credible reason to continue into a specific analysis. It should not behave like a generic article about clinical-trial failure.

### Proposed angle

**“A stopped status is a starting point, not a diagnosis.”** Make the homepage a short orientation to the site's evidence model: one path for biological signals, one for operational/strategic stops, and one for records that require review.

### Data to surface

Use the current `getStaticProps` snapshot and the V2 classification values:

- 23,868 records in the current stopped-trial dataset.
- 2,434 classified as likely biological failure signals.
- 1,617 efficacy/futility records and 630 safety records.
- 13,795 operational, 5,309 other/unknown, and 3,621 review-gated/uncertain records in the current classification view. Explain that these are related but not identical analytical groupings where appropriate; do not add them together as if they were one mutually exclusive display unless the source field confirms it.
- Source refresh date `2026-10-05`, classifier version `2.7.1`, and the existing validation context already exposed by the page.

### Experience to build

Replace any generic explanatory filler with a compact “choose your question” route map:

1. **Did the intervention appear not to work or become unsafe?** Link to efficacy/futility and safety evidence.
2. **Did the study stop for recruitment, funding, strategy, or execution?** Link to operational and sponsor views.
3. **Is the registry wording too incomplete to classify confidently?** Link to the methodology and review-gated records.

Below that, show a small “read one record correctly” example using the already data-selected sample trials. The example should display the stop language, classification label, and source link together, making the site's workflow concrete.

### Internal links

Link contextually to `/overview`, `/clinical-trial-futility`, `/failures/phase-2`, `/failures/neurology`, `/sponsor/pfizer`, and `/methods`. Avoid a repeated list of every major route.

### Do not claim

Do not describe all 23,868 records as failed drugs, and do not present the Cloudflare visit volume as evidence of search demand. The homepage should establish the distinction that the recovery work depends on.

### Acceptance criteria

- The core explanation and current totals are present in raw HTML before hydration.
- At least one source-linked example is visible without opening the interactive explorer.
- The page contains a clear next action for each of the three reader intents above.
- No copied section heading or paragraph is introduced solely because another recovery page has it.

## Page 2 — `/clinical-trial-futility`

### Editorial job

This page should satisfy a reader who wants to understand futility as a decision signal, not simply find a list of trials containing the word “futility.” The key distinction is between a pre-specified or interim futility decision, a failed endpoint, and a broad sponsor decision where the source does not expose the statistical basis.

### Proposed angle

**“Futility is a decision under uncertainty.”** Lead with how interim evidence can stop a study before completion, then let the dataset show where futility-like language appears across phases and disease areas.

### Data to surface

Use the live insight calculation, not the old static copy:

- 1,617 current efficacy/futility records.
- Status split: 1,551 terminated, 57 withdrawn, and 9 suspended.
- Phase distribution led by Phase II (680) and Phase III (404), with combined Phase I/II and Phase II/III kept visible rather than silently assigned to a single phase.
- Leading areas: Oncology 532, Other 293, Infectious Disease 140, Neurology 140.
- Related but broader endpoint-signal set: 1,877 records. Explain why this is broader than the narrower efficacy/futility bucket.

### Experience to build

Use a narrative “from wording to interpretation” flow rather than the site's normal metric-grid pattern:

1. **What the registry actually says:** show three source examples with different evidentiary strength, such as NCT04628481 (explicit futility), NCT05220098 (limited anti-cancer activity), and NCT05534984 (DSMB/statistical futility), provided the current row still contains those exact snippets.
2. **What can and cannot be inferred:** separate explicit futility, failed/insufficient activity, and program-level decisions that mention no endpoint.
3. **Where the signal concentrates:** use the live phase and area distributions to let the reader explore rather than asserting that Phase II “causes” more failures.

Each example should show the exact short stop language beside a plain-language interpretation and an NCT link. If an example is no longer in the current data, replace it with a dynamically selected record of the same evidentiary type.

### Internal links

Link to `/overview` for the full taxonomy, `/failures/phase-2` for the largest phase slice, `/failures/oncology` for the largest area, and `/methods` for classification limits.

### Do not claim

Do not equate a futility label with a definitive proof that the mechanism is invalid. Do not turn the 1,617 count into a rate without a denominator that matches the query.

### Acceptance criteria

- The page explains the difference between explicit futility, insufficient activity, endpoint failure, and unspecified program decisions.
- Examples are source-linked and their interpretation does not exceed the registry language.
- At least one live distribution is rendered server-side; the page is still useful if JavaScript is unavailable.

## Page 3 — `/failures/neurology`

### Editorial job

This is a disease-area evidence hub. The reader is likely asking whether neurological trial stops are predominantly biological, operational, or strategic, and which phase/sponsor patterns deserve closer review.

### Proposed angle

**“Neurology stops are heterogeneous: the reason matters more than the status.”** Make the page a compact analytical reading of the 1,054-record neurology slice, not a generic description of neurological disease.

### Data to surface

- 1,054 neurology records; 167 likely biological signals, or 15.8%.
- 559 non-biological stops, 163 unresolved/review-required records, 106 cause-not-stated records, 55 non-failure transitions, and 4 mixed-cause records.
- Top resolved reasons: recruitment 254, efficacy/futility 140, business/strategy 96, decision without stated cause 85, funding 67.
- Phase mix: Phase II 414, Phase III 217, Phase I 213, Phase IV 128.
- Top sponsors in this slice: Biogen 38, Merck Sharp & Dohme 25, Novartis Pharmaceuticals 20, GlaxoSmithKline 18, Pfizer 18.

### Experience to build

Give this page a “case comparison” shape:

- Open with the 15.8% biological share and immediately compare it to the much larger operational bucket.
- Add a three-row evidence table with distinct cases: NCT05256134 (development stop following a pre-planned safety/efficacy analysis), NCT05478031 (elevated transaminases), and NCT03870763 (enrollment/landscape constraints and explicitly not safety-driven).
- Follow the table with a short interpretation of why neurological programs can look similar in status data while representing different scientific and operational events.
- Keep the existing hub trial list as the exploration layer; the editorial copy should help a reader decide which filter to use.

### Internal links

Link to `/clinical-trial-futility`, `/failures/phase-2`, `/terminated-vs-withdrawn-vs-suspended-clinical-trials`, and the relevant sponsor hubs only when the displayed evidence supports the link.

### Do not claim

Do not say that neurological trials fail more often than trials in other areas unless a comparable denominator and methodology are added. Do not treat the sponsor ranking as a success/failure ranking.

### Acceptance criteria

- The page's first analytical paragraph contains the live total and biological share.
- The three examples cover different stop mechanisms and have direct source links.
- The interpretation explicitly separates classification from causal proof.

## Page 4 — `/sponsor/pfizer`

### Editorial job

This page should answer what Pfizer's stopped-trial records reveal about program decisions, while preventing the common mistake of treating every Pfizer stop as a product failure.

### Proposed angle

**“A portfolio view: Pfizer's stop reasons separate strategy from biology.”** The distinctive value is the contrast between the large business/strategy group and the smaller, more directly biological signal groups.

### Data to surface

- 302 Pfizer records; 57 likely biological signals, or 18.9%.
- Outcome breakdown: 147 non-biological stops, 65 unresolved/review-required, 57 likely biological failures, 18 non-failure transitions, 10 cause-not-stated, and 5 mixed causes.
- Top resolved reasons: business/strategy 92, efficacy/futility 35, recruitment 27, safety 16, regulatory 14.
- Areas led by Oncology 91; phase mix led by Phase I 119 and Phase II 106.

### Experience to build

Use a portfolio “three lenses” presentation, not a generic sponsor table:

1. **Portfolio action:** NCT03530683 or NCT05261490, where the registry explicitly says business/administrative decision and not a safety concern.
2. **Efficacy/futility:** NCT03642132, where the source connects the stop to interim futility and the changing PARP-inhibitor landscape; show both scientific and competitive context without speculating beyond the record.
3. **Safety:** NCT05510245 or NCT05788328, where development of lotiglipron is linked to elevated transaminases and pharmacokinetic/laboratory findings.

Add a short “what this page cannot tell you” note: the page is about registry stop evidence, not a complete Pfizer pipeline history, financial performance, or an estimate of asset-level probability of success.

### Internal links

Link to `/sponsor-insights`, `/clinical-trial-futility`, `/overview`, and the relevant disease/phase pages only from the displayed evidence categories.

### Do not claim

Do not rank Pfizer's performance against other sponsors from raw stop counts. Do not say that a business decision means the asset was scientifically successful; say only that the cited registry explanation does not attribute that stop to safety or efficacy.

### Acceptance criteria

- The page visibly distinguishes 92 business/strategy records from 35 efficacy/futility and 16 safety records.
- Each lens has one source-linked NCT example and a one-sentence limitation.
- No sponsor-wide causal conclusion is drawn from aggregate stop counts.

## Page 5 — `/failures/phase-2`

### Editorial job

This is the largest analytical hub in the set. Its risk is becoming a huge list with little interpretation. The page should help readers understand why Phase II stop data is not equivalent to a single “Phase II failure rate.”

### Proposed angle

**“Phase II is where multiple risks meet.”** Explain the difference between biological readouts, recruitment/feasibility, portfolio decisions, and unresolved registry language within a large phase slice.

### Data to surface

- 10,861 records in the Phase II hub, including combined Phase I/II records as defined by the current page logic.
- 1,247 likely biological signals, or 11.5%.
- 6,371 non-biological stops, 1,570 unresolved/review-required, 987 cause-not-stated, 566 non-failure transitions, and 120 mixed causes.
- Top resolved reasons: recruitment 3,080, business/strategy 948, efficacy/futility 876, decision without stated cause 814, funding 783, supply/manufacturing 308.
- Area mix led by Oncology 4,804; phase display: Phase II 8,551 and combined Phase I 2,310.

### Experience to build

Build a “four reasons a Phase II record can stop” explainer around four evidence lanes:

- **Patient access:** recruitment and feasibility.
- **Scientific signal:** efficacy/futility and endpoint evidence.
- **Safety/regulation:** a smaller but consequential lane.
- **Program economics:** business, funding, supply, or portfolio decisions.

Use one carefully chosen example per lane. Current candidate records include NCT03367819 (insufficient interim result), NCT03875144 (serious adverse reactions), NCT05042934 (portfolio/accrual decision), and NCT01947140 (funding/recruitment context), but Sol must verify the current row and exact stop text before rendering them.

Then let the existing filters do the heavy work: add prominent links or controls for Oncology, Neurology, Efficacy/Futility, Safety, and Recruitment rather than adding a long static list of subtopics.

### Internal links

Link to `/clinical-trial-futility`, `/failures/neurology`, `/sponsor/pfizer`, `/overview`, and `/methods`. Use the oncology link because it is the largest area, but state that volume is not a failure rate.

### Do not claim

Do not calculate a Phase II probability of failure from these records. The dataset is a stopped-trial universe with incomplete and heterogeneous registry explanations, not a denominator of all Phase II starts.

### Acceptance criteria

- The page explains the inclusion of combined Phase I/II records in plain language.
- Four evidence lanes are distinct and each has an example or live filter path.
- The 11.5% biological share is labelled as a share of this stopped-record slice, not a clinical development success rate.

## Page 6 — `/terminated-vs-withdrawn-vs-suspended-clinical-trials`

### Editorial job

This reference page should resolve the status question directly: what do terminated, withdrawn, and suspended mean, and why is status alone not a failure diagnosis?

### Proposed angle

**“Status describes what happened to the study; the reason explains why.”** This page should be the site's clearest antidote to status-based overinterpretation.

### Data to surface

- Terminated: 16,379 total; 2,277 biological signals (13.9%).
- Withdrawn: 6,887 total; 110 biological signals (1.6%).
- Suspended: 602 total; 27 biological signals (4.5%).
- For all three statuses, show operational and other/unknown categories beside biological signals so the reader sees the contrast rather than only the biological counts.
- Keep the current bucket details: terminated has 9,628 operational and 1,551 efficacy/futility; withdrawn has 3,862 operational and 57 efficacy/futility; suspended has 305 operational and 9 efficacy/futility.

### Experience to build

Use a decision-tree or “read the status in two steps” structure:

1. **Step one — status:** terminated, withdrawn, or suspended describes the registry state.
2. **Step two — evidence:** inspect the stop language and classification to decide whether the signal is biological, operational, regulatory, or unresolved.

Use three contrasting records rather than three near-identical cards: NCT05256134 as a terminated biological signal, NCT05042934 as a withdrawn operational/portfolio decision, and NCT03875144 or NCT04322305 as a suspended safety/regulatory case. Explain that a suspended study may resume, while a withdrawn study may never have started or may have been stopped for practical reasons.

### Internal links

Link each status explanation to its corresponding filtered explorer view and to `/clinical-trial-futility`, `/overview`, and `/methods`.

### Do not claim

Do not use “terminated = failed,” “withdrawn = never started,” or “suspended = unsafe” as universal definitions. The page exists to correct those shortcuts.

### Acceptance criteria

- The three status totals and biological shares are server-rendered and date-stamped.
- The page contains a clear status-versus-reason explanation before the long reference tables.
- At least three source-linked examples demonstrate that identical statuses can have different meanings.

## Sol implementation handoff

Implement one page at a time and preserve the page's existing data component, URL, canonical, and indexability policy. Before merging each page:

1. Verify every displayed number against the current server-side data function.
2. Verify each example's NCT title, stop text, classification, and source URL against the current row.
3. Check that the new prose is materially different from the other five pages in both structure and wording.
4. Confirm that the core evidence is visible in raw HTML and does not depend on client-only loading.
5. Run the full SEO, type, style, test, and build checks only after all six pages are complete.

The expected outcome is not six longer pages. It is six clearer search answers with different editorial purposes, stronger evidence paths, and fewer unsupported generalizations.
