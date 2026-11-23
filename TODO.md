# What is next

Ordered by what stands between the site and its first paying customer. Everything above the line
in each section is blocked on nothing but time.

*Last reviewed 23 Nov 2026.*

---

## Where things stand

- **The weekly data run works again.** The Cloudflare scheduler dispatches `update-data.yml` every
  Monday at 08:15 Europe/Berlin. The runs of 9 and 16 Nov looked green but had skipped the product
  and the newsletter (see 9); the manual run of **16 Nov, 23:23 UTC, did everything**: signals
  build, 65 packages incl. LAG-3, target genes back (53.7 %), newsletter. A failed step now turns
  the run red. The database holds about 24,000 stopped trials.
- **The newsletter sends.** Issue 1 on 26 Oct ("100 new stopped trials, 12 records changed"),
  issue 2 on **16 Nov** ("106 new stopped trials, 11 records changed", 5 subscribers, the skipped
  weeks included). Archived at `/newsletter` (`web/data/newsletter_issues/`).
- **The first clinician finished the 150 oncology cases** (17–18 Nov): biological yes/no agrees
  on 148 of 150, precision of our biological label 98 % (95 % CI 93–99 %). Caveats and next steps
  in 8. The tool now holds 904 cases in four batches.
- **Classifier 2.7.7** (17–19 Nov; 2.7.7: a denial with an article, "not due to the lack of efficacy", is still a denial — 1 text changed): "nobody enrolled" is no longer a recruitment cause on its own
  (2.7.2, 371 trials); a partner pulling out is a support withdrawal (2.7.4, 2 trials); a changed
  standard of care is a design cause, not business (2.7.5, 58 trials); "no participants enrolled in a
  three year period" is recruitment (2.7.6, 1 trial). **In the data since the manual run of 18 Nov**
  (run 44269445298, all steps green, no newsletter: the 12-day spacing held): 24,095 trials, all on
  classifier 2.7.6.
- **SEC filings as a source** (22 Nov): 1,542 no-cause trials with an SEC-filing sponsor searched (832 by
  name, 710 via the new sponsor → CIK table), **101 with a passage** in the review tool (batches
  sec-evidence-2026-11 and -11b). Claude reviewed them (AI-assisted): **50 accepted and applied** per
  trial from the weekly run of 23 Nov (source `SEC_FILING_REVIEWED`; 34 → biological, 14 → non-biological,
  2 → programme action without cause), with the filing sentence on the trial page. See the SEC section below.
- **`/validation` has a clinician section** (18 Nov) with the caveats. The Hugging Face card is built
  by `python scripts/samples/build_label_sample.py --out <dir> --huggingface`. **Public since 19 Nov:** https://huggingface.co/datasets/clinical-trial-failures/clinical-trial-failures-sample
  (org `clinical-trial-failures`, owner account `ClinicalTrialFailures`; the write token is a network
  secret for huggingface.co on the Default cloud environment, fine-grained, write only in that org).
  Refresh it from a new release with the same command and upload_folder (see the 19 Nov session).
