# Provenance and rights register

Issue-spotting for our own operations, not legal advice, and not legal clearance. Where a
right is uncertain the rule here is to narrow what we redistribute rather than to argue the
point in a footnote. A material unresolved question goes to a qualified lawyer before the
affected field ships in a paid export.

This register is about the **actual deliverable**: what leaves this system in a CSV, a JSON
file, a brief or a web page. Storing something internally and redistributing it are different
acts and are recorded separately below.

## What each source contributes, and what we do with it

| Source | Licence / status as published by the source | What we copy into the deliverable | What we do **not** redistribute |
| --- | --- | --- | --- |
| ClinicalTrials.gov (NLM) | US government registry data; the site's terms govern. Public accessibility is not the same question as public-domain status, and the government-works exclusion covers government works, not everything submitted to a government site. | Registry fields as filed: NCT ID, title, status, `why_stopped` text, phase, dates, sponsor, conditions, interventions, enrolment. | Attached protocols, statistical analysis plans, results documents and any sponsor-authored exhibit. We link to the record instead. |
| ChEMBL (EMBL-EBI) | CC BY-SA 3.0 Unported. Commercial use is permitted; the ShareAlike condition follows any adaptation we distribute. Note that 3.0 Unported does not expressly licence sui generis database rights, unlike 4.0. | In the licensed signals product: ChEMBL molecule ID, preferred name, molecule type, max phase, mechanism strings, target IDs, target names and target genes, for the drugs in a trial's experimental arm. **In the public dataset, the samples and the marketplace packages: nothing (decided 24 Nov 2026, replacing the 23 Nov decision to ship ChEMBL's standard names).** ShareAlike does not fit a CC BY-NC dataset or a commercial licence, and 3.0 does not settle database rights, so ChEMBL is used only inside the resolver to recognise a drug; the name written is the NCI Thesaurus preferred name or the RxNorm ingredient, and a drug neither names is written as the registry lists it and counted unresolved (`scripts/universe/export_trial_drugs.py`; a test fails if a ChEMBL name or ID reaches the export). The licensed signals product still carries ChEMBL fields: deliver them with ChEMBL's attribution and CC BY-SA terms for those fields, and settle that with a lawyer before the first paid signals delivery. | Bulk re-publication of ChEMBL tables. Our exports carry per-trial rows, not a redistributable copy of the source database. |
| NCI Thesaurus (NCI) | CC BY 4.0, with a separate trademark position on the NCI Thesaurus name itself. | Concept codes and preferred terms: the drug names and `drug_ncit_codes` in the public dataset and packages. | Any presentation that implies our terminology is an NCI-issued thesaurus. Attribution is carried; the name is not used as a badge. |
| RxNorm / RxClass (NLM) | US government terminology. | Normalised drug names and class assignments used during resolution; ingredient names and RxCUIs (`drug_rxcuis`) for drugs the NCI Thesaurus does not name. | Redistribution of the source files. |
| PubMed / NCBI (NLM) | Indexing is public; **publishers or authors may retain copyright in the abstracts**. | Counts and identifiers only — `publication_count` and PMIDs. | Abstract text, title text beyond a bibliographic reference, and any full text. This is a deliberate product decision: no abstract text has ever been in an export, and none should be added. |
| SEC EDGAR | US government filing system; filings themselves are company-authored. The SEC states that "EDGAR public filing content" is "free to access and reuse" (sec.gov Webmaster FAQ, checked 23 Nov 2026). | Issuer identity and ticker, matched to a sponsor. For a label taken from a reviewed filing (`label_basis` `sec_filing`): the one sentence it rests on, quoted with form, filing date and a link to the filing. | Whole filings or exhibits, and any passage beyond the sentence a label rests on. |
| Our own work | Ours | Classification labels and evidence spans from registry text, mechanism-class definitions, cohort rules, rates, intervals, cumulative-incidence estimates, concentration statistics and written interpretation. | — |

## Rules this register imposes on the pipeline

