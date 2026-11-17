# What is next

Ordered by what stands between the site and its first paying customer. Everything above the line
in each section is blocked on nothing but time.

*Last reviewed 17 Nov 2026.*

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
- **Clinician review tool is ready** with 799 cases (see 8). Waiting for the clinicians.
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

**Status:** reply sent 7 Nov 2026. Waiting for their answer.

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
Takes effect in the next weekly run (the data files are reclassified there). The review tool's
guidance says the same. Still open: texts like "drug not available … no patients enrolled" or
"withdrawn … due to resources" become NOT_INITIATED because no rule reads that cause — better than
RECRUITMENT, not yet right.

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
   17 Nov), so the card can state a clinician-validated precision: the free sample only, a dataset card stating the validation honestly (two model
   families; clinician review under way), CC BY-NC, link to the commercial licence.
3. One indexable product page per dataset on the site (Dataset markup already exists on the home
   page, briefs, drug pages and the two-week updates; a page per dataset does not).
4. SEC filings as a new source.
5. Marketplaces once there is demand: Defined.ai first (AI training data), AWS Data Exchange and
   Snowflake only when buyers ask for delivery there. First customers come direct.

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

### 6. The memory fix (#101) has not been checked on the live site

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

### 8. Clinicians review the labels — tool ready, clinicians to invite

**Status (17 Nov):** the review tool is live and loaded; no clinician has started. Schayan knows
clinicians who will do this, paid, with time in a few weeks.

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

Batch 1 + 3 = every biological label in oncology in front of a clinician. About 3 h for 1–2 and
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
- Batch 1: compare with `qa/oncology-2026-11-labels`; precision and recall of the biological label
  in oncology, with intervals; a section on `/validation`; then the Hugging Face card.
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

**Still open:** fail the publish step when ChEMBL coverage drops far below the previous release.

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