- **The diligence report is free during the beta, for a work email** (#94, 22 Oct). The order form
  also offers the newsletter (double opt-in). Leads land in the `LEADS` KV namespace and are
  mailed to `contact@clinicaltrialfailures.com`.
- **SEO recovery is under way:** stricter indexing, hub pages, drug pages (`/drug/<slug>`,
  `/drugs`), area comparisons, internal links, insight articles (BACE1, JAK/TYK2, FcRn, LAG-3,
  5-HT2A, airway alarmins). Plan and audits: `docs/seo/`.
- **First data-licence lead:** DEEPCISION (BasGenBio, Korea) asked on 7 Nov for labelled
  success/failure data for model training. Reply **sent 7 Nov**; waiting for their answer.
  Details under *Blocking revenue → The DEEPCISION lead*.
- **Citable:** Zenodo DOI 10.5281/zenodo.23558833; MIT for code, CC BY-NC 4.0 for derived data.

---

## Blocking revenue

### The DEEPCISION lead (BasGenBio)

**Who:** BasGenBio, Korean AI/biotech company. DEEPCISION predicts trial success from compound
structure, indication and target. Government AI grant (~$3.3M to 2027), a first paid US
distribution deal (Cambridge Scientific, June 2026), funding otherwise unclear. Small, serious,
price-sensitive — they asked about per-record pricing.

**What they asked:** validated success/failure labels from efficacy or safety outcomes (not
status alone), failure reasons, NCT IDs with evidence; how labels are made and whether
expert-validated labels exist; commercial training rights without restrictions on the models;
pricing; a sample and data dictionary.

**Status:** reply sent 7 Nov 2026, no answer yet. **Follow-up drafted 19 Nov** (Claude, in the session):
new since 7 Nov — clinician check of 150 oncology trials (101 of 103 biological labels confirmed), the
public sample on Hugging Face, classifier 2.7.7. Send around 21 Nov. **Updated 23 Nov** (in the session): adds
the 11 disputed cases decided by the clinician, 50 trials with a cause from the sponsor's SEC filing, the
free samples on /datasets, 24,124 trials.

**What the reply (sent 7 Nov) says:** two label types (stop reasons, 24,023 trials; posted endpoint
met/missed, ~5,200 assessable 2015–2024, ~1,960 missed); validation by two model families, 98.2 %
agreement, precision 91–95.5 %; not clinician-validated yet, clinician review of the borderline
cases "scheduled for the coming weeks" (see 8), larger clinician review offered as a separate
paid project; CC BY-NC → commercial licence for training, evaluation and deployment with no
restrictions on their models; one-time or annual licence, no price named; asks for their areas,
phases and format; offers a short call.

**Deliberately not said yet:** any price, and the drug/target linkage (keep for the call; check
coverage first — oncology ~86 % resolved drug, ~70 % with a target gene; ChEMBL fields are
CC BY-SA, see `docs/provenance_and_rights.md`).

**Price thinking (not sent):** pilot ~€2,500 for one or two areas, one dated release, credited if
they buy the full licence within three months; full one-time licence ~€5,000; weekly updates on
top; clinician review per trial at clinician cost plus margin. Discount by giving less, not by
halving the price.

**When they answer:**
1. Build the sample for their areas once a weekly run has rebuilt the signals release (see 9):
   `python scripts/samples/build_label_sample.py --out <dir> --area Oncology --phase 2 --phase 3
   --for DEEPCISION` writes both CSVs and a README with that release's numbers. A first generic
   sample went to Schayan on 7 Nov. Completed-trial endpoint labels exist only in the weekly run's
   cache, so a sample with them needs a workflow step that writes it as an artifact.
2. In a call: ask first (what they train, what "success" means to them, volume, current labels),
   then show one trial end to end, the sample and `/validation`.
3. Contract: commercial licence; settle the ChEMBL ShareAlike question before shipping any
   ChEMBL-derived field.

### 1. Taking money is switched off — on purpose, for the beta

The Stripe code is finished: `/api/order` mints the token first and sends the customer to a
Stripe Payment Link carrying it, `/api/stripe` verifies the signature and the timestamp and flips
`paid: true`, and a configured-but-unpaid grant opens nothing (tested). Since #94 the site says
"Free during the beta" everywhere the €99 price was shown (`REPORT_BETA = true` in
`web/lib/offer.ts`) and asks for a work email in exchange.

**When the beta ends:** decide on prices, then **Schayan, ~30 minutes, once:** Stripe account,
two Payment Links, one webhook endpoint at `https://clinicaltrialfailures.com/api/stripe` for
`checkout.session.completed`, the secrets `STRIPE_LINK_PACKAGE`, `STRIPE_LINK_ACCESS`,
`STRIPE_WEBHOOK_SECRET`; then set `REPORT_BETA = false` and deploy (the pages are static, so the
wording needs a deploy). Step by step: **docs/setup_checklist.md** (German) and **docs/payment.md**.

What the beta should produce before then: how many reports were ordered, from which kind of
company (`free_mail_domain` flags private addresses), and whether anyone came back. Read the
`LEADS` namespace before deciding on a price.

### 2. ~~The newsletter cannot send~~ — done

Brevo, `CF_API_TOKEN` and `BREVO_API_KEY` are set up; the first issue went out on 26 Oct.
Still worth doing once: subscribe a test address, confirm, receive an issue, and stop it from the
link in the mail — the stop path has not been exercised by a real subscriber yet as far as this
file knows.

---

## Classification change of 17 Nov: "nobody enrolled" (classifier 2.7.2)

Decided by Schayan: a stop reason that only says nobody enrolled is NOT_INITIATED (it restates the
WITHDRAWN status and names no cause); RECRUITMENT only when the text says enrolment was attempted
and failed; another named cause decides. 371 trials change on the current snapshot (276
RECRUITMENT → NOT_INITIATED, 43 UNKNOWN → NOT_INITIATED, ~50 RECRUITMENT → the named cause), one
MIXED → BIOLOGICAL_FAILURE (NCT05393999, ineffective against Omicron); nothing leaves the
biological class. Every changed text: `docs/classification_change_2026-11-17_zero_enrolment.md`.
Takes effect in the next weekly run (Monday 23 Nov, or a manual run before; the data files are
reclassified there) — after it, check that `data/all_stopped_trials.csv` shows `classification_version`
2.7.3 and the NOT_INITIATED count rose by about 320. (2.7.3, same day: in MIXED_CAUSES, "the sponsor
decided" is no longer listed as a secondary reason next to stated causes; 7 trials, outcomes
unchanged.) The review tool's guidance says the same. Still open: texts like "drug not available … no patients enrolled" or
"withdrawn … due to resources" become NOT_INITIATED because no rule reads that cause — better than
RECRUITMENT, not yet right.

## Classification changes of 18 Nov (classifier 2.7.4 and 2.7.5)

From clinician-review cases. **2.7.4:** "the industrial partner withdrew from the study",
"Calithera pulled out of this trial." → SUPPORT_WITHDRAWAL (2 trials). **2.7.5:** a new standard
of care, approval or treatment landscape that makes a study obsolete → PROTOCOL_FEASIBILITY, not
BUSINESS_STRATEGY; "the change stopped enrolment" → RECRUITMENT; a stated business reason stays
business (58 trials, no outcome changes; 13 reviewed-index entries whose specific reason was only
the old rule output updated). Owner decisions: NCT02121405 (DFS difference without direction) →
UNKNOWN, NCT05525286 ("benefit-risk reassessment") → BIOLOGICAL_UNSPECIFIED. Every changed text:
`docs/classification_change_2026-11-18_*.md` and `..._partner_pulled_out.md`. The denial in "not due to a change in
standard of care" is read since 2.7.7 (19 Nov).

## What makes the data hard to copy, and how to get it found (plan of 17 Nov)

The full stopped-trial dataset and the code are public (GitHub, Zenodo, the site; CC BY-NC for the
data). Anything built only from public sources can be downloaded or rebuilt. What cannot:

- **Clinicians' verdicts** from the review tool (`tools/clinician-review/`). The strongest moat.
  **Keep them out of the public repo and Zenodo**; deliver them only under licence. (The 11
  disputed validation texts are the exception: they are published for transparency.)
- **The weekly history** of what sponsors changed: nobody can produce it backwards.
- **Completed-trial endpoint labels and the drug–target linkage**: internal today; keep it so.

New sources worth adding: SEC 8-K filings and press releases (often the real stop reason where
the registry says "sponsor decision" — use the facts, not the text); the EU register (CTIS / EU
CTR); FDA complete response letters (published since 2025).

Getting found, in this order:
1. Clinicians start reviewing (moat and sales argument at once).
2. Hugging Face — **only once the 150-case oncology sample is clinician-reviewed** (decided
   17 Nov), so the card can state a clinician-validated precision: the free sample only, a dataset card stating the validation honestly (two Claude models, Opus and
   Sonnet, one model family; cross-checked by GPT-6.1; one clinician on 150 oncology cases), CC BY-NC, link to the commercial licence.
3. One indexable product page per dataset on the site (Dataset markup already exists on the home
   page, briefs, drug pages and the two-week updates; a page per dataset does not).
4. SEC filings as a new source.
5. Marketplaces once there is demand: Defined.ai first (AI training data), AWS Data Exchange and
   Snowflake only when buyers ask for delivery there. First customers come direct.

## Alerts (since 19 Nov)

Mails to contact@clinicaltrialfailures.com (Brevo, `scripts/ops/notify_owner.py`): a red weekly run
(which steps failed, link to the log; covers the coverage check and a failed newsletter); no
successful weekly run since Monday (`watchdog.yml`, Tuesday 05:17 UTC — catches a scheduler that did
not dispatch); a failed live site check (`live-site-check.yml`, Tuesday 05:41 UTC). Test mail sent
19 Nov from the watchdog (Run workflow → "Send a test mail").

## Batch 2 decided (19 Nov)

The clinician decided the 11 texts the two model references disputed: with the Claude reference on
7, with GPT-6.1 on 4 (`validation/crosscheck_gpt61/decisions.json`, shown on `/validation`). Two
verdicts contradict our own guidance; **Schayan decided 19 Nov to keep the guidance** (lot recall =
SUPPLY_MANUFACTURING, a possible result = UNKNOWN): "Removal of Adrénaline lots for
safety reasons" → SAFETY (guidance: a lot recall is SUPPLY_MANUFACTURING) and "possible lack of
efficacy" → EFFICACY_FUTILITY (guidance: a possible result is UNKNOWN). One clinician; HV-0002 was
discussed beforehand.

## SEC filings as a source for trials with no stated cause (started 22 Nov)

`scripts/sources/sec_stop_evidence.py` searches the sponsor's own SEC filings (8-K press releases,
10-Q, 10-K, 6-K, 20-F) for trials labelled CAUSE_NOT_STATED / UNRESOLVED whose lead sponsor is an SEC
registrant: a passage that names the drug tested, says it was stopped next to the name, and
identifies the trial (acronym, NCT ID) or indication. It proposes, never labels. A first probe showed
why: half the raw hits were about another trial, a programme, risk boilerplate or costs.
**First full run (22 Nov):** 832 trials searched, **67 with a passage** (≈ 2/3 look usable on a skim:
MERU/Rova-T, VX-210 after the DSMB, LIGHTHOUSE, andecaliximab, Pliant's ARDS trial, Sanofi's DCV exit).
They are batch **sec-evidence-2026-11** (priority 5) in the review tool: registry text, the filing
passage with link, step 0 "is the filing about this trial / the programme / another trial", then the
label. Batch rows in the tool are now clickable. Network: this repo's sessions run in the cloud
environment "oncology-trial-failures" (EDGAR and the live site allowed).

