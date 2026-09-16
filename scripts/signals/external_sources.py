"""Source-backed enrichment: ChEMBL (assets, mechanisms, targets), PubMed (NCT-linked
publications) and SEC EDGAR (issuer ticker/CIK). Exact matches only; ambiguity -> no match."""
from __future__ import annotations

import re
from typing import Optional

from scripts.signals.http_cache import get_json
from scripts.signals.sponsors import normalize_name

CHEMBL = "https://www.ebi.ac.uk/chembl/api/data"
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
SEC_TICKERS = "https://www.sec.gov/files/company_tickers.json"
MOLECULE_FIELDS = "molecule_chembl_id,pref_name,max_phase,molecule_type,first_approval,molecule_hierarchy"


def _norm(term: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (term or "").lower())


# ------------------------------------------------------------------ ChEMBL
def chembl_molecule(term: str) -> Optional[dict]:
    """Exact (case-insensitive) match on preferred name or synonym. Returns None
    if no match or if the term maps to more than one distinct parent molecule."""
    term = (term or "").strip()
    if len(_norm(term)) < 4:
        return None
    variants = [term] + sorted({term.replace(" ", "-"), term.replace("-", ""), term.replace("-", " ")} - {term})
    hits: dict[str, dict] = {}
    for v in variants:
        for field in ("molecule_synonyms__molecule_synonym__iexact", "pref_name__iexact"):
            body = get_json("chembl", f"{CHEMBL}/molecule.json", {field: v, "only": MOLECULE_FIELDS, "limit": 5}) or {}
            for m in body.get("molecules") or []:
                hits[m["molecule_chembl_id"]] = m
            if hits:
                break
        if hits:
            break
    parents: dict[str, dict] = {}
    for m in hits.values():
        parent_id = ((m.get("molecule_hierarchy") or {}).get("parent_chembl_id")) or m["molecule_chembl_id"]
        if parent_id != m["molecule_chembl_id"]:
            parent = get_json("chembl", f"{CHEMBL}/molecule/{parent_id}.json", {"only": MOLECULE_FIELDS}) or m
        else:
            parent = m
        parents[parent_id] = parent
    if len(parents) != 1:
        return None
    return next(iter(parents.values()))


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
def pubmed_for_nct(nct_id: str, limit: int = 20) -> list[dict]:
    search = get_json("pubmed", f"{EUTILS}/esearch.fcgi", {"db": "pubmed", "term": nct_id, "retmode": "json", "retmax": limit}) or {}
    result = search.get("esearchresult") or {}
    if result.get("errorlist", {}).get("phrasesnotfound"):
        return []
    ids = result.get("idlist") or []
    if not ids:
        return []
    summary = get_json("pubmed", f"{EUTILS}/esummary.fcgi", {"db": "pubmed", "id": ",".join(ids), "retmode": "json"}) or {}
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


def sec_issuer(*names: str) -> Optional[dict]:
    """Exact normalized-name match against SEC registrants. If one CIK has several
    share classes, the first listed ticker is primary and all are returned."""
    idx = sec_index()
    for name in names:
        rows = idx.get(normalize_name(name or ""))
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
        rows = [r for title, rs in idx.items() if title.startswith(key + " ") for r in rs]
        ciks = {r["cik_str"] for r in rows}
        if len(ciks) == 1:
            return {"cik": f"{rows[0]['cik_str']:010d}", "ticker": rows[0]["ticker"], "tickers": [r["ticker"] for r in rows],
                    "sec_registrant_name": rows[0]["title"], "match_name": name, "match_method": "SEC_UNIQUE_PREFIX"}
    return None
