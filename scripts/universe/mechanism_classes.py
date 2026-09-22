"""Curated mechanism classes for discontinuation rates.

A class is a set of HGNC gene symbols; a trial belongs to a class when any drug in an
experimental arm targets one of those genes. Classes are deliberately coarse and are
the unit analysts think in ("PD-(L)1", "PARP", "KRAS"), not individual proteins.
"""
from __future__ import annotations

CLASSES: dict[str, list[str]] = {
    "PD-(L)1": ["PDCD1", "CD274"],
    "CTLA-4": ["CTLA4"],
    "TIGIT": ["TIGIT"],
    "LAG-3": ["LAG3"],
    "TIM-3": ["HAVCR2"],
    "CD47 / SIRPα": ["CD47", "SIRPA"],
    "IDO1": ["IDO1"],
    "TGF-β": ["TGFB1", "TGFB2", "TGFB3", "TGFBR1", "TGFBR2"],
    "OX40 / 4-1BB / GITR": ["TNFRSF4", "TNFRSF9", "TNFRSF18"],
    "CD3 T-cell engagers": ["CD3D", "CD3E", "CD3G"],
    "CD19": ["CD19"],
    "BCMA": ["TNFRSF17"],
    "CD20": ["MS4A1"],
    "CD38": ["CD38"],
    "TROP-2": ["TACSTD2"],
    "Nectin-4": ["NECTIN4"],
    "Claudin 18.2": ["CLDN18"],
    "B7-H3": ["CD276"],
    "HER2": ["ERBB2"],
    "HER3": ["ERBB3"],
    "EGFR": ["EGFR"],
    "VEGF / VEGFR": ["VEGFA", "KDR", "FLT1", "FLT4"],
    "MET": ["MET"],
    "FGFR": ["FGFR1", "FGFR2", "FGFR3", "FGFR4"],
    "ALK / ROS1 / RET": ["ALK", "ROS1", "RET"],
    "KRAS": ["KRAS"],
    "BRAF / MEK": ["BRAF", "MAP2K1", "MAP2K2"],
    "PI3K / AKT / mTOR": ["PIK3CA", "PIK3CB", "PIK3CD", "PIK3CG", "PIK3R1", "AKT1", "AKT2", "AKT3", "MTOR"],
    "CDK4/6": ["CDK4", "CDK6"],
    "PARP": ["PARP1", "PARP2", "PARP3"],
    "BTK": ["BTK"],
    "BCL-2": ["BCL2"],
    "JAK / TYK2": ["JAK1", "JAK2", "JAK3", "TYK2"],
    "HDAC": ["HDAC1", "HDAC2", "HDAC3", "HDAC6"],
    "EZH2": ["EZH2", "EZH1"],
    "Proteasome": ["PSMB5", "PSMA1", "PSMA2", "ADRM1"],
    "Androgen receptor axis": ["AR", "CYP17A1"],
    "ER / aromatase": ["ESR1", "CYP19A1"],
    "FLT3 / KIT": ["FLT3", "KIT"],
    "IDH1/2": ["IDH1", "IDH2"],
    "Topoisomerase": ["TOP1", "TOP2A"],
    "Microtubule": ["TUBA1A", "TUBA1B", "TUBA1C", "TUBB"],
    "Antifolate / nucleoside": ["TYMS", "DHFR", "GART", "RRM1"],
}