**Reviewed 22 Nov (Claude, AI-assisted):** 50 of 101 accepted → `data/sec_evidence_decisions.csv`
(30 efficacy/futility, 4 benefit–risk, 12 business, 2 recruitment, 2 programme action without cause; 20 about
this trial, 30 about the drug's programme); 51 not accepted (another trial, result without direction, no
reason). Details: `docs/sec_evidence_review_2026-11-22.md`. **Applied 22 Nov, in the data from the weekly run of
23 Nov** (`docs/classification_change_2026-11-22_sec_filings.md`: CAUSE_NOT_STATED → BIO 21, UNRESOLVED → BIO
13, CAUSE_NOT_STATED → NON_BIO 12, UNRESOLVED → NON_BIO 2, UNRESOLVED → CAUSE_NOT_STATED 2). **Checked 23 Nov**
(run 45129837484, green): 50 rows with source SEC_FILING_REVIEWED, 24,124 trials all on 2.7.7, the box live
on /trial/NCT03033511. The run still logged "No HF_TOKEN secret": the Hugging Face sample is not refreshed.

**How the review was set up:** Claude reviews all of them as an AI-assisted review,
labelled as such (like the earlier reviewed decisions, not a clinician verdict): for each, whether the
filing is about this trial, its programme or another trial, and the cause it states. Only clear cases
become decisions; anything unsure stays "not established" (CLAUDE.md rule 5). Schayan spot-checks about
ten. The two batches stay in the review tool for clinicians later.

