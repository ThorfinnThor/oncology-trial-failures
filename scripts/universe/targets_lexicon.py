"""Target extraction from NCI Thesaurus definitions (first sentence only).

Used only for drugs that NCIt resolves but ChEMBL does not. Curated protein-name aliases
map to HGNC gene symbols; bare symbols are accepted when they are known ChEMBL target genes.
Results are marked target_source = NCIT_DEFINITION.
"""
from __future__ import annotations

import re

ALIASES = {
    r"PD-?1|programmed (?:cell )?death(?: protein)?[- ]1(?! ligand)": ["PDCD1"],
    r"PD-?L1|programmed (?:cell )?death(?:[- ]1)? ligand[- ]1|B7-H1": ["CD274"],
    r"CTLA-?4|cytotoxic T-lymphocyte[- ]associated (?:antigen|protein) 4": ["CTLA4"],
    r"LAG-?3|lymphocyte[- ]activation gene[- ]3": ["LAG3"], r"TIM-?3": ["HAVCR2"], r"TIGIT": ["TIGIT"],
    r"CD47": ["CD47"], r"SIRP ?(?:alpha|α|a)\b": ["SIRPA"],
    r"HER-?2|ErbB-?2|EGFR2|human epidermal growth factor receptor 2": ["ERBB2"], r"HER-?3|ErbB-?3": ["ERBB3"],
    r"EGFR(?!2|3|4)|epidermal growth factor receptor(?: 1)?(?! ?(?:2|3|4|type 2))|HER-?1": ["EGFR"], r"VEGF-?A?(?!R)|vascular endothelial growth factor(?! receptor)": ["VEGFA"],
    r"VEGFR-?2|KDR": ["KDR"], r"c-?Met|hepatocyte growth factor receptor|HGFR": ["MET"],
    r"TROP-?2|trophoblast (?:cell[- ]surface )?antigen 2": ["TACSTD2"], r"Nectin-?4": ["NECTIN4"],
    r"claudin[- ]?18(?:\.2)?|CLDN18(?:\.2)?": ["CLDN18"], r"B7-?H3": ["CD276"], r"B7-?H4": ["VTCN1"],
    r"BCMA|B-cell maturation antigen": ["TNFRSF17"], r"CD3(?:e|ε|epsilon)?\b": ["CD3E"], r"CD19\b": ["CD19"],
    r"CD20\b": ["MS4A1"], r"CD22\b": ["CD22"], r"CD30\b": ["TNFRSF8"], r"CD33\b": ["CD33"], r"CD38\b": ["CD38"],
    r"CD123\b|IL-?3R(?:alpha|a)": ["IL3RA"], r"GPRC5D": ["GPRC5D"], r"FcRH5|FCRL5": ["FCRL5"], r"DLL-?3": ["DLL3"],
    r"KRAS": ["KRAS"], r"NRAS": ["NRAS"], r"BRAF": ["BRAF"], r"ALK\b|anaplastic lymphoma kinase": ["ALK"], r"ROS1": ["ROS1"],
    r"\bRET\b": ["RET"], r"FGFR-?1": ["FGFR1"], r"FGFR-?2": ["FGFR2"], r"FGFR-?3": ["FGFR3"], r"FGFR-?4": ["FGFR4"],
    r"PARP(?:-?1)?": ["PARP1"], r"CDK-?4/6|cyclin[- ]dependent kinases? 4 and 6": ["CDK4", "CDK6"], r"CDK-?2\b": ["CDK2"],
    r"BTK|Bruton'?s? tyrosine kinase": ["BTK"], r"BCL-?2": ["BCL2"], r"PI3K(?:alpha|α)?|phosphoinositide 3-kinase": ["PIK3CA"],
    r"mTOR": ["MTOR"], r"\bAKT\b": ["AKT1"], r"\bMEK(?:1/2)?\b": ["MAP2K1"], r"\bERK(?:1/2)?\b": ["MAPK1"],
    r"IDH-?1": ["IDH1"], r"IDH-?2": ["IDH2"], r"FLT-?3": ["FLT3"], r"c-?KIT|\bKIT\b": ["KIT"], r"PDGFR": ["PDGFRA"],
    r"\bAXL\b": ["AXL"], r"SHP-?2": ["PTPN11"], r"SOS-?1": ["SOS1"], r"EZH-?2": ["EZH2"], r"\bmenin\b": ["MEN1"],
    r"\bHDAC": ["HDAC1"], r"proteasome": ["PSMB5"], r"topoisomerase I\b|TOP1": ["TOP1"], r"topoisomerase II": ["TOP2A"],
    r"tubulin|microtubule": ["TUBB"], r"CD40\b": ["CD40"], r"OX-?40": ["TNFRSF4"], r"4-1BB|CD137": ["TNFRSF9"],
    r"GITR": ["TNFRSF18"], r"interleukin[- ]2\b|IL-?2\b": ["IL2"], r"TGF-?(?:beta|β)": ["TGFB1"], r"CXCR-?4": ["CXCR4"],
    r"CCR-?4": ["CCR4"], r"glypican[- ]3|GPC-?3": ["GPC3"], r"mesothelin": ["MSLN"],
    r"folate receptor (?:alpha|α)|FR(?:alpha|α)": ["FOLR1"], r"CEACAM-?5": ["CEACAM5"], r"EpCAM": ["EPCAM"],
    r"PSMA|prostate[- ]specific membrane antigen": ["FOLH1"], r"STEAP-?1": ["STEAP1"], r"androgen receptor": ["AR"],
    r"estrogen receptor": ["ESR1"], r"aromatase": ["CYP19A1"], r"adenosine A2A": ["ADORA2A"], r"CD73\b": ["NT5E"],
    r"CD39\b": ["ENTPD1"], r"IDO-?1|indoleamine 2,3-dioxygenase": ["IDO1"], r"STING": ["STING1"], r"TLR-?9": ["TLR9"],
    r"TLR-?7": ["TLR7"], r"WT-?1\b|Wilms'? tumor (?:protein|antigen) 1": ["WT1"], r"NY-ESO-1": ["CTAG1B"],
    r"survivin": ["BIRC5"], r"CD70\b": ["CD70"], r"CD27\b": ["CD27"], r"HLA-G": ["HLA-G"], r"NKG2A": ["KLRC1"],
    r"CD96\b": ["CD96"], r"ILT-?4|LILRB2": ["LILRB2"], r"MUC-?16|CA-?125": ["MUC16"], r"MUC-?1\b": ["MUC1"],
    r"GD2\b": [], r"EGFRvIII": ["EGFR"], r"c-?MYC": ["MYC"], r"\bMDM2\b": ["MDM2"], r"WEE-?1": ["WEE1"], r"\bATR\b": ["ATR"],
    r"\bATM\b": ["ATM"], r"DNA-PK": ["PRKDC"], r"aurora kinase A": ["AURKA"], r"PLK-?1": ["PLK1"], r"HSP-?90": ["HSP90AA1"],
    r"ADAM-?9": ["ADAM9"], r"tissue factor": ["F3"], r"LIV-1|SLC39A6": ["SLC39A6"], r"ROR-?1": ["ROR1"], r"CDH-?6": ["CDH6"],
    r"PTK-?7": ["PTK7"], r"SEZ6": ["SEZ6"], r"CD46\b": ["CD46"], r"CD74\b": ["CD74"], r"CD79b": ["CD79B"],
}
_COMPILED = [(re.compile(rf"(?<![A-Za-z0-9-])(?:{p})(?![A-Za-z0-9])", re.I), genes) for p, genes in ALIASES.items()]
_CASE_SENSITIVE = {"STING", "RET", "AKT", "MEK", "ERK", "ATR", "ATM", "KIT", "AXL", "ALK"}


def genes_from_definition(sentence: str, known_symbols: set[str]) -> list[str]:
    text = sentence or ""
    found: set[str] = set()
    for rx, genes in _COMPILED:
        for m in rx.finditer(text):
            token = m.group(0)
            if token.upper() in _CASE_SENSITIVE and token != token.upper():
                continue
            found.update(genes)
    for token in re.findall(r"(?<![A-Za-z0-9-])([A-Z][A-Z0-9]{2,9})(?![A-Za-z0-9])", text):
        if token in known_symbols:
            found.add(token)
    return sorted(found)