# Immunology & autoimmune. Same idea as the oncology classes: coarse groups an analyst names
# ("anti-TNF", "IL-23", "JAK"), not individual proteins. Drawn from the targets that actually
# appear in Phase 2/3 immunology trials in the universe, not from a textbook.
IMMUNOLOGY_CLASSES: dict[str, list[str]] = {
    "TNF": ["TNF"],
    "IL-23 / IL-12": ["IL23A", "IL12B", "IL12A", "IL23R"],
    "IL-17": ["IL17A", "IL17F", "IL17RA", "IL17RC"],
    "JAK / TYK2": ["JAK1", "JAK2", "JAK3", "TYK2"],
    "IL-6": ["IL6", "IL6R", "IL6ST"],
    "IL-1": ["IL1B", "IL1A", "IL1R1", "IL1RN"],
    "IL-4 / IL-13": ["IL4", "IL4R", "IL13", "IL13RA1", "IL13RA2"],
    "IL-5 / eosinophil": ["IL5", "IL5RA", "CCR3"],
    "TSLP": ["TSLP", "CRLF2"],
    "TL1A": ["TNFSF15", "TNFRSF25"],
    "Integrin (α4β7 / LFA-1)": ["ITGA4", "ITGB7", "ITGAL", "ITGB2", "ITGAE"],
    "S1P receptor": ["S1PR1", "S1PR4", "S1PR5"],
    "CD20 B-cell depletion": ["MS4A1"],
    "BAFF / APRIL": ["TNFSF13B", "TNFSF13", "TNFRSF13B", "TNFRSF13C"],
    "CD40 / CD40L": ["CD40", "CD40LG"],
    "T-cell costimulation (CTLA-4 / CD28)": ["CTLA4", "CD80", "CD86", "CD28"],
    "Type I interferon": ["IFNAR1", "IFNA1", "IFNB1"],
    "Complement": ["C5", "C3", "C1S", "C1R", "CFB", "CFD", "C5AR1"],
    "FcRn": ["FCGRT"],
    "BTK": ["BTK"],
    "PDE4": ["PDE4A", "PDE4B", "PDE4C", "PDE4D"],
    "Glucocorticoid receptor": ["NR3C1"],
    "Antimetabolite immunosuppressant": ["IMPDH1", "IMPDH2", "DHODH", "DHFR"],
    "Calcineurin / mTOR": ["PPP3CA", "PPP3CB", "PPP3R1", "MTOR", "FKBP1A"],
    "IgE": ["IGHE", "FCER1A", "MS4A2"],
    "IL-2 / Treg": ["IL2", "IL2RA", "IL2RB"],
    "OX40 / OX40L": ["TNFRSF4", "TNFSF4"],
    "Plasma-cell depletion (CD38 / BCMA / CD19)": ["CD38", "TNFRSF17", "CD19"],
}

# Neurology & CNS. Drawn from the targets that appear in Phase 2/3 neurology trials in the
# universe: antiseizure, migraine, movement disorders, neuroimmunology, neurodegeneration.
NEUROLOGY_CLASSES: dict[str, list[str]] = {
    "CGRP (migraine)": ["CALCA", "CALCB", "CALCRL", "RAMP1"],
    "Sodium channel": ["SCN1A", "SCN2A", "SCN3A", "SCN4A", "SCN5A", "SCN7A", "SCN8A", "SCN9A", "SCN10A", "SCN11A"],
    "GABA-A": ["GABRA1", "GABRA2", "GABRA3", "GABRA4", "GABRA5", "GABRA6", "GABRB1", "GABRB2", "GABRB3",
               "GABRD", "GABRE", "GABRG1", "GABRG2", "GABRG3", "GABRP", "GABRQ"],
    "SV2A (antiseizure)": ["SV2A"],
    "Calcium channel": ["CACNA1A", "CACNA1B", "CACNA1C", "CACNA2D1", "CACNA2D2"],
    "Dopaminergic": ["DRD1", "DRD2", "DRD3", "DRD4", "DRD5", "SLC6A3", "DDC", "COMT", "MAOB"],
    "Serotonergic": ["HTR1A", "HTR1B", "HTR1D", "HTR2A", "HTR2B", "HTR2C", "HTR3A", "SLC6A4"],
    "Glutamatergic (NMDA / AMPA)": ["GRIN1", "GRIN2A", "GRIN2B", "GRIA1", "GRIA2", "GRM5"],
    "Cannabinoid": ["CNR1", "CNR2"],
    "Opioid receptor": ["OPRM1", "OPRK1", "OPRD1"],
    "Cholinergic": ["ACHE", "CHRNA4", "CHRNA7", "CHRM1", "CHRM4", "BCHE"],
    # Split deliberately. Pooled as one "amyloid" class these read 41.7%, a number that
    # describes neither half: Abeta-directed agents are mostly antibodies and the class has
    # produced approvals, while every closed Phase 2/3 trial of a secretase inhibitor stopped
    # early, across three sponsors. A pathway label is not a risk class.
    "Amyloid-β directed": ["APP"],
    "BACE / γ-secretase": ["BACE1", "PSEN1"],
    "Tau": ["MAPT"],
    "α-synuclein": ["SNCA"],
    "Huntingtin / gene-targeted": ["HTT", "SMN1", "SMN2"],
    "CD20 B-cell depletion (MS)": ["MS4A1"],
    "S1P receptor (MS)": ["S1PR1", "S1PR5"],
    "Integrin α4 (MS)": ["ITGA4"],
    "BTK (MS)": ["BTK"],
    "Complement (neuromuscular)": ["C5", "C1S", "C1R"],
    "FcRn (neuromuscular)": ["FCGRT"],
    "Neurotrophic / growth factor": ["NGF", "NTRK1", "BDNF", "GDNF"],
    "Orexin": ["HCRTR1", "HCRTR2"],
    "Prostaglandin / COX": ["PTGS1", "PTGS2"],
    "Adenosine / A2A": ["ADORA2A"],
    "SOD1 / ALS gene-targeted": ["SOD1", "FUS", "TARDBP", "C9orf72"],
}

