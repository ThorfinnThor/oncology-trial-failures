"""Curated mechanism classes for benchmarking.

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
    "Proteasome": ["PSMB5", "PSMA1", "PSMA2", "ADRM1"],
    "Androgen receptor axis": ["AR", "CYP17A1"],
    "ER / aromatase": ["ESR1", "CYP19A1"],
    "FLT3 / KIT": ["FLT3", "KIT"],
    "IDH1/2": ["IDH1", "IDH2"],
    "Topoisomerase": ["TOP1", "TOP2A"],
    "Microtubule": ["TUBA1A", "TUBA1B", "TUBA1C", "TUBB"],
    "Antifolate / nucleoside": ["TYMS", "DHFR", "GART", "RRM1"],
}


def classes_for(genes: set[str]) -> list[str]:
    return sorted(name for name, members in CLASSES.items() if genes & set(members))
