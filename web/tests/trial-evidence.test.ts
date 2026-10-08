import assert from "node:assert/strict";
import test from "node:test";

import {
  descriptionFallbackEvidence,
  isDetailedDescriptionPlaceholder,
  resolveTrialStopEvidence,
} from "../lib/trialEvidence";

test("recognizes both ClinicalTrials.gov detailed-description placeholders", () => {
  assert.equal(isDetailedDescriptionPlaceholder("See termination reason in detailed description."), true);
  assert.equal(isDetailedDescriptionPlaceholder("See detailed description for termination reason"), true);
  assert.equal(isDetailedDescriptionPlaceholder("Stopped for futility"), false);
});

test("extracts the retained detailed-description sentence", () => {
  assert.equal(
    descriptionFallbackEvidence(
      "v=2.7.1;outcome=BIOLOGICAL_FAILURE;source.description_fallback:the study stopped when futility criteria were met."
    ),
    "The study stopped when futility criteria were met."
  );
});

test("replaces a placeholder with detailed-description evidence", () => {
  assert.deepEqual(
    resolveTrialStopEvidence({
      nct_id: "NCT99999999",
      why_stopped_short: "See termination reason in detailed description.",
      classification_source: "DESCRIPTION_FALLBACK",
      classification_evidence:
        "v=2.7.1;outcome=BIOLOGICAL_FAILURE;source.description_fallback:the study was stopped after an interim futility analysis.",
    }),
    {
      text: "The study was stopped after an interim futility analysis.",
      source: "registry_detailed_description",
      placeholder: true,
    }
  );
});

test("preserves an ordinary registry stop reason", () => {
  assert.deepEqual(
    resolveTrialStopEvidence({
      nct_id: "NCT99999998",
      why_stopped_short: "Stopped for futility.",
      classification_source: "RULE_V2",
      classification_evidence: "v=2.7.1;outcome=BIOLOGICAL_FAILURE;primary=EFFICACY_FUTILITY",
    }),
    {
      text: "Stopped for futility.",
      source: "registry_stop_reason",
      placeholder: false,
    }
  );
});

test("does not publish a placeholder when no detailed evidence is retained", () => {
  assert.deepEqual(
    resolveTrialStopEvidence({
      nct_id: "NCT99999997",
      why_stopped_short: "See termination reason in detailed description.",
      classification_source: "DESCRIPTION_FALLBACK",
      classification_evidence: "v=2.7.1;outcome=BIOLOGICAL_FAILURE",
    }),
    { text: "", source: "missing", placeholder: true }
  );
});

test("uses the complete verified source text when classifier evidence was truncated", () => {
  const evidence = resolveTrialStopEvidence({
    nct_id: "NCT01145417",
    why_stopped_short: "See termination reason in detailed description.",
    classification_source: "DESCRIPTION_FALLBACK",
    classification_evidence:
      "source.description_fallback:the parent double blind study was stopped at interim analysis due to lack of efficacy and therefore this open label extension study was also terminated simultaneously on april 2, 2",
  });

  assert.match(evidence.text, /April 2, 2012/);
  assert.match(evidence.text, /unrelated to any safety findings/);
  assert.equal(evidence.source, "registry_detailed_description");
});

test("recovers verified detailed-description evidence when whyStopped is empty", () => {
  const evidence = resolveTrialStopEvidence({
    nct_id: "NCT01965600",
    why_stopped_short: "",
    classification_source: "DESCRIPTION_FALLBACK",
    classification_evidence: "source.description_fallback:truncated",
  });

  assert.match(evidence.text, /safety concerns regarding the administration of endotoxin/);
  assert.equal(evidence.source, "registry_detailed_description");
  assert.equal(evidence.placeholder, false);
});