# Endocrine & metabolic. The area that grew the most between 2015 and 2024, and the one buyers
# ask about most often outside oncology: obesity, type 2 diabetes, dyslipidaemia, bone disease.
# Same rule as the others — every class here was read off the targets that actually appear in
# Phase 2/3 trials in the universe, not off a textbook.
METABOLIC_CLASSES: dict[str, list[str]] = {
    # Split from glucagon deliberately. Nearly every GLP1R/GIPR trial is an agonist and the class
    # has produced the decade's biggest approvals; GCGR is dominated by antagonists, a different
    # bet with a different history. Pooled, the rate would describe neither.
    "GLP-1 / GIP": ["GLP1R", "GIPR"],
    "Glucagon receptor": ["GCGR"],
    "SGLT1/2": ["SLC5A2", "SLC5A1"],
    "Insulin": ["INSR"],
    "DPP-4": ["DPP4"],
    # Metformin. ChEMBL resolves it to the whole of complex I, so any subunit identifies it;
    # all three of these appear together in every trial that carries any of them.
    "Biguanide / complex I": ["GPD2", "NDUFS1", "MT-ND1"],
    "Sulfonylurea / K-ATP": ["KCNJ11", "ABCC8"],
    "Glucokinase": ["GCK"],
    "GPR40 (FFAR1)": ["FFAR1"],
    "PPAR": ["PPARA", "PPARG", "PPARD"],
    "Melanocortin (MC4R)": ["MC4R"],
    "Amylin": ["IAPP", "CALCR", "RAMP1", "RAMP3"],
    "Leptin": ["LEP", "LEPR"],
    "PCSK9": ["PCSK9"],
    "Statin (HMGCR)": ["HMGCR"],
    "Non-statin lipid lowering": ["NPC1L1", "ACLY", "CETP", "MTTP"],
    "ANGPTL3 / APOC3": ["ANGPTL3", "APOC3"],
    "Thyroid hormone receptor": ["THRB", "THRA"],
    "Growth hormone / IGF": ["GH1", "GHR", "GHRHR", "IGF1R"],
    "Bone & mineral (PTH / CaSR / vitamin D)": ["PTH1R", "CASR", "VDR"],
    "Mineralocorticoid receptor": ["NR3C2"],
    "11\u03b2-HSD1": ["HSD11B1"],
}

# Classes are per disease area: a gene set that means "checkpoint inhibitor" in oncology means
# something different in autoimmune disease, and each area's analysts name different groups.
CLASSES_BY_AREA: dict[str, dict[str, list[str]]] = {
    "Oncology": CLASSES,
    "Neurology": NEUROLOGY_CLASSES,
    "Immunology & Autoimmune": IMMUNOLOGY_CLASSES,
    "Endocrine & Metabolic": METABOLIC_CLASSES,
}

# Every script that walks the curated areas reads this rather than listing them again. An area
# was once added here and missed in three other files, so it answered questions on the site
# without ever appearing in the index that makes it findable.
CURATED_AREAS: tuple[str, ...] = tuple(CLASSES_BY_AREA)

COMBINATION_PARTNER: dict[str, str] = {"Oncology": "PD-(L)1"}


def classes_of(area: str | None) -> dict[str, list[str]]:
    """The class lexicon for a disease area; empty when we have not curated one yet."""
    return CLASSES_BY_AREA.get(area or "", {})


def classes_for(genes: set[str], area: str | None = "Oncology") -> list[str]:
    lexicon = classes_of(area)
    return sorted(name for name, members in lexicon.items() if genes & set(members))
