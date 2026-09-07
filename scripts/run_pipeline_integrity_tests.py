#!/usr/bin/env python3
"""Offline pipeline regressions; all generated files stay in a temporary directory."""

from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import enrich_classification_context_v2 as context
from scripts import ingest_changes
from scripts.reclassify_dataset_v2 import classify_rows


class PipelineIntegrityTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.snapshot = self.directory / "current.json"
        self.proposals = self.directory / "proposals.json"
        self.index = self.directory / "index.json"
        self.baseline = self.directory / "previous.json"
        self.report = self.directory / "changes.json"
        self.write(self.index, {"entries": {}})
        self.row = {"nct_id": "NCT00000001", "why_stopped": ""}
        self.efficacy = self.protocol("lack of efficacy")
        self.recruitment = self.protocol("poor recruitment")
        self.original = context.proposal_for(self.row, self.efficacy, {})
        assert self.original is not None
        self.original["reviewer_notes"] = "Preserve this provenance."
        self.write(self.proposals, {"proposal_count": 1, "proposals": [self.original]})

    @staticmethod
    def write(path: Path, payload: object) -> None:
        path.write_text(json.dumps(payload), encoding="utf-8")

    @staticmethod
    def read(path: Path):
        return json.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    def protocol(cause: str) -> dict:
        return {
            "statusModule": {"whyStopped": ""},
            "descriptionModule": {
                "detailedDescription": f"The study was terminated due to {cause}."
            },
        }

    def refresh(self, registry: dict, expected_ids: list[str] | None = None) -> None:
        args = [
            "context", "--refresh-existing", "--write",
            "--input", str(self.snapshot), "--proposals", str(self.proposals),
            "--reviewed-index", str(self.index),
        ]
        with patch.object(sys, "argv", args), patch.object(
            context, "request_batch", return_value=registry
        ) as request, patch.object(context.time, "sleep"):
            context.main()
        requested = [nct for call in request.call_args_list for nct in call.args[1]]
        self.assertEqual(sorted(requested), sorted(registry if expected_ids is None else expected_ids))

    def rebuild_report(self, previous: Path | None) -> None:
        args = [
            "ingest_changes", "--current", str(self.snapshot),
            "--output", str(self.report),
        ]
        if previous is not None:
            args.extend(["--previous", str(previous)])
        with patch.object(sys, "argv", args):
            ingest_changes.main()

    def test_absent_proposal_is_preserved_across_refreshes_and_not_applied(self) -> None:
        self.write(self.snapshot, [])
        self.refresh({})
        payload = self.read(self.proposals)
        self.assertEqual(payload["proposals"], [])
        self.assertEqual(payload["proposal_count"], 0)
        inactive = payload["inactive_proposals"]
        self.assertEqual(len(inactive), 1)
        self.assertEqual(inactive[0]["proposal"], self.original)
        self.assertEqual(inactive[0]["reason"], "ABSENT_FROM_SNAPSHOT")
        self.refresh({})
        self.assertEqual(self.read(self.proposals)["inactive_proposals"], inactive)
        # Even if the trial returns, apply-existing must not resurrect archived fields.
        self.write(self.snapshot, [self.row])
        with patch.object(sys, "argv", [
            "context", "--apply-existing", "--input", str(self.snapshot),
            "--proposals", str(self.proposals),
        ]):
            context.main()
        self.assertEqual(self.read(self.snapshot), [self.row])

    def test_returning_trial_is_reclassified_from_live_context(self) -> None:
        self.write(self.snapshot, [])
        self.refresh({})
        self.write(self.snapshot, [self.row])
        self.refresh({self.row["nct_id"]: self.recruitment})
        payload = self.read(self.proposals)
        self.assertEqual(payload["proposal_count"], 1)
        self.assertEqual(payload["proposals"][0]["proposed_primary_reason_v2"], "RECRUITMENT")
        self.assertEqual(self.read(self.snapshot)[0]["classification_reason"], "OPERATIONAL")
        self.assertEqual(payload["inactive_proposals"][0]["proposal"], self.original)

    def test_absent_trial_does_not_prevent_refreshing_present_trial(self) -> None:
        absent = copy.deepcopy(self.original)
        absent["nct_id"] = "NCT00000002"
        self.write(self.proposals, {"proposals": [self.original, absent]})
        self.write(self.snapshot, [self.row])
        self.refresh({self.row["nct_id"]: self.recruitment})
        payload = self.read(self.proposals)
        self.assertEqual(payload["proposal_count"], 1)
        self.assertEqual(payload["proposals"][0]["nct_id"], self.row["nct_id"])
        self.assertEqual(payload["inactive_proposal_count"], 1)
        self.assertEqual(payload["inactive_proposals"][0]["proposal"], absent)
        self.assertEqual(self.read(self.snapshot)[0]["classification_reason"], "OPERATIONAL")

    def test_missing_registry_response_archives_evidence_without_applying_it(self) -> None:
        self.write(self.snapshot, [{**self.row, **self.original["record_fields"]}])
        self.refresh({}, expected_ids=[self.row["nct_id"]])
        payload = self.read(self.proposals)
        self.assertEqual(payload["missing_registry_count"], 1)
        self.assertEqual(payload["proposals"], [])
        self.assertEqual(payload["inactive_proposals"][0]["reason"], "REGISTRY_CONTEXT_UNAVAILABLE")
        self.assertEqual(payload["inactive_proposals"][0]["proposal"], self.original)
        rows, _, _ = classify_rows(self.read(self.snapshot), {})
        self.assertTrue(rows[0]["classification_needs_review"])

    def test_no_longer_supported_proposal_keeps_history_and_releases_classification(self) -> None:
        self.write(self.snapshot, [{**self.row, **self.original["record_fields"]}])
        self.refresh({self.row["nct_id"]: {"statusModule": {"whyStopped": ""}}})
        payload = self.read(self.proposals)
        self.assertEqual(payload["proposals"], [])
        self.assertEqual(payload["inactive_proposals"][0]["proposal"], self.original)
        rows, _, _ = classify_rows(self.read(self.snapshot), {})
        self.assertTrue(rows[0]["classification_needs_review"])

    def test_report_uses_final_context_and_unchanged_previous_snapshot(self) -> None:
        previous = {**self.row, **self.original["record_fields"]}
        removed = {**previous, "nct_id": "NCT00000003"}
        self.write(self.baseline, [previous, removed])
        baseline_bytes = self.baseline.read_bytes()
        added = {**previous, "nct_id": "NCT00000002"}
        added_proposal = copy.deepcopy(self.original)
        added_proposal["nct_id"] = added["nct_id"]
        self.write(self.proposals, {"proposals": [self.original, added_proposal]})
        self.write(self.snapshot, [previous, added])
        provisional = ingest_changes.build_ingest_change_report([previous, removed], [previous, added])
        self.assertEqual(provisional["summary"]["new_scientific_signals"], 1)
        self.refresh({row["nct_id"]: self.recruitment for row in [previous, added]})
        final, _, _ = classify_rows(self.read(self.snapshot), {})
        self.write(self.snapshot, final)
        self.rebuild_report(self.baseline)
        report = self.read(self.report)
        self.assertEqual(report["summary"]["new_scientific_signals"], 0)
        self.assertEqual(report["summary"]["classification_changes"], 1)
        self.assertEqual(report["summary"]["removed_records"], 1)
        for group in ("new_records", "updated_records", "classification_changes"):
            self.assertEqual(report[group][0]["classification_reason"], "OPERATIONAL")
        self.assertEqual(report["classification_changes"][0]["previous_classification_reason"], "EFFICACY/FUTILITY")
        self.assertEqual(self.baseline.read_bytes(), baseline_bytes)

    def test_report_distinguishes_bootstrap_from_empty_baseline(self) -> None:
        self.write(self.snapshot, [self.row])
        self.rebuild_report(None)
        self.assertFalse(self.read(self.report)["has_previous_snapshot"])
        self.assertEqual(self.read(self.report)["summary"]["new_records"], 0)
        self.write(self.baseline, [])
        self.rebuild_report(self.baseline)
        self.assertTrue(self.read(self.report)["has_previous_snapshot"])
        self.assertEqual(self.read(self.report)["summary"]["new_records"], 1)

    def test_bad_baseline_does_not_replace_report(self) -> None:
        self.write(self.snapshot, [])
        self.write(self.report, {"sentinel": True})
        with self.assertRaises(FileNotFoundError):
            self.rebuild_report(self.baseline)
        self.write(self.baseline, {})
        with self.assertRaises(ValueError):
            self.rebuild_report(self.baseline)
        self.assertEqual(self.read(self.report), {"sentinel": True})

    def test_report_cannot_overwrite_its_baseline(self) -> None:
        self.write(self.snapshot, [])
        self.write(self.baseline, [self.row])
        baseline_bytes = self.baseline.read_bytes()
        self.report = self.baseline
        with self.assertRaises(ValueError):
            self.rebuild_report(self.baseline)
        self.assertEqual(self.baseline.read_bytes(), baseline_bytes)


if __name__ == "__main__":
    unittest.main(buffer=True)
