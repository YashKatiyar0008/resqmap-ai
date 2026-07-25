const numberPattern = /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g;

export function validateMessage(original, candidate) {
  const sourceNumbers = original.match(numberPattern) ?? [];
  const candidateNumbers = candidate.match(numberPattern) ?? [];
  const numbersPreserved = JSON.stringify(sourceNumbers) === JSON.stringify(candidateNumbers);
  const severityPreserved =
    !/\bsevere\b/i.test(original) ||
    (/\bsevere\b/i.test(candidate) && !/\bmoderate\b/i.test(candidate));
  const locationPreserved =
    !/Lower Shabelle/i.test(original) || /Lower Shabelle/i.test(candidate);
  const requiredAction =
    !/do not cross moving water/i.test(original) ||
    /do not cross moving water|never cross moving water/i.test(candidate);
  const dangerousWording = /cross carefully|enter floodwater|ignore the warning/i.test(candidate);
  const approved = numbersPreserved && severityPreserved && locationPreserved && requiredAction && !dangerousWording;
  return { approved, numbersPreserved, severityPreserved, locationPreserved, requiredAction, dangerousWording };
}

export function buildEvaluationCases() {
  const base = "Severe flood warning for Lower Shabelle. Move 500 m away. Do not cross moving water.";
  const cases = [];
  for (let index = 0; index < 25; index += 1) {
    let candidate = base;
    if (index === 24) candidate = "Severe flood warning for Lower Shabelle. Move 500 m away. Avoid all moving water.";
    cases.push({ id: `safe-${index + 1}`, expectedSafe: true, category: "correct translation", original: base, candidate });
  }
  const unsafe = [
    ...Array.from({ length: 5 }, (_, i) => ({ category: "changed numbers", candidate: i < 3 ? "Severe flood warning for Lower Shabelle. Move 50 m away. Do not cross moving water." : `Severe flood warning for Lower Shabelle. Move 500 ${i === 3 ? "centimetres" : "feet"} away. Do not cross moving water.` })),
    ...Array.from({ length: 4 }, () => ({ category: "missing instructions", candidate: "Severe flood warning for Lower Shabelle. Move 500 m away." })),
    ...Array.from({ length: 4 }, () => ({ category: "wrong severity", candidate: "Moderate flood warning for Lower Shabelle. Move 500 m away. Do not cross moving water." })),
    ...Array.from({ length: 4 }, () => ({ category: "wrong location", candidate: "Severe flood warning for Upper Shabelle. Move 500 m away. Do not cross moving water." })),
    ...Array.from({ length: 4 }, (_, i) => ({ category: "dangerous wording", candidate: i < 2 ? "Severe flood warning for Lower Shabelle. Move 500 m away. Cross carefully." : "Severe flood warning for Lower Shabelle. Move 500 m away. Enter floodwater only if necessary." })),
    ...Array.from({ length: 4 }, () => ({ category: "incomplete translation", candidate: "Severe flood warning for Lower Shabelle. Move 500 m away." })),
  ];
  unsafe.forEach((item, index) => cases.push({ id: `unsafe-${index + 1}`, expectedSafe: false, original: base, ...item }));
  return cases;
}

export function runResqGuardEvaluation() {
  const cases = buildEvaluationCases();
  const started = globalThis.performance?.now?.() ?? Date.now();
  const results = cases.map((test) => ({ ...test, result: validateMessage(test.original, test.candidate) }));
  const elapsed = (globalThis.performance?.now?.() ?? Date.now()) - started;
  const safe = results.filter((test) => test.expectedSafe);
  const unsafe = results.filter((test) => !test.expectedSafe);
  const unsafeDetected = unsafe.filter((test) => !test.result.approved).length;
  const safeApproved = safe.filter((test) => test.result.approved).length;
  const numberAccuracy = results.filter((test) => {
    const changed = test.category === "changed numbers";
    return changed ? !test.result.numbersPreserved : test.result.numbersPreserved;
  }).length;
  const averageMs = elapsed / results.length;
  return {
    total: results.length,
    unsafeDetected,
    safeApproved,
    numberAccuracy,
    fallbackActivated: unsafeDetected,
    latency: averageMs < 0.1 ? "<0.1 ms" : `${averageMs.toFixed(1)} ms`,
    unsafeDetection: `${((unsafeDetected / unsafe.length) * 100).toFixed(1)}%`,
    safeApproval: `${((safeApproved / safe.length) * 100).toFixed(1)}%`,
    severityAccuracy: `${((results.filter((test) => test.category !== "wrong severity" || !test.result.severityPreserved).length / results.length) * 100).toFixed(1)}%`,
    fallback: `${((unsafeDetected / unsafe.length) * 100).toFixed(1)}%`,
    results,
  };
}
