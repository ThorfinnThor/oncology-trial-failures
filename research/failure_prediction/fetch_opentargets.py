"""Feasibility study, step 1b: genetic evidence for each trial's target-indication pairs from the
Open Targets Platform GraphQL API (public, documented).

For every labelled trial whose experimental drug resolved to target genes:
  MeSH condition terms -> Open Targets disease IDs (mapIds)
  gene symbols         -> Ensembl IDs (mapIds)
  (disease, gene)      -> association datatype scores, with indirect (ontology) evidence

Only the datatypes that do not encode clinical outcomes are kept: genetic_association,
somatic_mutation, animal_model, affected_pathway, rna_expression. "known_drug" (ChEMBL clinical
precedence) would leak trial results into the feature, and "literature" mixes everything.

Caveat: this is the September 2026 release, not the evidence as it stood when each trial started.
"""
from __future__ import annotations

import gzip
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

import truststore

truststore.inject_into_ssl()
import pandas as pd  # noqa: E402
import requests  # noqa: E402

UNIVERSE = Path(sys.argv[1])
TRIALS = Path(sys.argv[2])
CACHE = Path(sys.argv[3])
API = "https://api.platform.opentargets.org/api/v4/graphql"
KEEP = {"genetic_association", "somatic_mutation", "animal_model", "affected_pathway", "rna_expression"}
session = requests.Session()


def gql(query: str, variables: dict) -> dict:
    for attempt in range(5):
        try:
            r = session.post(API, json={"query": query, "variables": variables}, timeout=90)
            if r.status_code == 200:
                body = r.json()
                if "errors" not in body:
                    return body["data"]
                print("graphql error", body["errors"][:1], file=sys.stderr)
                return {}
        except requests.RequestException as e:
            print("retry", attempt, e, file=sys.stderr)
        time.sleep(2 ** attempt)
    return {}


def load(name: str) -> dict:
    p = CACHE / name
    return json.loads(p.read_text()) if p.exists() else {}


def save(name: str, data: dict) -> None:
    (CACHE / name).write_text(json.dumps(data))


def map_terms(terms: list[str], entity: str, cache_name: str) -> dict:
    done = load(cache_name)
    todo = [t for t in terms if t not in done]
    q = "query($t:[String!]!,$e:[String!]){ mapIds(queryTerms:$t, entityNames:$e){ mappings { term hits { id score } } } }"
    for i in range(0, len(todo), 100):
        chunk = todo[i:i + 100]
        data = gql(q, {"t": chunk, "e": [entity]})
        found = {m["term"]: [h["id"] for h in m["hits"] if h["score"] >= 0.75][:1]
                 for m in (data.get("mapIds") or {}).get("mappings", [])}
        for t in chunk:
            done[t] = found.get(t, [])
        save(cache_name, done)
        time.sleep(0.3)
    return done


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    df = pd.read_pickle(TRIALS)
    wanted = set(df[(df.label_a.notna() | df.label_b.notna()) & df.targets.map(bool)].nct_id)

    trial_mesh, trial_genes = {}, {}
    with gzip.open(UNIVERSE, "rt") as fh:
        for line in fh:
            r = json.loads(line)
            if r["nct_id"] in wanted:
                trial_mesh[r["nct_id"]] = sorted({m.strip() for m in r.get("mesh_terms") or [] if m.strip()})
                trial_genes[r["nct_id"]] = sorted(set(r.get("experimental_target_genes") or []))

    mesh_map = map_terms(sorted({m for v in trial_mesh.values() for m in v}), "disease", "mesh_to_disease.json")
    gene_map = map_terms(sorted({g for v in trial_genes.values() for g in v}), "target", "gene_to_ensembl.json")
    print(f"mapped {sum(bool(v) for v in mesh_map.values())}/{len(mesh_map)} MeSH terms, "
          f"{sum(bool(v) for v in gene_map.values())}/{len(gene_map)} genes")

    pairs = defaultdict(set)
    for nct, terms in trial_mesh.items():
        ens = {e for g in trial_genes[nct] for e in gene_map.get(g, [])}
        for t in terms:
            for d in mesh_map.get(t, []):
                pairs[d].update(ens)

    assoc = load("associations.json")
    q = ("query($d:String!,$b:[String!]){ disease(efoId:$d){ associatedTargets(Bs:$b, enableIndirect:true, page:{index:0,size:500})"
         "{ rows { target{ id } datatypeScores{ id score } } } } }")
    todo = [d for d in pairs if d not in assoc and pairs[d]]
    for n, d in enumerate(todo, 1):
        data = gql(q, {"d": d, "b": sorted(pairs[d])})
        rows = (((data.get("disease") or {}).get("associatedTargets") or {}).get("rows")) or []
        assoc[d] = {r["target"]["id"]: {s["id"]: s["score"] for s in r["datatypeScores"] if s["id"] in KEEP}
                    for r in rows}
        if n % 50 == 0:
            save("associations.json", assoc)
            print(f"  associations {n}/{len(todo)}", flush=True)
        time.sleep(0.25)
    save("associations.json", assoc)

    out = {}
    for nct in trial_mesh:
        ens = {e for g in trial_genes[nct] for e in gene_map.get(g, [])}
        diseases = {d for t in trial_mesh[nct] for d in mesh_map.get(t, [])}
        best = {k: 0.0 for k in KEEP}
        for d in diseases:
            for e in ens:
                for k, v in (assoc.get(d, {}).get(e) or {}).items():
                    best[k] = max(best[k], v)
        out[nct] = {"ot_mapped": int(bool(diseases) and bool(ens)), **{f"ot_{k}": v for k, v in best.items()}}
    save("trial_features.json", out)
    mapped = sum(v["ot_mapped"] for v in out.values())
    gen = sum(v["ot_genetic_association"] > 0 for v in out.values())
    print(f"trials {len(out):,}; mapped disease and target {mapped:,}; with genetic support {gen:,}")


main()
