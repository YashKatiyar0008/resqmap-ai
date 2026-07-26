import assert from "node:assert/strict";
import test from "node:test";
import { buildEvaluationCases, runResqGuardEvaluation, validateMessage } from "../lib/resqguard.mjs";

test("runs the complete 72-message labelled evaluation set", () => {
  const cases = buildEvaluationCases();
  assert.equal(cases.length, 72);
  assert.equal(cases.filter((item) => item.expectedSafe).length, 24);
  assert.equal(cases.filter((item) => !item.expectedSafe).length, 48);
  assert.equal(new Set(cases.map((item) => item.language)).size, 3);
  assert.equal(new Set(cases.filter((item) => !item.expectedSafe).map((item) => item.category)).size, 8);
});

test("reports measured prototype results for the labelled set", () => {
  const result = runResqGuardEvaluation();
  assert.equal(result.unsafeDetected, 48);
  assert.equal(result.safeApproved, 22);
  assert.equal(result.numberAccuracy, 69);
  assert.equal(result.severityCorrect, 72);
  assert.equal(result.fallbackActivated, 48);
});

test("preserves multilingual severity vocabulary", () => {
  const severeVariants = [
    "Orange alert flood warning for Lower Shabelle. Move 500 m away. Do not cross moving water.",
    "Tahadhari ya machungwa ya mafuriko kwa Lower Shabelle. Ondoka 500 m. Usivuke maji yanayotiririka.",
    "Digniin oranji oo daad ah oo ku socota Shabeellaha Hoose. Ka fogow 500 m. Ha gudbin biyaha socda.",
  ];
  for (const candidate of severeVariants) {
    const result = validateMessage(
      "Severe flood warning for Lower Shabelle. Move 500 m away. Do not cross moving water.",
      candidate,
    );
    assert.equal(result.severityPreserved, true);
  }
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
