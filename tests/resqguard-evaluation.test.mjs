import assert from "node:assert/strict";
import test from "node:test";
import { buildEvaluationCases, runResqGuardEvaluation, validateMessage } from "../lib/resqguard.mjs";

test("runs the complete 50-message labelled evaluation set", () => {
  const cases = buildEvaluationCases();
  assert.equal(cases.length, 50);
  assert.equal(cases.filter((item) => item.expectedSafe).length, 25);
  assert.equal(cases.filter((item) => !item.expectedSafe).length, 25);
});

test("reports measured prototype results including known misses", () => {
  const result = runResqGuardEvaluation();
  assert.equal(result.unsafeDetected, 23);
  assert.equal(result.safeApproved, 24);
  assert.equal(result.numberAccuracy, 48);
  assert.equal(result.fallbackActivated, 23);
});

test("explains the headline unsafe translation", () => {
  const result = validateMessage(
    "Severe flood warning for Lower Shabelle. Move 500 m away. Do not cross moving water.",
    "Moderate flood warning for Lower Shabelle. Move 50 m away. Stay alert.",
  );
  assert.equal(result.approved, false);
  assert.equal(result.numbersPreserved, false);
  assert.equal(result.severityPreserved, false);
  assert.equal(result.requiredAction, false);
});
