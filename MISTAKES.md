# Mistakes

Every defect below was in code that ran, or in words that were live on the site. They are written
down because the pattern matters more than the individual bug: most of them are the same mistake
wearing different clothes, and the last column is what now stops each one recurring.

Ordered by what they cost, not by when they happened.

---

## 1. The product promised things it did not deliver

Three times, in the same shape: copy written for a product, then the product built to a smaller
scope, and the copy left standing.

| The claim | The reality | Found by |
| --- | --- | --- |
| "Tell us the asset you are evaluating and we will say which of these failures share its target and modality" — on the order form | The field was stored and ignored. Everyone got the same prebuilt document. | Schayan asking where the comparison was |
| "The full list is in the CSV" — inside the paid document | No CSV was ever generated or delivered. | Reading the document I had built, line by line |
| "All 83 trials the rate was computed from" — on the package card | The document listed 43 of them. Both numbers were true of *something*; the sentence attached the wrong one to the listing. | Schayan: "all 4 trials and 4 trials that stopped does not make sense" |

**Why it kept happening.** I wrote the description of a feature at the moment it was most
persuasive — while designing it — and then built a narrower version without going back. Nothing in
the build could tell that a sentence had stopped being true.

**What stops it.** Numbers in the copy are now computed from the same data the product ships:
`brief_lists_stops`, `listed_open`, `listed_unreadable` come out of the builder, so a claim about
how much is listed cannot drift from how much is listed. Where a claim cannot be computed, a test
asserts it — `the free check reports counts, never the names it is selling` fails if a molecule
name or an NCT id ever appears in the free response.

---

## 2. The route that hands over what somebody paid for never asked who they were

`grants.ts` exists because three routes ask the same question, and a paid boundary decided in
three places has three answers. `report.ts` imported it — `grantCovers`, right there at the top of
the file — and then asked its own question instead: does the grant's single-cohort field equal
this slug?

An order from the site writes a **list** of cohorts and never that field. So the one route that
delivers the document answered **403 to every self-serve buyer**, and would have done it to the
first person who ever paid. It also never checked whether the grant was paid at all, so once
Stripe was connected the document was reachable without paying — by guessing nothing, just by
using the URL the library had already built.

Neither showed up. The unit tests test `grants.ts`, which was right. The route was never run
against a real KV binding, which `TODO.md` said out loud and I read as a note about infrastructure
rather than as a list of the code nobody had executed.

**What stops it.** The route calls `grantedSlugs()` and `isUnlocked()` and decides nothing itself,
and a test reads `report.ts` and `library.ts` as text: it fails if either stops calling the module
or starts comparing the grant's fields on its own. The one place a shape can drift from the check
that reads it is now checked against the shape an order actually writes, field for field.

---

## 3. Selling something the buyer already had for free

The BACE / γ-secretase cohort has four trials. All four are closed and all four stopped, so the
free brief lists every one of them. The package for that cohort was offered at €100 — the same
four trials, with a price on them.

**Why.** Packages were generated for every brief, with no check that a package still had anything
to add once the brief had been read.

**What stops it.** `trialsBeyondTheBrief()` — closed-without-stopping plus still-running. Where it
is zero the cohort is not sold, is left out of the catalogue, and the page says why.

---

## 4. Two vocabularies for the same thing, compared directly

The cohorts record modality as `ADC`, `Cell therapy`, `Gene therapy`. ChEMBL says
`Antibody drug conjugate`, `Cell`, `Gene`. The comparison read them as different values, so an ADC
under review could never match an ADC that had failed.

Silent, and in the direction that understates the risk to the buyer — the worst kind.

**What stops it.** Both sides go through `modality()` in `scripts/universe/resolve.py`, the same
mapping the cohorts were built with, and a test names the three cases.

---

## 5. A tool that answered one question and was asked another

The asset check resolved molecules perfectly — 21 of 21, including research codes and brand names
— and failed on every single target, gene, short name and mechanism class. Nineteen of nineteen.
`EGFR`, `PD-L1`, `HER2`, `amyloid`: nothing.

Then, after that was fixed, the same mistake one level up: the comparison ran against the
*packages*, packages came from *briefs*, and a brief is only published where enough trials have
closed to put a rate on them. So a CD19 developer — 355 CD19 trials and 26 terminations in the
dataset — was told nothing in our data looked like their asset.

**Why.** Both times I built what the data made easy rather than what the question needed, and
tested that it worked rather than measuring what fraction of real questions it answered.

**What stops it.** `web/tests/fixtures/asset_queries.json` is a list of what a visitor plausibly
types — 64 entries across molecules, codes, genes, short names, protein names, classes and
modalities — and a test that every one of them resolves. Coverage is a number now, not an
impression.

---

## 6. Counting things that were not what they were called

