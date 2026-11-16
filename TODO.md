# What is next

Ordered by what stands between the site and its first paying customer. Everything above the line
in each section is blocked on nothing but time.

*Last reviewed 7 Nov 2026.*

---

## Where things stand

- **The weekly data run works.** The Cloudflare scheduler dispatches `update-data.yml` every Monday
  at 08:15 Europe/Berlin; every run since 1 Oct succeeded (last one 2 Nov). The
  database holds about 24,000 stopped trials.
- **The newsletter sends.** The first issue went out on **26 Oct 2026** ("100 new stopped trials,
  12 records changed") and is archived at `/newsletter` (`web/data/newsletter_issues/`). **The
  second issue, due 9 Nov, did not go out** — see 9. It goes out with the next weekly run
  (Monday 23 Nov, or a manual run before), carrying the four weeks since 26 Oct.
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

### 8. Clinicians: the 11 disputed validation texts, then a paid review offer

**Status (7 Nov):** Schayan knows clinicians who will do this; they are paid, and have time in a
few weeks. Nothing is booked in the repo yet.

**Why it matters:** a second model family (GPT-6.1) relabelled the 600 held-out texts on 7 Nov:
98.2 % agreement on biological yes/no, but biological-failure precision is 91.0 % against its
labels and 95.5 % against the Claude reference. Both figures are on `/validation`, with the 11
texts the gap rests on marked "Awaiting clinician review" (`docs/validation_crosscheck_gpt61.md`).
DEEPCISION (BasGenBio) has been told that clinician review of those cases is scheduled for the
coming weeks — so it has to happen.

**The sheet:** `clinician_review.csv` — 11 texts, options A/B in random order, columns for the
verdict and "biological failure? yes / no / cannot tell". The key
(`clinician_review_KEY_do_not_share.csv`) stays with Schayan until the verdicts are in. Neither
file is in the repo; both were sent to Schayan on 7 Nov. About half an hour of clinician time.

**When the verdicts come back:** record them in `validation/crosscheck_gpt61/decisions.json`
(format in the cross-check report), run `python scripts/crosscheck_heldout_v2.py` and
`python scripts/build_validation_public.py`, push. Then decide whether a rule changes — the likely
candidates are "possible lack of efficacy" and directionless "findings" being read as biological
(CLAUDE.md rules 1–4 apply: golden case first, corpus check, declared rule change).

**Before then, ask the clinicians two things:** their rate per hour, and how many stop reasons
they can judge per hour. That prices the paid offer DEEPCISION was given — clinician review of a
larger, defined subset as a separate project (clinician fee plus a margin).

### 9. The signals build failed on 9 and 16 Nov — fixed 16 Nov, check the next run

**What happened.** On 2 Nov one ChEMBL search ("Gemzar") answered HTTP 500 through every retry,
and that one failure discarded the whole ChEMBL step: the Oncology Failure Signals release shipped
with no ChEMBL asset and no target gene (`trials_with_focus_target_gene` 0.0 instead of ~0.54;
the 5 Oct release went the same way). The fix of 7 Nov (`9d59f02`) made each lookup fail on its
own — but named a counter `lookups`, the name of the RxNorm results in the same function. The
build then crashed on 9 and 16 Nov (`AttributeError: 'int' object has no attribute 'get'`). The
step is `continue-on-error`, so both runs showed green, and every step gated on it was skipped:
product summary and sample, briefs index, validation page data, cohort exports — and the
newsletter, which was due on 9 Nov.

**Fixed 16 Nov (`88f1455` and the commit after it):**
- the counter is renamed;
- `scripts/signals/smoke_build_signals.py` runs the real build offline with every source stubbed
  (including failing ChEMBL searches). It fails on the 7 Nov code with the same error. It now runs
  on every push and before each weekly build;
- the change reports of 9 and 16 Nov are in `data/newsletter_backlog/`; `newsletter.py` folds
  them in once, so the next issue covers 26 Oct to the run date with nothing lost or told twice.

**Check after the next run (23 Nov, or start one by hand: Actions → Update trial failure data):**
the "Build Oncology Failure Signals" step succeeded (its *outcome*, not the green tick);
`trials_with_focus_target_gene` is back near 0.5; the run log shows `chembl: OK` or `PARTIAL`;
the log of the Newsletter step says `backlog: folded ['2026-11-09', '2026-11-16']` and a mail
went out. Then `data/newsletter_backlog/` can be deleted.

**Still open:** a failing step that is `continue-on-error` is invisible — the run is green.
Worth a final step that fails the run (or mails the owner) when the signals step's outcome is
`failure`. And: fail the publish step when ChEMBL coverage drops far below the previous release.
Don't build a sample for a customer from the 2 Nov release.

### 10. Two more silent failures found on 16 Nov

**LAG-3 and LAG-3 + PD-(L)1 diligence packages were never built** (failing since at least 26 Oct;
the run on 16 Nov did not get that far). `interpretation()` in
`scripts/signals/build_evidence_package.py` called `len()` on the stop count when a cohort's stops
cannot be attributed — LAG-3 has one such stop. Fixed 16 Nov, with a test. Both briefs are on the
site, so ordering their report has been failing; check after the next run that
`web/data/private/evidence_packages.json` holds `oncology-lag-3` and `oncology-lag-3-pd-l-1`, and
order one on the live site.

**The independent language-model review of stop reasons has never run.** `ANTHROPIC_API_KEY` is
not set as a GitHub secret; every run since at least 1 Oct logs "nothing was sent", and
`data/llm_review/last_run.md` shows 0 stored readings. Nothing public claims it runs (the
DEEPCISION mail says "AI-assisted review", which is true of the earlier review). But **the sample
README sent to Schayan on 7 Nov says "Each week a language model reads every new or changed stop
reason" — remove that line before that sample goes to anyone.** To switch it on:
`docs/llm_review.md` (API key with a spend limit, secret `ANTHROPIC_API_KEY`; first full read
about $5).

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