**Next (Schayan's decision 22 Nov: points 1–2 first, then the mapping table):**
1. ~~Per-trial decisions~~ **done 22 Nov:** `data/sec_evidence_decisions.csv`, keyed by NCT ID, read by
   `reclassify_dataset_v2.py` ahead of the text rules (the text-keyed index would have relabelled all
   138 "sponsor decision" trials).
2. ~~Trial pages~~ **done 22 Nov:** "What the sponsor told investors" box with the quote, programme vs
   this trial, "reviewed with AI assistance" and the filing link (`scripts/web/build_sec_evidence.py`
   → `web/data/sec_evidence.json`, rebuilt weekly).
3. ~~A curated sponsor → CIK table~~ **done 22 Nov:** `data/sec_sponsor_map.csv`, 72 sponsor names →
   86 registrants checked on data.sec.gov (subsidiaries → parent; acquired companies → own CIK for their
   filing years + the buyer; renamed ones). 710 more no-cause trials searched, **34 with a passage**
   (lower yield: big groups report programmes, not trials), batch **sec-evidence-2026-11b** (priority 6).
   Not reachable through the SEC: Roche, Boehringer, Bayer, UCB, Eisai, Otsuka, Sun, Actelion.
4. ~~Weekly search~~ **done 23 Nov:** `--weekly` in the weekly run searches only trials not yet in the ledger
   `data/sec_searched.csv` (seeded with the 1,535 of 22 Nov), with a changed stop text, or whose window
   (270 days after the last update) is still open (recheck every 28 days). New passages →
   `data/sec_pending_review.json` + a mail "New SEC passages to review"; decisions go to
   `data/sec_evidence_decisions.csv` / `data/sec_evidence_rejected.csv`. How to review: `docs/sec_weekly.md`.
   First test 23 Nov: 7 trials due, no passage.
5. ~~Programme stops counted apart~~ **done:** evidence rule `sec.programme_filing` (30) vs `sec.trial_filing` (20).

## More sources like SEC (proposed 23 Nov, not started)

For the ~5,700 trials with no stated or an unresolved cause; ~1,535 have an SEC-registered sponsor, the
rest are academic or non-US industry. Each source only proposes; decisions are reviewed per trial like
SEC (`docs/sec_weekly.md`). Probe 100 trials first, as with SEC.
1. **Publications (Europe PMC / PubMed) by NCT ID:** the results paper of a stopped trial often says why
   ("closed early for futility"). Biggest gap it fills: academic trials, which the SEC never covers. Open
   API, linked by NCT ID. Needs the Europe PMC host in the environment.
2. **EU register (EudraCT / CTIS) by EudraCT number** (secondary ID on ClinicalTrials.gov): European
   industry trials (Roche, Bayer, Boehringer, UCB: not reachable via the SEC). Under the EU regulation an
   early termination is reported as affecting the benefit–risk balance (safety / lack of efficacy, Art. 38)
   or not (Art. 37), with reasons. Whether the public pages show the reason is not yet checked (the hosts
   are blocked here).
3. **Non-US company pipeline updates and press releases** (quarterly "removed from pipeline" tables):
   harder to search, no common API; after 1–2.
4. **ClinicalTrials.gov record history:** an earlier version sometimes had a different stop text or a
   "suspended" reason; same host as now, cheap to probe.

## Getting found: next steps (decided 19 Nov)

**Done 19 Nov:** the free sample on the site (`/samples/labels/`, rebuilt weekly) and the article
`/insights/clinical-trial-failures-dataset-download` (what is in the data, how it is checked, where to
download: site, Hugging Face, Zenodo, licence).

**Done 19 Nov:** `/datasets` (DataCatalog) and one page per dataset — `/datasets/stop-reason-labels`,
`/datasets/posted-endpoint-labels`, `/datasets/oncology-failure-signals` — each with schema.org `Dataset`
markup (distribution, license, coverage, variables, sameAs Hugging Face / Zenodo), free sample
downloads without a form, and a three-step funnel (sample for your scope by mail → licence →
newsletter). "Free data" is in the top bar. Figures from `web/data/dataset_facts.json`, rebuilt weekly.
Next: submit the sitemap in Search Console and check the pages in the Rich Results test after deploy.

1. ~~**Google Dataset Search, done properly:**~~ one indexable product page per dataset (stop-reason
   labels, endpoint labels, oncology failure signals, discontinuation rates), each with its own
   schema.org `Dataset` markup — name, description, `variableMeasured`, `temporalCoverage`,
   `spatialCoverage`, `distribution` (sample CSV, Hugging Face, Zenodo), `license`, `creator`,
   `isAccessibleForFree`, `sameAs` — listed in the sitemap and linked from `/pricing` and the home page.
   Then check with Google's Rich Results test and Search Console. Started 19 Nov: the home page's
   Dataset markup already points to Zenodo and Hugging Face (`sameAs`).
2. **Defined.ai:** apply for a data partnership (AI training-data marketplace) with the Hugging Face
   sample and `/validation` as evidence. Plan of 23 Nov: list only the stop-reason and endpoint labels
   (no ChEMBL fields: CC BY-SA), non-exclusive, a dated release (the weekly feed stays a direct sale), price
   not below the direct one. Claude drafts the listing, datasheet and rights statement; Schayan submits
   the partner form and signs.
3. **AWS Data Exchange / Snowflake Marketplace:** check only once a buyer asks for delivery there.

**Hugging Face (public since 19 Nov):** the card points to `/pricing`; the weekly run refreshes the
sample once Schayan adds the repository secret **HF_TOKEN** (GitHub → Settings → Secrets and
variables → Actions → New repository secret; a fine-grained token with write access to the
`clinical-trial-failures` organisation). Downloads are anonymous on Hugging Face and Zenodo; gating
was considered and left off (19 Nov) to keep reach.

## Product gaps that cost sales

### 3. Coverage is thin where it matters commercially

131 mechanism classes carry a signature; 42 of them can be sold. `KRAS` has 2 stops in 15 closed
trials, `CD19` 2 in 76 — real classes, real trials, too few stops to publish a rate on. Someone
evaluating a KRAS asset gets an honest answer and nothing to buy.

Two disease areas were added to find out whether the gap was coverage or the measure. It is the
measure. Endocrine & metabolic: 28 biological stops in 1,637 closed trials. Gastro & hepatology:
63 in 1,643, and exactly one class — PPAR (liver) — with enough spread across sponsors to publish
a rate on. **The MASH graveyard is in the data and correctly classified** — elafibranor, the two
selonsertib Phase 3s, cenicriviroc AURORA, cilofexor in PSC are all read as efficacy/futility
stops — but each mechanism is one or two programmes, and two trials of one drug is one
experiment, not a rate.

Three ways out, in order of how much they are worth:

- ~~**Read the completed trials that missed.**~~ **Built.** `endpoint_outcomes.py` reads the
  sponsor's own posted primary superiority comparison: 15,788 trials with posted outcomes in
  2015–2024, **1,500 with every primary comparison non-significant**. It roughly doubles the
  failure evidence (478 documented misses against 586 biological stops in the five curated areas)
  and it lands where it was missing: TIGIT 6 misses of 9 read against 3 stops, FXR 2 of 5 with
  none met, PD-(L)1 62 misses beside its 97 stops. It also settles the metabolic question in the
  other direction — GLP-1/GIP: 81 of 86 posted comparisons **met** their endpoint. There is
  nothing to sell there because the drugs work, not because we cannot see them.
  The briefs carry it as a second number since 27 Sep. **Reader v2 (28 Sep):** the sponsor's own
  threshold where it wrote one, the sponsor's own "did not meet its primary endpoint" sentence,
  the older "superiority or other" analyses, 95% intervals where no p was posted; non-inferiority
  trials, adverse-event outcomes and Bayesian analyses out. Completed and readable 3,866 → 5,208,
  missed 1,556 → 1,963, and ~140 v1 misses withdrawn as wrong. Every verdict now ships with what
  it was read from (packages, and a "Posted results" panel on 625 stopped-trial pages), plus a
  per-cohort count of completed trials that posted nothing at all.
  Next, if wanted: PubMed abstracts for trials with no posted results (same rule — only the
  paper's own sentence about this trial, matched by NCT ID).
- ~~**Classes that fail at the end.**~~ **Built (28 Sep).** A class also earns a brief and a
  package with ≥4 completed trials that missed, from ≥3 sponsors, and leads with them. New areas:
  psychiatry (5-HT2A, D2/D3, monoamine reuptake, kappa opioid) and respiratory (IL-13, IL-5, the
  alarmins); plus LAG-3 in oncology. Nine more briefs and packages on local data; the weekly run
  sets the final count. Stricter than it could be on purpose: FcRn, FGF21, CTLA-4/CD28, NMDA and
  CRTH2 have three misses each, or four from one sponsor, and wait for more evidence.
- **Widen the window.** The cohorts are Phase 2/3, 2015–2024. Phase 1 and pre-2015 would roughly
  double the closed count in the young classes. It weakens comparability across eras, so it needs
  saying plainly rather than quietly.
- **Sell a cohort built around an asset rather than a class** — one molecule, its target, any
  phase. That is the thing buyers actually ask for, and the machinery already resolves it.

### 4. ~~Two classes are missing from the ontology entirely~~ — done, and it was bigger than that

`EZH2` is in the oncology lexicon and now carries a brief and a package (3 stops in 14 closed
trials, three programmes). `GLP-1` needed a whole disease area: **Endocrine & Metabolic**, 22
classes, 4,520 Phase 2/3 trials, built from the targets that actually appear in them.

The area's own finding is that it has almost none: 28 biological stops in 1,637 closed trials,
1.7% against oncology's 4.3%. Metabolic programmes fail at the endpoint of a completed trial, and
that is invisible to this measure. So the coverage is real and there is nothing to sell there yet
— no brief passed the catalogue's thresholds, which is correct.

Gastro & hepatology followed, 16 classes — FXR, FGF21, ASK1, PPAR (liver), CCR2/5, bile acid
transport, the HCV antivirals, proton pumps. Obeticholic acid, selonsertib, cenicriviroc,
elafibranor and lanifibranor all resolve and get an answer now. One of the 16 is sellable.

Finding it turned up a real defect: **a Phase 3 FXR trial stopped for futility was filed under
"Other"**, because "primary sclerosing cholangitis" contains none of the words the disease-area
taxonomy looked for. 2,007 trials were mistagged the same way. The taxonomy now knows biliary,
cholestatic, oesophageal and colorectal language, and `fetch_universe.py` re-derives the areas on
every assembly pass instead of trusting a year slice that was cached before the fix.

### 5. No package covers a combination the buyer actually has

Eleven combination cohorts exist (`TGF-β + PD-(L)1` and so on) and they were chosen by us. A buyer
with a doublet not on that list gets the two single-agent cohorts and has to read across them.

---

## Things that are true but unproven

### 6. ~~The memory fix (#101) has not been checked on the live site~~ — confirmed 19 Nov

**Checked 19 Nov** with the new manual workflow *Live site check* (`.github/workflows/live-site-check.yml`,
run from GitHub because this session cannot reach the site): `/`, `/overview`, `/pricing`, `/drugs` answer
`x-opennext-cache: HIT` in 0.1–0.7 s; an unknown trial ID answers 404 in 0.1 s; `/sitemap.xml` lists
**1,768** URLs (2,042 expected before the stricter indexing policy — check that the drop is the policy,
not lost pages). Still to look at once: Workers metrics for "Exceeded Memory" since 1 Nov.

Original note:

Cloudflare logged 515 "Exceeded Memory" errors in the week to 25 Oct and Search Console saw
server failures around 19/20 Oct: the sitemap, every prerendered page and unknown trial IDs loaded
the whole 36 MB index in the Worker. #101 (merged 1 Nov) precomputes the sitemap, serves
prerendered pages from static assets and stops loading the index for unknown IDs. CI builds the
Cloudflare bundle, but nothing in CI runs it.

**Check now that it is deployed:** `/` and `/overview` answer with `x-opennext-cache: HIT`
(not `x-nextjs-cache: MISS`), `/sitemap.xml` still lists ~2,042 URLs, and the Workers metrics
show no more "Exceeded Memory". If the deploy runs plain `wrangler deploy` without OpenNext's cache
population, pages still render per request — no regression, but no gain.

The bundle-size worry from earlier is settled in practice: the Worker deploys. The private data
is still checked against a 2 MB budget by `scripts/web/check_private_data.py` on every build.

### 7. The delivery path has never run against a real KV binding

`/api/order`, `/api/library` and `/api/report` are covered by unit tests on the logic that decides
what a token opens, but the KV reads and writes have only ever run in production shape once —
never end to end.

**This already cost something.** `report.ts` was not calling that logic at all: it compared the
grant's single-cohort field against the slug, and an order writes a list, so it would have
answered 403 to the first person who ever paid — and, once Stripe was connected, would have
handed the document to an unpaid one. Fixed, with a test that reads the routes as text. The rest
of this section is the same risk still unexercised.

Worth doing: order a report on the live site with the beta form (work email, newsletter box
ticked), open the link, check the document, confirm the newsletter, and stop it from the link in
the mail.

### 8. Clinicians review the labels — batch 1 done by the first clinician

**Status (18 Nov):** "Clinician 1" (clinician scientist) answered all 150 cases of batch 1 between
17 Nov 09:07 and 18 Nov 08:15 UTC, plus one of batch 2 (HV-0002).

**Result of batch 1** (full analysis, per case: owner-only `qa/oncology-2026-11-review1` in the
page's database, not in this repo):
- Biological yes/no: **148 of 150** agree with classifier 2.7.5; outcome (6 classes) 138 of 150;
  outcome and main reason 134 of 150.
- Precision of the biological label: **98 of 100 (95 % CI 93–99 %)**. Of the 47 texts we label
  non-biological, the clinician called none biological (with 47 cases, up to ~8 % missed is still
  compatible).
- The two biological disagreements: NCT02121405 (clinician right; fixed by owner decision) and the
  two-stage "no evidence of promise" text (our label kept, golden case).
- Where the clinician departed from the guidance: "Sponsor decision" → business (2×), a named low-
  accrual cause → Never started (3×), the sponsor as a second cause (1×). Guidance sharpened 18 Nov.

**Caveats — state them wherever the number is used:**
- **One reviewer**, not two independent ones yet.
- **24 of the 150 texts were discussed with Claude** (Schayan relayed questions, 17–18 Nov) before
  they were answered. Without them: biological yes/no 125 of 126, outcome 92 %. From now on the
  clinician's questions should not go through Claude, or those cases are marked.
- **Fast pass:** median 9 s per case, 81 cases under 10 s, one comment. Batch 1 has no attention
  checks. Do not sell it as a careful case-by-case clinical review.
- **The answers are saved under Schayan's own account** (`u_nId1d2LEf8FUeZOntz3oKA`): the clinician
  used Schayan's login. A second clinician on the same login overwrites them. Every clinician needs
  an own claude.ai account, invited as Editor.

**Found and fixed while checking:** `build_batch.py` split secondary reasons on "|" but the data
joins them with "; ", so MIXED texts with a biological cause were treated as non-biological and
left out of batch 3. Batch 4 (105 cases) closes the gap.

**Guidance in the tool** ("How to judge a case", refined 16–17 Nov from Schayan's own trial run and
questions): judge only what the text states; a negated cause does not count; a possible result is
Unclear; futility tied only to slow enrolment is Recruitment; a recall of product lots is
Supply / manufacturing; "nobody enrolled" with nothing else is Never started, Recruitment only
when an attempt failed; **the sponsor is who decided, not a cause** — a sponsor's business,
portfolio or development reason is "Sponsor's business / strategy decision", "sponsor decision"
alone is "Decision without a stated cause", and "Partner or funder withdrew support" is for
someone other than the sponsor pulling out. Answers record the guideline version they were given
under.

**Next for Schayan:**
1. Invite each clinician on the page's Share menu, by email, as **Editor** (outside reviewers can
   only save as Editor; they need a free claude.ai account). Two clinicians, independently.
2. Ask each for their rate per hour and how many stop reasons they judge per hour — that prices
   the paid clinician review offered to DEEPCISION.

**The tool:** https://claude.ai/artifact/DRTJvGrrYc7pSi6W8XFjk9 (bookmark it; opens in any browser
signed in to claude.ai, also with Claude closed; listed at claude.ai/code/artifacts). One case at a
time, every answer saved as given, work in any number of sittings, reviewers do not see each
other; the owner sees everyone's progress. Source, data layout and how to add batches:
`tools/clinician-review/README.md`.

| Order | Batch | Cases | Mode | Purpose |
| ---: | --- | ---: | --- | --- |
| 1 | Oncology | 150 | blind | 100 we label biological + 50 others: clinician-validated precision and recall. **Hugging Face waits for this.** |
| 2 | Validation: disputed cases | 11 | blind | The texts where the Claude and GPT references disagree; promised to DEEPCISION. |
| 3 | Oncology: every failure label | 638 | confirm | Every other oncology trial we label biological, all phases. Our label is shown; Correct (Y) / Not correct (N). |
| 4 | Oncology: several causes incl. biological | 105 | confirm | Added 18 Nov: the 95 MIXED texts the separator bug left out of batch 3, plus 10 texts biological since 2.7.2–2.7.5. Labels shown are 2.7.5 with the reviewed index; 5 attention checks. |

Batch 1 + 3 + 4 = every biological label in oncology in front of a clinician. About 3 h for 1–2 and
5–6 h for 3, per clinician. In batch 3, 32 cases (~1 in 20) show a deliberately wrong label as an
attention check; reviewers are told. Which ones, and our labels at draw time for batches 1 and 3,
are in the page's owner-only `qa/` documents, not in this repo (old versions of the batch files in
git history still hold the labels; not worth rewriting history for).