1. **No source text beyond the evidence a label rests on appears in an export.** Registry
   `why_stopped` text is quoted verbatim because it is the evidence the classification rests
   on and the customer has to be able to check it. The same holds for the one sentence of a
   reviewed SEC filing behind a `sec_filing` label (attributed and linked; decided 23 Nov 2026
   on the SEC's reuse statement). Nothing else is quoted: in particular no publication text —
   a label taken from a trial's paper carries the PMID, never the paper's words. The
   marketplace package (`scripts/marketplace/build_package.py`) is narrower still and carries
   only the filing reference.
2. **Facts, arrangement and database rights are separate questions.** A calculated aggregate
   is not automatically an adaptation of a source database, but a joined extract is not
   automatically free of obligations either because we called it "derived". Where a field
   originates in a ShareAlike source, it is labelled as such in the export's README, and the
   licence conditions travel with it.
3. **Our software is not covered by the data licences.** Processing CC BY-SA data does not
   place the code under that licence. The distinction is kept explicit so it is not
   accidentally conceded in a customer agreement.
4. **Licence terms we grant cannot cut down rights a recipient already has** under a source
   licence. Customer terms must not purport to forbid what CC BY-SA permits for the material
   it covers.
5. **Attribution ships with the file, not just the website.** Every export carries a README
   naming each source, its licence and its version date.

## Statements we do not make

Separating the registry fact, our classification and our interpretation is a publication
rule, not a presentational preference. "Sponsor X's drug failed because the mechanism does
not work" is not supportable where the evidence is a registry status and an ambiguous
sentence, and labelling it an opinion does not cure it — a statement framed as opinion that
implies undisclosed false facts is not protected (*Milkovich v. Lorain Journal Co.*, 497 U.S.
1 (1990); other jurisdictions need their own analysis).

So the output says, in this order and visibly separated:

- **the registry fact** — this trial has status TERMINATED and the sponsor filed this text;
- **our classification** — we read that text as an efficacy, safety or benefit–risk cause,
  under a stated rule, with the span that supports it;
- **our interpretation**, where we offer one, marked as ours and never attributing a cause
  the source does not state.

A model generating a sentence does not make that sentence a source fact. An unsupported
causal or sponsor-level claim reaching an export is a pipeline defect, not harmless
commentary.

Sponsorship is attributed as of the event, not assigned to whoever owns the asset today, and
corrections are dated and kept. We publish no sponsor league table: stopping a trial can be
good development practice, and this metric does not measure sponsor competence or honesty.

## Marketing permission

Delivering a file someone asked for is not marketing, so it is not conditioned on marketing
permission. The sample and brief forms carry an optional, unticked box for future contact,
recorded as its own field on the lead; leaving it unticked still delivers the file, and the
only reply that follows is about that request.

## Licence clause for Failure Signals deliveries (24 Nov 2026)

The signals product keeps its ChEMBL fields (IDs, max phase, mechanisms, targets, gene symbols).
Instead of restricting them, every delivery says they stay under ChEMBL's licence. Use this
clause in every direct licence agreement and quote, unchanged; the product's meta file carries the
same text (`licence_terms`):

> Fields taken or derived from ChEMBL (EMBL-EBI) — molecule IDs, development phase, mechanisms of
> action, targets and target genes, and the fields built from them — are provided under the
> Creative Commons Attribution-ShareAlike 3.0 licence. The Customer may use and share those fields
> under that licence, and nothing in this Agreement restricts them. All other content (stop-reason
> labels, evidence, cohort and signal definitions, rates, sponsor groups, curation and
> documentation) is licensed under this Agreement.

Why this is enough, on the conservative reading: CC BY-SA 3.0 allows commercial use; ShareAlike
requires that what is adapted from ChEMBL goes out under BY-SA, and the clause does exactly that
for every ChEMBL-derived field. What the customer pays for is not derived from ChEMBL: our labels,
the evidence, the cohorts and the rates. The worst case of a wider reading is that a customer may
pass on more of the ChEMBL-derived layer, which is free at EMBL-EBI anyway. The 3.0 licences
neutralise sui generis database rights (Creative Commons policy for 3.0), so the EU/UK database
right adds no obligation here. EMBL-EBI's terms add no restriction beyond the data owner's licence
and ask for attribution, which every file carries. ChEMBL's property calculations from commercial
software are not used (`docs/provenance_and_rights.md` ChEMBL row lists the fields we take).

## Open questions

- ChEMBL in the signals product: handled by the licence clause above (24 Nov 2026). Worth a
  lawyer's look only if a customer's contract asks for exclusivity or for warranties over the
  ChEMBL-derived fields. The public dataset and the marketplace packages carry no ChEMBL content
  since 24 Nov 2026. The narrow answer we operate on meanwhile: ship the aggregate and the
  per-trial row, never a redistributable copy of the source database.
- Sui generis database rights under 3.0 Unported, for customers in jurisdictions that
  recognise them.
- Customer warranties and liability limits. We do not warrant clinical truth, completeness of
  the registry, or exclusive rights over material we do not control.
