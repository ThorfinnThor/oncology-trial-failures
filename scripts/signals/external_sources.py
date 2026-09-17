"""Source-backed enrichment: ChEMBL (assets, mechanisms, targets), PubMed (NCT-linked
publications) and SEC EDGAR (issuer ticker/CIK). Exact matches only; ambiguity -> no match."""
from __future__ import annotations

import re
from typing import Optional

from scripts.signals.http_cache import SourceUnavailable, get_json
from scripts.signals.sponsors import normalize_name

CHEMBL = "https://www.ebi.ac.uk/chembl/api/data"
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
SEC_TICKERS = "https://www.sec.gov/files/company_tickers.json"
MOLECULE_FIELDS = "molecule_chembl_id,pref_name,max_phase,molecule_type,first_approval,molecule_hierarchy"


def _norm(term: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (term or "").lower())


# ------------------------------------------------------------------ ChEMBL
def chembl_molecule(term: str) -> Optional[dict]:
    """One ChEMBL full-text search per term, then an exact normalized match on the
    preferred name or any synonym. Returns the parent molecule, or None when there is
    no exact match or the term maps to more than one distinct parent molecule."""
    term = (term or "").strip()
    key = _norm(term)
    if len(key) < 4:
        return None
    body = get_json("chembl", f"{CHEMBL}/molecule/search.json",
                    {"q": term, "limit": 25, "only": MOLECULE_FIELDS + ",molecule_synonyms"}) or {}
    molecules = list(body.get("molecules") or [])
    if not any(key in {_norm(n) for n in [m.get("pref_name") or ""] + [x.get("molecule_synonym") or "" for x in m.get("molecule_synonyms") or []]}
               for m in molecules) and re.search(r"\d", term):
        # Full-text search tokenizes short research codes (e.g. "B-701"); fall back to an exact synonym lookup.
        exact = get_json("chembl", f"{CHEMBL}/molecule.json",
                         {"molecule_synonyms__molecule_synonym__iexact": term, "only": MOLECULE_FIELDS + ",molecule_synonyms", "limit": 5}) or {}
        molecules = list(exact.get("molecules") or [])
    parents: dict[str, dict] = {}
    for m in molecules:
        names = [m.get("pref_name") or ""] + [s.get("molecule_synonym") or "" for s in m.get("molecule_synonyms") or []]
        if key not in {_norm(n) for n in names if n}:
            continue
        parent_id = ((m.get("molecule_hierarchy") or {}).get("parent_chembl_id")) or m["molecule_chembl_id"]
        if parent_id == m["molecule_chembl_id"]:
            parents[parent_id] = m
        elif parent_id not in parents:
            parents[parent_id] = get_json("chembl", f"{CHEMBL}/molecule/{parent_id}.json", {"only": MOLECULE_FIELDS}) or m
    if len(parents) != 1:
        return None
    mol = dict(next(iter(parents.values())))
    mol.pop("molecule_synonyms", None)
    return mol


def chembl_mechanisms(chembl_id: str) -> list[dict]:
    body = get_json("chembl", f"{CHEMBL}/mechanism.json",
                    {"molecule_chembl_id": chembl_id, "only": "mechanism_of_action,action_type,target_chembl_id", "limit": 20}) or {}
    out = []
    for mech in body.get("mechanisms") or []:
        target = {}
        if mech.get("target_chembl_id"):
            t = get_json("chembl", f"{CHEMBL}/target/{mech['target_chembl_id']}.json", {"only": "pref_name,target_type,target_components"}) or {}
            genes = sorted({s["component_synonym"] for c in t.get("target_components") or []
                            for s in c.get("target_component_synonyms") or [] if s.get("syn_type") == "GENE_SYMBOL"})
            target = {"target_chembl_id": mech["target_chembl_id"], "target_name": t.get("pref_name"),
                      "target_type": t.get("target_type"), "gene_symbols": genes}
        out.append({"mechanism_of_action": mech.get("mechanism_of_action"), "action_type": mech.get("action_type"), **target})
    return out