**Why batch 2 matters:** GPT-6.1 relabelled the 600 held-out texts on 7 Nov: 98.2 % agreement on
biological yes/no, but biological-failure precision is 91.0 % against its labels and 95.5 %
against the Claude reference. Both are on `/validation`, with the 11 texts the gap rests on marked
"Awaiting clinician review" (`docs/validation_crosscheck_gpt61.md`). Schayan's own test run
(16 Nov, answers deleted) agreed with Claude on 6 of 11 and with GPT on 5: these are hard cases.

**When answers come in (Claude reads them with ArtifactData):**
- Batch 2: record the verdicts in `validation/crosscheck_gpt61/decisions.json`, run
  `python scripts/crosscheck_heldout_v2.py` and `python scripts/build_validation_public.py`, push.
- Batch 1: ~~compare with `qa/oncology-2026-11-labels`~~ done 18 Nov (above). Next: a section on
  `/validation` with the caveats; then the Hugging Face card.
- Batch 3: list every corrected label; check the attention checks first (a reviewer who confirms
  them is not reading). Corrections become reviewed decisions.
- Then decide which rules change — likely "possible lack of efficacy" and directionless "findings"
  read as biological. CLAUDE.md rules 1–4 apply (golden case first, corpus check, declared change).
- **Clinicians' verdicts stay out of the public repo and Zenodo** (only the 11 validation texts are
  published); they are the part of the data nobody can copy.

