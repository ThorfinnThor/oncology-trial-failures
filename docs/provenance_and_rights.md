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
| ChEMBL (EMBL-EBI) | CC BY-SA 3.0 Unported. Commercial use is permitted; the ShareAlike condition follows any adaptation we distribute. Note that 3.0 Unported does not expressly licence sui generis database rights, unlike 4.0. | ChEMBL molecule ID, preferred name, molecule type, max phase, mechanism strings, target IDs, target names and target genes, for the drugs in a trial's experimental arm. | Bulk re-publication of ChEMBL tables. Our exports carry per-trial rows, not a redistributable copy of the source database. |
| NCI Thesaurus (NCI) | CC BY 4.0, with a separate trademark position on the NCI Thesaurus name itself. | Concept codes and preferred terms used to resolve drug names. | Any presentation that implies our terminology is an NCI-issued thesaurus. Attribution is carried; the name is not used as a badge. |
| RxNorm / RxClass (NLM) | US government terminology. | Normalised drug names and class assignments used during resolution. | Redistribution of the source files. |
| PubMed / NCBI (NLM) | Indexing is public; **publishers or authors may retain copyright in the abstracts**. | Counts and identifiers only — `publication_count` and PMIDs. | Abstract text, title text beyond a bibliographic reference, and any full text. This is a deliberate product decision: no abstract text has ever been in an export, and none should be added. |
| SEC EDGAR | US government filing system; filings themselves are company-authored. | Issuer identity and ticker, matched to a sponsor. | Filing text and exhibits. |
| Our own work | Ours | Classification labels and evidence spans from registry text, mechanism-class definitions, cohort rules, rates, intervals, cumulative-incidence estimates, concentration statistics and written interpretation. | — |

## Rules this register imposes on the pipeline

1. **No source text beyond the registry's own stop reason appears in an export.** Registry
   `why_stopped` text is quoted verbatim because it is the evidence the classification rests
   on and the customer has to be able to check it. Nothing else is quoted.
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

## Open questions

- Whether any specific export constitutes a ShareAlike adaptation of ChEMBL, and what that
  requires of the export's own terms, is the one question worth a lawyer's time before the
  first paid delivery. The narrow answer we operate on meanwhile: ship the aggregate and the
  per-trial row, never a redistributable copy of the source database.
- Sui generis database rights under 3.0 Unported, for customers in jurisdictions that
  recognise them.
- Customer warranties and liability limits. We do not warrant clinical truth, completeness of
  the registry, or exclusive rights over material we do not control.
