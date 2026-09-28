#!/usr/bin/env python3
"""What the posted results say, for every stopped trial that has a page on the site.

A stopped trial's page says why the sponsor stopped it. Some of those trials also posted results,
and for a trial stopped "for futility" the posted primary comparison is the evidence behind the
word. This publishes, per trial, the verdict read by endpoint_outcomes.py together with the
sentence or the numbers it was read from and a link to the results tab — so a reader can check
it without reconstructing it.

The web build folds this into the per-trial shards (web/scripts/generate-data-shards.mjs); a
missing file means the pages simply carry no results panel.

Output: web/public/trial_endpoints.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.universe.endpoint_outcomes import READER_VERSION, evidence_of, load_verdicts, read_on  # noqa: E402

SOURCE = ROOT / "web/public/all_stopped_trials.json"
OUT = ROOT / "web/public/trial_endpoints.json"


def main() -> int:
    verdicts = load_verdicts()
    if not verdicts:
        print("no endpoint outcomes read yet; leaving", OUT.name, "as it is")
        return 0
    stopped = {str(r.get("nct_id") or "").strip().upper() for r in json.loads(SOURCE.read_text())}
    trials = {}
    for nct in sorted(stopped):
        ev = evidence_of(verdicts.get(nct))
        if ev:
            ev.pop("reader_version", None)
            trials[nct] = ev
    OUT.write_text(json.dumps({"read_on": read_on(), "reader_version": READER_VERSION, "trials": trials},
                              ensure_ascii=False, separators=(",", ":")) + "\n")
    tally = {}
    for ev in trials.values():
        tally[ev["verdict"]] = tally.get(ev["verdict"], 0) + 1
    print(json.dumps({"stopped_trials": len(stopped), "with_a_read_result": len(trials), "verdicts": tally}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