# ------------------------------------------------------------------ PubMed
def pubmed_for_nct(nct_id: str, limit: int = 20) -> Optional[list[dict]]:
    """Publications mentioning the NCT ID. Returns None (unknown) when NCBI keeps throttling,
    so one rate-limited trial never discards the results for all others."""
    try:
        return _pubmed_for_nct(nct_id, limit)
    except SourceUnavailable:
        return None


def _pubmed_for_nct(nct_id: str, limit: int) -> list[dict]:
    search = get_json("pubmed", f"{EUTILS}/esearch.fcgi", {"db": "pubmed", "term": nct_id, "retmode": "json", "retmax": limit}, retries=6) or {}
    result = search.get("esearchresult") or {}
    if result.get("errorlist", {}).get("phrasesnotfound"):
        return []
    ids = result.get("idlist") or []
    if not ids:
        return []
    summary = get_json("pubmed", f"{EUTILS}/esummary.fcgi", {"db": "pubmed", "id": ",".join(ids), "retmode": "json"}, retries=6) or {}
    res = summary.get("result") or {}
    pubs = []
    for pmid in ids:
        item = res.get(pmid) or {}
        pubs.append({"pmid": pmid, "title": item.get("title"), "journal": item.get("fulljournalname") or item.get("source"),
                     "pubdate": item.get("pubdate"), "pubtypes": item.get("pubtype") or [],
                     "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"})
    return pubs


# ------------------------------------------------------------------ SEC EDGAR
_SEC_INDEX: Optional[dict[str, list[dict]]] = None


def sec_index() -> dict[str, list[dict]]:
    global _SEC_INDEX
    if _SEC_INDEX is None:
        body = get_json("sec", SEC_TICKERS) or {}
        idx: dict[str, list[dict]] = {}
        for row in body.values():
            idx.setdefault(normalize_name(row["title"]), []).append(row)
        _SEC_INDEX = idx
    return _SEC_INDEX


# Legal-form words that distinguish otherwise identically named companies
# (e.g. Merck KGaA vs Merck & Co.). Suffix stripping must not merge them.
_DISTINCT_FORMS = re.compile(r"\b(kgaa|&\s*co\b|and\s+co\b)", re.I)


def _same_legal_entity(name: str, registrant: str) -> bool:
    a = {m.lower().replace(" ", "").replace("and", "&") for m in _DISTINCT_FORMS.findall(name or "")}
    b = {m.lower().replace(" ", "").replace("and", "&") for m in _DISTINCT_FORMS.findall(registrant or "")}
    return "kgaa" not in (a ^ b)


def sec_issuer(*names: str) -> Optional[dict]:
    """Exact normalized-name match against SEC registrants. If one CIK has several
    share classes, the first listed ticker is primary and all are returned."""
    idx = sec_index()
    for name in names:
        rows = [r for r in idx.get(normalize_name(name or ""), []) if _same_legal_entity(name, r["title"])]
        if not rows:
            continue
        ciks = {r["cik_str"] for r in rows}
        if len(ciks) != 1:
            continue
        return {"cik": f"{rows[0]['cik_str']:010d}", "ticker": rows[0]["ticker"], "tickers": [r["ticker"] for r in rows],
                "sec_registrant_name": rows[0]["title"], "match_name": name, "match_method": "SEC_EXACT_NORMALIZED_NAME"}
    # unique prefix match (e.g. "takeda" -> "takeda pharmaceutical co"), industry names only
    for name in names:
        key = normalize_name(name or "")
        if len(key) < 5:
            continue
        rows = [r for title, rs in idx.items() if title.startswith(key + " ") for r in rs if _same_legal_entity(name, r["title"])]
        ciks = {r["cik_str"] for r in rows}
        if len(ciks) == 1:
            return {"cik": f"{rows[0]['cik_str']:010d}", "ticker": rows[0]["ticker"], "tickers": [r["ticker"] for r in rows],
                    "sec_registrant_name": rows[0]["title"], "match_name": name, "match_method": "SEC_UNIQUE_PREFIX"}
    return None
