"""Sponsor name normalization and conservative parent-company mapping.

Canonicalization is deterministic (legal-suffix and punctuation stripping).
Parent mapping uses a small curated table of long-standing, well-documented
subsidiary relationships only; everything else keeps its own canonical name and
``parent_mapping_method = SELF``. Ticker resolution is a separate, source-backed
step (SEC EDGAR) and is never guessed here.
"""
from __future__ import annotations

import re
import unicodedata

CURATED_AS_OF = "2026-09-15"

LEGAL_SUFFIXES = r"(incorporated|inc|corp|corporation|co|company|ltd|limited|llc|l\.l\.c|plc|ag|sa|s\.a|se|gmbh|kg|kgaa|bv|b\.v|nv|n\.v|spa|s\.p\.a|srl|ab|as|a/s|oy|kk|k\.k|pty|lp|llp)"

# alias key (normalized) -> (canonical group name, relationship note)
PARENT_GROUPS: dict[str, str] = {
    # Merck & Co. (US)
    "merck sharp dohme": "Merck & Co.", "merck sharp and dohme": "Merck & Co.",
    "merck sharp dohme corp": "Merck & Co.", "schering plough": "Merck & Co.",
    # Merck KGaA
    "emd serono": "Merck KGaA", "emd serono research development institute": "Merck KGaA", "merck kgaa": "Merck KGaA",
    "merck healthcare kgaa": "Merck KGaA", "emd serono research and development institute": "Merck KGaA",
    # Roche
    "hoffmann la roche": "Roche", "roche": "Roche", "genentech": "Roche", "chugai pharmaceutical": "Roche",
    # Novartis
    "novartis pharmaceuticals": "Novartis", "novartis": "Novartis",
    # J&J
    "janssen research development": "Johnson & Johnson", "janssen research and development": "Johnson & Johnson",
    "janssen": "Johnson & Johnson", "janssen pharmaceutica": "Johnson & Johnson", "johnson johnson": "Johnson & Johnson",
    # BMS
    "bristol myers squibb": "Bristol Myers Squibb", "celgene": "Bristol Myers Squibb", "juno therapeutics": "Bristol Myers Squibb",
    "mirati therapeutics": "Bristol Myers Squibb", "turning point therapeutics": "Bristol Myers Squibb",
    # AstraZeneca
    "astrazeneca": "AstraZeneca", "medimmune": "AstraZeneca",
    # Pfizer
    "pfizer": "Pfizer", "seagen": "Pfizer", "seattle genetics": "Pfizer", "array biopharma": "Pfizer", "medivation": "Pfizer",
    # Eli Lilly
    "eli lilly and": "Eli Lilly", "eli lilly": "Eli Lilly", "loxo oncology": "Eli Lilly", "imclone": "Eli Lilly",
    # AbbVie
    "abbvie": "AbbVie", "pharmacyclics": "AbbVie", "allergan": "AbbVie", "immunogen": "AbbVie",
    # Amgen
    "amgen": "Amgen",
    # Gilead
    "gilead sciences": "Gilead Sciences", "kite": "Gilead Sciences", "kite a gilead": "Gilead Sciences", "immunomedics": "Gilead Sciences",
    # GSK
    "glaxosmithkline": "GSK", "gsk": "GSK", "tesaro": "GSK",
    # Sanofi
    "sanofi": "Sanofi", "genzyme": "Sanofi", "sanofi genzyme": "Sanofi",
    # Bayer
    "bayer": "Bayer",
    # Takeda
    "takeda": "Takeda", "millennium pharmaceuticals": "Takeda", "ariad pharmaceuticals": "Takeda",
    # Daiichi Sankyo
    "daiichi sankyo": "Daiichi Sankyo",
    # Astellas
    "astellas pharma global development": "Astellas Pharma", "astellas pharma": "Astellas Pharma",
    # Boehringer
    "boehringer ingelheim": "Boehringer Ingelheim",
    # Eisai
    "eisai": "Eisai",
    # Taiho / Otsuka
    "taiho oncology": "Otsuka Holdings", "taiho pharmaceutical": "Otsuka Holdings",
    # Incyte
    "incyte": "Incyte",
    # BeiGene
    "beigene": "BeOne Medicines",
}

INDUSTRY_HINTS = re.compile(r"\b(pharma|pharmaceutical|therapeutics|biotech|bioscience|biosciences|biologics|oncology inc|laboratories|biopharma)\b", re.I)


def normalize_name(name: str) -> str:
    value = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode()
    value = value.lower().replace("&", " and ")
    value = re.sub(r"\([^)]*\)", " ", value)
    value = re.sub(r"[.,'’\"/]", " ", value)
    value = re.sub(r"[-_]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    for _ in range(3):
        value = re.sub(rf"(?:\s|^){LEGAL_SUFFIXES}$", "", value).strip()
    value = re.sub(r"\band\b$", "", value).strip()
    return value


def _alias_key(name: str) -> str:
    return normalize_name(name).replace(" and ", " ")


SUBSIDIARY_OF = re.compile(r"(?:a\s+)?(?:wholly[- ]owned\s+)?subsidiary of\s+(.+)$|,\s*an?\s+(.+?)\s+company$", re.I)


def resolve_sponsor(raw_name: str, sponsor_class: str = "") -> dict:
    key = _alias_key(raw_name)
    m = SUBSIDIARY_OF.search(re.sub(r"\([^)]*\)", "", raw_name or "").strip())
    if m:
        parent_text = (m.group(1) or m.group(2) or "").strip()
        parent_key = "merck sharp dohme" if re.search(r"merck\s*(&|and)\s*co\b", parent_text, re.I) else _alias_key(parent_text)
        for alias, parent in sorted(PARENT_GROUPS.items(), key=lambda kv: -len(kv[0])):
            if parent_key == alias or parent_key.startswith(alias + " "):
                return {
                    "lead_sponsor_raw": raw_name, "sponsor_class_ctgov": sponsor_class or None, "canonical_sponsor_key": key,
                    "sponsor_group": parent, "sponsor_group_method": "REGISTRY_STATED_SUBSIDIARY",
                    "sponsor_group_curated_as_of": CURATED_AS_OF, "is_industry": (sponsor_class or "").upper() == "INDUSTRY",
                }
    group = PARENT_GROUPS.get(key) or PARENT_GROUPS.get(normalize_name(raw_name))
    method = "CURATED_GROUP_TABLE" if group else "SELF"
    if not group:
        # prefix match for divisions, e.g. "pfizer oncology", "novartis pharma ag"
        for alias, parent in sorted(PARENT_GROUPS.items(), key=lambda kv: -len(kv[0])):
            if len(alias) >= 5 and (key == alias or key.startswith(alias + " ")):
                group, method = parent, "CURATED_GROUP_PREFIX"
                break
    sponsor_type = (sponsor_class or "").upper() or ("INDUSTRY" if INDUSTRY_HINTS.search(raw_name or "") else "UNKNOWN")
    return {
        "lead_sponsor_raw": raw_name,
        "sponsor_class_ctgov": sponsor_class or None,
        "canonical_sponsor_key": key,
        "sponsor_group": group or (raw_name or "").strip(),
        "sponsor_group_method": method,
        "sponsor_group_curated_as_of": CURATED_AS_OF if group else None,
        "is_industry": sponsor_type == "INDUSTRY",
    }