The old CSV sheet for the 11 cases (`clinician_review.csv` + key, sent to Schayan on 7 Nov) is
superseded by the tool.

### 9. ~~The signals build failed on 9 and 16 Nov~~ — fixed and confirmed 16 Nov

On 2 Nov one ChEMBL search answered HTTP 500 and the whole ChEMBL step was discarded (no target
genes in the release). The fix of 7 Nov (`9d59f02`) reused the name `lookups` and crashed the build
on 9 and 16 Nov; the step is continue-on-error, so the runs looked green while the product and the
newsletter were skipped. Then the first manual run's product commit was rejected because `main`
had moved during the run.

Fixed 16 Nov: the name clash (`88f1455`), a smoke test of the whole build with stubbed sources on
every push and before each weekly build, the skipped weeks folded into the newsletter
(`data/newsletter_backlog/`, removed 17 Nov after use), a last step that turns the run red when a
step failed quietly, and a pull before each data commit (`ddae778`). **Confirmed by the manual run
of 16 Nov 23:23 UTC:** `chembl: PARTIAL` (13 of 542 failed, each on its own), target genes on
53.7 % of trials, 65 packages, newsletter sent with both backlog weeks.

~~**Still open:** fail the publish step when ChEMBL coverage drops far below the previous release.~~
**Done 19 Nov:** `scripts/signals/check_coverage_regression.py` runs before the product commit and
stops it when target-gene coverage or molecule resolution falls more than 10 points (PubMed 15),
or unique assets / trials more than 20 / 10 %, against last week's committed summary.

