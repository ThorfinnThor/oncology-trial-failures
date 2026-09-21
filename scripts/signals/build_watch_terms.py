#!/usr/bin/env python3
"""Offer watch terms that can actually match something.

A blank box asking for "molecules, targets or sponsors" is a bad ask: people type a term the
dataset has never seen, hear nothing for a month, and conclude the service is broken. So the
subscribe page offers the terms that occur in the dataset, drawn from the same fields the
sender matches against, ranked by how many stopped trials carry them.

Gene symbols are deliberately thinned. A taxane shows up under nine tubulin genes; offering
all nine as separate chips is noise, so only symbols that are not part of a large near-identical
family survive, and mechanisms carry that meaning instead.

  python scripts/signals/build_watch_terms.py    ->  web/data/watch_terms.json
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SIGNALS = ROOT / "product/oncology_failure_signals_v1.jsonl"
OUT = ROOT / "web/data/watch_terms.json"

PER_GROUP = 14
MIN_TRIALS = 3


def distinct(gene_trials: dict[str, set[str]], overlap: float = 0.85) -> set[str]:
    """Drop a gene symbol that selects the trials an already-kept symbol selects.

    A taxane carries nine tubulin genes, so TUBB, TUBB2A, TUBA1A and the rest all point at
    very nearly the same 48 trials. As a watch term they are one term, not nine: whichever is
    picked, the same mail arrives. The largest of each such group is kept and the rest are
    dropped, because a chip that duplicates another chip only makes the choice harder.
    """
    keep: list[tuple[str, set[str]]] = []
    for symbol, trials in sorted(gene_trials.items(), key=lambda kv: (-len(kv[1]), len(kv[0]), kv[0])):
        if not trials:
            continue
        if any(len(trials & kept) >= overlap * len(trials) for _, kept in keep):
            continue
        keep.append((symbol, trials))
    return {symbol for symbol, _ in keep}


def main() -> int:
    if not SIGNALS.exists():
        print(f"no signals dataset at {SIGNALS.relative_to(ROOT)}; nothing to do")
        return 0

    rows = [json.loads(line) for line in SIGNALS.open() if line.strip()]
    assets, genes, mechanisms, sponsors = Counter(), Counter(), Counter(), Counter()
    gene_trials: dict[str, set[str]] = {}
    for row in rows:
        nct = row.get("nct_id") or ""
        for value in row.get("focus_assets") or []:
            assets[value] += 1
        for value in row.get("focus_target_genes") or []:
            genes[value] += 1
            gene_trials.setdefault(value, set()).add(nct)
        for value in row.get("focus_mechanisms") or []:
            mechanisms[value] += 1
        if row.get("sponsor_group"):
            sponsors[row["sponsor_group"]] += 1

    survivors = distinct(gene_trials)
    genes = Counter({g: c for g, c in genes.items() if g in survivors})

    def top(counter: Counter) -> list[dict]:
        return [{"term": term, "trials": count}
                for term, count in counter.most_common(PER_GROUP) if count >= MIN_TRIALS]

    payload = {
        "schema_version": 1,
        "source_trials": len(rows),
        "groups": [
            {"key": "assets", "label": "Molecules", "terms": top(assets)},
            {"key": "targets", "label": "Targets", "terms": top(genes)},
            {"key": "mechanisms", "label": "Mechanisms", "terms": top(mechanisms)},
            {"key": "sponsors", "label": "Sponsors", "terms": top(sponsors)},
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    total = sum(len(g["terms"]) for g in payload["groups"])
    print(f"{OUT.relative_to(ROOT)}: {total} suggested terms from {len(rows)} trials")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
