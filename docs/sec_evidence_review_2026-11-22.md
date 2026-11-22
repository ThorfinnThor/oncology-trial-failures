# Review of SEC filing evidence, 22 Nov 2026

AI-assisted review (Claude) of the 101 cases in review batches `sec-evidence-2026-11` (67, sponsors matched
by name) and `sec-evidence-2026-11b` (34, group and acquired companies via `data/sec_sponsor_map.csv`).
Each case: the registry stop reason next to the sponsor's own SEC filing passage. Where the passage was cut
short, the filing was read in full. Not a clinician review; labelled as such wherever it is used.

**Accepted: 50 trials** → `data/sec_evidence_decisions.csv` (one row per trial: label, whether the filing
speaks of this trial or of the drug's programme, form, date, link, the sentence it rests on, a note).

| Label | Trials |
|---|---:|
| Biological failure → efficacy / futility | 30 |
| Biological failure → benefit–risk, not separable (vemircopan, VX-814) | 4 |
| Not about the drug → business / strategy | 12 |
| Not about the drug → recruitment (Pliant ARDS, SERENE) | 2 |
| Programme stopped, no cause stated (SB-FIX, rociletinib) | 2 |

20 rest on a filing about **this trial** (e.g. MERU: "no survival benefit at a pre-planned interim
analysis"; VX-210: "stop the clinical trial early due to futility"; REVOLVE: "interim futility analysis";
EPOCH: "low probability of success"). 30 rest on the drug's **programme** ending (e.g. serelaxin after
RELAX-AHF-2, tusamitamab after CARMEN-LC03, losmapimod after REACH): labelled as the programme's stated cause,
as the reviewed decision "withdrawn based on new efficacy data from another study" already is, and marked
`filing_about = PROGRAMME` so programme stops can be counted apart.

**Not accepted: 51**, the label stays as it is (CLAUDE.md rule 5: not established):
- The filing is about another trial or drug of the same company (31): e.g. galidesivir COVID-19 vs. this
  yellow-fever trial; spartalizumab COMBI-i vs. three other PDR001 trials; Fovista vs. Lucentis Phase 4
  studies; CANOPY-A vs. a canakinumab leg-artery trial; NUV-569/A2A vs. NUV-422; magrolimab ENHANCE-2;
  eclitasertib vs. KT-474; verubecestat EPOCH vs. APECS (which continued); BDC-1001 vs. BDC-3042.
- A result stated without its direction (7): "based on interim analysis results" (SAR441000), "following the
  outcome of the prespecified interim analysis" (four amcenestrant trials), "following ... the
  recommendation of the DSMB" (ZL-1102), LIGHTHOUSE terminated with no reason in the filing.
- "Based on emerging / early clinical data" without saying what the data showed (2): CLN-617, XL495.
- Stopped with no reason that adds to the registry text (5): BCX9930 (×2), magrolimab, BMF-219 (×2).
- Fevipiprant (2): ZEAL 1/2 missed their endpoint, but at that filing the programme continued.
- A temporary halt for drug supply, not the termination (BNT112); early stop because data sufficed
  (BIV201); reimbursement news (DEXYCU ×2); adverse-event tables and cost lines (ATI-450, CDX-3379, miricorilant,
  obeldesivir, selinexor, PRAX-114 ×2, LYT-100, AZD9898, NBI-921352).

**Applied 22 Nov** per trial (from the weekly run of 23 Nov): `docs/classification_change_2026-11-22_sec_filings.md`.