### 10. Two more silent failures found on 16 Nov

**LAG-3 and LAG-3 + PD-(L)1 diligence packages were never built** (failing since at least 26 Oct;
the run on 16 Nov did not get that far). `interpretation()` in
`scripts/signals/build_evidence_package.py` called `len()` on the stop count when a cohort's stops
cannot be attributed — LAG-3 has one such stop. Fixed 16 Nov, with a test; **both packages built in
the run of 16 Nov.** Still to do: order the LAG-3 report once on the live site (work email), open
the link, and stop the newsletter from the link in the mail — the delivery path end to end (7).

**The independent language-model review of stop reasons has never run.** `ANTHROPIC_API_KEY` is
not set as a GitHub secret; every run since at least 1 Oct logs "nothing was sent", and
`data/llm_review/last_run.md` shows 0 stored readings. Nothing public claims it runs (the
DEEPCISION mail says "AI-assisted review", which is true of the earlier review). But **the sample
README sent to Schayan on 7 Nov says "Each week a language model reads every new or changed stop
reason" — remove that line before that sample goes to anyone.** To switch it on:
`docs/llm_review.md` (API key with a spend limit, secret `ANTHROPIC_API_KEY`; first full read
about $5). Schayan decided on 16 Nov not to switch it on for now.

### 11. Open pull requests

