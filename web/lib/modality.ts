// web/lib/modality.ts
//
// A modality as it reads in a sentence. The pages used to lower-case the label and add an "s",
// which printed "all antibodys" on every antibody class in the brief index. The same table
// lives in scripts/signals/stop_attribution.py (MODALITY_PLURAL) for the documents; kept short
// and identical so the page and the PDF never disagree about a word.

const PLURAL: Record<string, string> = {
  Antibody: "antibodies",
  "Small molecule": "small molecules",
  Protein: "engineered proteins",
  Peptide: "peptides",
  Oligonucleotide: "oligonucleotides",
  "Cell therapy": "cell therapies",
  "Gene therapy": "gene therapies",
  Vaccine: "vaccines",
  Enzyme: "enzymes",
  ADC: "antibody–drug conjugates",
};

export function pluralModality(label: string): string {
  if (PLURAL[label]) return PLURAL[label];
  const lower = label.toLowerCase();
  // Never wrong, sometimes plain: consonant + y becomes -ies, anything else takes an s.
  return /[^aeiou]y$/.test(lower) ? `${lower.slice(0, -1)}ies` : `${lower}s`;
}
