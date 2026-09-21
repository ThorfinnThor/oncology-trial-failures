#!/usr/bin/env python3
"""Short names for targets, because nobody types a HGNC symbol.

A buyer asks about PD-L1, HER2, BCMA or amyloid. The index knows CD274, ERBB2, TNFRSF17 and APP.
Without this table the asset check answers "not found" to the most common queries it will ever
receive, which reads as a broken tool rather than as a gap in an ontology.

Only aliases that are unambiguous in this domain are listed. Where a short name covers several
genes — VEGFR, PARP, JAK — every gene it covers is listed, and the comparison treats a match on
any of them as a match, which is what the person meant.
"""
from __future__ import annotations

ALIASES: dict[str, list[str]] = {
    # checkpoints and immuno-oncology
    "PD-1": ["PDCD1"],
    "PD1": ["PDCD1"],
    "PD-L1": ["CD274"],
    "PDL1": ["CD274"],
    "PD-(L)1": ["PDCD1", "CD274"],
    "CTLA-4": ["CTLA4"],
    "LAG-3": ["LAG3"],
    "TIM-3": ["HAVCR2"],
    "TIGIT": ["TIGIT"],
    "OX40": ["TNFRSF4"],
    "4-1BB": ["TNFRSF9"],
    "41BB": ["TNFRSF9"],
    "GITR": ["TNFRSF18"],
    "CD47": ["CD47"],
    "SIRPa": ["SIRPA"],
    "IDO": ["IDO1"],
    # receptor tyrosine kinases
    "HER1": ["EGFR"],
    "HER2": ["ERBB2"],
    "neu": ["ERBB2"],
    "HER3": ["ERBB3"],
    "HER4": ["ERBB4"],
    "VEGF": ["VEGFA"],
    "VEGFR": ["KDR", "FLT1", "FLT4"],
    "VEGFR2": ["KDR"],
    "c-MET": ["MET"],
    "cKIT": ["KIT"],
    "TROP2": ["TACSTD2"],
    "FGFR": ["FGFR1", "FGFR2", "FGFR3", "FGFR4"],
    "IGF-1R": ["IGF1R"],
    "AXL": ["AXL"],
    # intracellular signalling
    "MEK": ["MAP2K1", "MAP2K2"],
    "ERK": ["MAPK1", "MAPK3"],
    "PI3K": ["PIK3CA", "PIK3CB", "PIK3CD", "PIK3CG"],
    "AKT": ["AKT1", "AKT2", "AKT3"],
    "mTOR": ["MTOR"],
    "CDK4/6": ["CDK4", "CDK6"],
    "CDK": ["CDK1", "CDK2", "CDK4", "CDK6", "CDK7", "CDK9"],
    "PARP": ["PARP1", "PARP2"],
    "BCL-2": ["BCL2"],
    "HDAC": ["HDAC1", "HDAC2", "HDAC3", "HDAC6"],
    "EZH2": ["EZH2"],
    "KRAS G12C": ["KRAS"],
    "KRAS G12D": ["KRAS"],
    # surface antigens for cell therapy and bispecifics
    "BCMA": ["TNFRSF17"],
    "CD20": ["MS4A1"],
    "GPRC5D": ["GPRC5D"],
    "CLDN18.2": ["CLDN18"],
    "DLL3": ["DLL3"],
    "PSMA": ["FOLH1"],
    "Nectin-4": ["NECTIN4"],
    "GD2": ["B4GALNT1"],
    # neurology
    "amyloid": ["APP"],
    "amyloid beta": ["APP"],
    "abeta": ["APP"],
    "a-beta": ["APP"],
    "tau": ["MAPT"],
    "BACE": ["BACE1"],
    "gamma-secretase": ["PSEN1"],
    "alpha-synuclein": ["SNCA"],
    "LRRK2": ["LRRK2"],
    "NMDA": ["GRIN1", "GRIN2A", "GRIN2B"],
    "GABA-A": ["GABRA1", "GABRA2"],
    "dopamine": ["DRD1", "DRD2", "DRD3"],
    # immunology
    "TNF": ["TNF"],
    "IL-6": ["IL6"],
    "IL-17": ["IL17A"],
    "IL-23": ["IL23A"],
    "IL-4": ["IL4"],
    "IL-13": ["IL13"],
    "JAK": ["JAK1", "JAK2", "JAK3", "TYK2"],
    "TYK2": ["TYK2"],
    "BTK": ["BTK"],
    "S1P": ["S1PR1"],
    "integrin": ["ITGA4", "ITGB7"],
    # metabolic, occasionally asked about
    "GLP-1": ["GLP1R"],
    "SGLT2": ["SLC5A2"],
}