- **#102 Research: can a model predict which trials fail?** Feasibility only, nothing on the site
  changes. Result: against the baseline, a model does *not* predict missed endpoints (AUC 0.683
  vs 0.707), but does predict biological stops among closed trials (0.639 vs 0.555). Decide
  whether to merge the write-up and whether the third task is worth a product.
- **Stale since August/September:** #72 (benchmarks), #61 (reviewed-index guard, drop Vercel
  config), #41 (Cloudflare compat), #36, #37, #2 (temporary audit extractions). Close them or
  take out what is still useful.

---

## Smaller, once the above is done

- **The evidence package has no PDF of its own.** It prints cleanly to A4 — verified — but a
  buyer who wants a file has to use the browser's print dialogue.
- **The watchlist is shelved, not deleted** (`web/shelved/`). It is a per-subscriber alert and it
  works. Worth restoring once there is a list worth segmenting.
- **`LRRK2` does not resolve** — ChEMBL carries no mechanism for it, so it is dropped from the
  molecule index. One of 51 test queries.
- **A stray `ctf_mirror.tgz`** sits in `~/Projects/Claude outputs/` from screenshot runs. I cannot
  delete files in your folders.

---

## Deliberately not doing

- **Lifetime access.** A one-off payment for something rebuilt every week is a liability, and a
  data business is worth a multiple of what recurs.
- **Accounts and passwords.** The token in the URL is exactly as strong as the mailbox it was sent
  to, which is what a password reset reduces to anyway.
- **The cohort CSV.** Built, then removed: it was my guess at what a buyer wants, and it cost a
  megabyte in the Worker. The distinction it uncovered — withdrawn and abandoned registrations are
  not running trials — was kept.