"Still open" meant every trial that had not closed. In the EGFR cohort that swept up 41 withdrawn
registrations that never enrolled a patient and 296 whose sponsor stopped updating the registry
years ago — turning 363 trials that could still report into 659.

How much of a cohort is still to come is precisely what a reader consults that list for.

**What stops it.** `withdrawn_never_enrolled` and `status_not_updated` are their own categories,
and the document says how many of its open trials have gone quiet.

---

## 7. A word list deciding what the database can see

The disease-area taxonomy is a list of substrings. "Primary sclerosing cholangitis" contains none
of *gastro, hepat, liver, cirrhos, colitis, bowel*, so a Phase 3 trial stopped on a DMC futility
recommendation — correctly fetched, correctly classified as an efficacy failure — was filed under
"Other" and belonged to no cohort. It was the only biological stop the FXR class had. The class
read 0 of 23 closed trials, and would have been published that way. **2,007 trials were mistagged
the same way.**

Two things made it invisible. The list looked complete because everything it *did* match came out
right, and a trial in "Other" produces no error — it simply never appears in an answer. The
cheapest possible bug to ship and the hardest to notice.

**What stops it.** The taxonomy now covers biliary, cholestatic, oesophageal and colorectal
language, but a word list will always be incomplete — so the mechanism is elsewhere:
`fetch_universe.py` re-derives every record's areas on each assembly pass instead of trusting the
tag a cached year slice was written with. Slices are cached for six days, so before this a fix
reached the older years only whenever they next happened to be re-fetched. Now a taxonomy change
takes effect everywhere on the next run, which is the only way a fix to a list like this can be
trusted.


**And the list of areas did the same thing one level up.** Gastroenterology & hepatology was added
to the lexicon, and `CURATED_AREAS` was introduced precisely so that no script would list the
areas by hand again — but the weekly workflow still did, in a shell loop naming three areas. The
next scheduled run rebuilt everything from that loop: the hepatology brief and its one sellable
package (PPAR, liver) disappeared from the live site, with no error anywhere. The loop now reads
`CURATED_AREAS` like everything else; there is no file left that names the areas.
---

## 8. Styles that silently never applied

21 CSS rules in `<style jsx>` sat on `<Link>` elements. styled-jsx adds its scope class only to
native elements, so `.cls.jsx-HASH` never matched anything. No error, no warning, a build that
passed — and a page that looked unfinished. Schayan said the design looked unprofessional and was
right; the cause was code.

**What stops it.** `scripts/web/check_styled_jsx.py`, in CI. It has caught four more since.

---

## 9. Shipping the analysis without the picture

A discontinuation analysis went out with no curve — five numbers in a table standing in for a
shape, in a document sold as evidence. The shape is the first thing a reader checks.

**What stops it.** Nothing automated. It is a judgement I got wrong by not printing the thing and
looking at it, which is now a step rather than an afterthought.

---

## 10. Print CSS written from memory

`break-inside: avoid` on `table` pushed a twenty-row table to the next page and left the current
one blank under its own heading. The rule belongs on rows.

**What stops it.** The PDF gets rendered and read before anything ships. That is how this was
found, one page after it was introduced.

---

## 11. A paying customer's page waiting on a flag it did not need

`/access` waited for `router.isReady` before reading its own token. Anything that stops that flag
— a stale manifest, a cached shell — turns everything somebody bought into a spinner that never
resolves, with no way for them to tell that their link was fine.

**What stops it.** It reads the address bar too, and only waits when there is no token in either
place. Found by mirroring the built page and opening it.


**It came back.** The confirmation page for the newsletter was written from the same template and
inherited the same gate, and this time there was no second route at all: a subscriber who cannot
confirm is not on the list and has no way to know the page, not the link, is at fault. Both mail
pages now read the key through `lib/linkKey.ts`, which takes it from the address bar, uses the
router when it arrives, and concludes "there is none" only once one of them has answered.
---

## 12. Weakening a check instead of the thing it checked

Twice I hit a failing check and reached for the check first: adding `:global()` to silence
styled-jsx, and adding test directories to the private-data allowlist. The second was correct —
`tests/` is never bundled. The first was not: the rule was telling me the markup was wrong.

**What stops it.** Asking what the check is protecting before touching it. No tooling for this
one; it is a habit.

---

## What I would tell myself at the start

1. **Write the claim from the data, not the data from the claim.** Every number in the copy should
   come out of the builder.
2. **Measure coverage, do not demonstrate it.** "It works for osimertinib" is not a statement about
   a tool. "50 of 51 plausible queries resolve" is.
3. **Print it and look at it.** Three defects here would have survived every test and died on first
   sight.
4. **A silent failure in the customer's favour is still a failure**, and the ones that understate
   risk are the expensive kind.
5. **When a check fails, it is usually right.**
