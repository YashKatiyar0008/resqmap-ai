const numberPattern = /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g;
const unitPattern = /\b(?:m|metre|metres|meter|meters|km|kilometre|kilometres|kilometer|kilometers|ft|feet|foot|yards?|steps?)\b/gi;

const severityLexicon = [
  {
    level: "critical",
    terms: [
      "critical", "red", "red alert",
      "hatari sana", "tahadhari nyekundu", "nyekundu",
      "halis aad u daran", "digniin cas", "cas",
    ],
  },
  {
    level: "severe",
    terms: [
      "severe", "high", "orange", "orange alert",
      "kali", "hatari kubwa", "tahadhari ya machungwa", "machungwa",
      "daran", "khatar sare", "digniin oranji", "oranji",
    ],
  },
  {
    level: "moderate",
    terms: [
      "moderate", "yellow", "yellow alert",
      "wastani", "tahadhari ya njano", "njano",
      "dhexdhexaad", "digniin jaalle", "jaalle",
    ],
  },
  {
    level: "low",
    terms: [
      "low", "green", "green alert",
      "chini", "tahadhari ya kijani", "kijani",
      "hoose", "digniin cagaar", "cagaar",
    ],
  },
];

const locationAliases = [
  ["Lower Shabelle", "lower shabelle", "shabeellaha hoose", "shabelle hoose"],
  ["Marsabit", "marsabit"],
  ["Hawassa", "hawassa", "awassa"],
  ["Nairobi", "nairobi"],
];

const hazardAliases = [
  ["flood", "flood", "flooding", "mafuriko", "daad", "fatahaad"],
  ["drought", "drought", "ukame", "abaar"],
  ["earthquake", "earthquake", "tetemeko", "dhul gariir", "dhulgariir"],
];

const requiredActionPatterns = [
  /do not cross moving water/i,
  /never cross moving water/i,
  /avoid crossing moving water/i,
  /usivuke maji yanayotiririka/i,
  /usivuke maji yanayosonga/i,
  /ha gudbin biyaha socda/i,
  /ha ka gudbin biyaha socda/i,
];

const dangerousPattern = /cross carefully|enter floodwater|ignore the warning|drive through floodwater|swim across|gudub si tartiib|puuza onyo|ingia kwenye maji/i;

function normalise(value) {
  return String(value).toLowerCase().replace(/[^\p{L}\p{N}\s.]/gu, " ").replace(/\s+/g, " ").trim();
}

function extractNumbers(value) {
  return value.match(numberPattern) ?? [];
}

function extractUnits(value) {
  return Array.from(value.matchAll(unitPattern), (match) => match[0].toLowerCase())
    .map((unit) => {
      if (["m", "metre", "metres", "meter", "meters"].includes(unit)) return "m";
      if (["km", "kilometre", "kilometres", "kilometer", "kilometers"].includes(unit)) return "km";
      if (["ft", "feet", "foot"].includes(unit)) return "ft";
      if (unit.startsWith("yard")) return "yd";
      if (unit.startsWith("step")) return "steps";
      return unit;
    });
}

function extractSeverityLevels(value) {
  const text = normalise(value);
  return new Set(severityLexicon.flatMap(({ level, terms }) => (
    terms.some((term) => {
      const escaped = normalise(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|\\s)${escaped}(\\s|$)`, "u").test(text);
    }) ? [level] : []
  )));
}

function preserveAliasGroup(original, candidate, groups) {
  const sourceText = normalise(original);
  const candidateText = normalise(candidate);
  const sourceGroups = groups.filter(([, ...aliases]) => aliases.some((alias) => sourceText.includes(normalise(alias))));
  return sourceGroups.every(([, ...aliases]) => aliases.some((alias) => candidateText.includes(normalise(alias))));
}

export function validateMessage(original, candidate) {
  const sourceNumbers = extractNumbers(original);
  const candidateNumbers = extractNumbers(candidate);
  const sourceUnits = extractUnits(original);
  const candidateUnits = extractUnits(candidate);
  const sourceSeverity = extractSeverityLevels(original);
  const candidateSeverity = extractSeverityLevels(candidate);
  const needsRequiredAction = /do not cross moving water/i.test(original);
  const numbersPreserved = JSON.stringify(sourceNumbers) === JSON.stringify(candidateNumbers);
  const unitsPreserved = JSON.stringify(sourceUnits) === JSON.stringify(candidateUnits);
  const severityPreserved = [...sourceSeverity].every((level) => candidateSeverity.has(level)) && sourceSeverity.size === candidateSeverity.size;
  const locationPreserved = preserveAliasGroup(original, candidate, locationAliases);
  const hazardPreserved = preserveAliasGroup(original, candidate, hazardAliases);
  const requiredAction = !needsRequiredAction || requiredActionPatterns.some((pattern) => pattern.test(candidate));
  const dangerousWording = dangerousPattern.test(candidate);
  const approved = numbersPreserved && unitsPreserved && severityPreserved && locationPreserved && hazardPreserved && requiredAction && !dangerousWording;
  return { approved, numbersPreserved, unitsPreserved, severityPreserved, locationPreserved, hazardPreserved, requiredAction, dangerousWording };
}

export function buildEvaluationCases() {
  const base = "Severe flood warning for Lower Shabelle. Move 500 m away. Do not cross moving water.";
  const safe = [
    ["en-safe-01", "English", "correct translations", "Severe flood warning for Lower Shabelle. Move 500 m away. Do not cross moving water."],
    ["en-safe-02", "English", "correct translations", "Orange alert flood warning for Lower Shabelle. Move 500 m away. Do not cross moving water."],
    ["en-safe-03", "English", "correct translations", "High flood warning for Lower Shabelle. Move 500 m away. Never cross moving water."],
    ["en-safe-04", "English", "correct translations", "Severe flood warning for Lower Shabelle. Move 500 metres away. Avoid crossing moving water."],
    ["en-safe-05", "English", "correct translations", "Severe flooding warning for Lower Shabelle. Move 500 m away. Do not cross moving water."],
    ["en-safe-06", "English", "correct translations", "Severe flood warning for Lower Shabelle. Move 500 m away. Do not cross moving water."],
    ["en-safe-07", "English", "correct translations", "Orange alert flood warning for Lower Shabelle. Move 500 meters away. Do not cross moving water."],
    ["en-safe-08", "English", "correct translations", "Severe flood warning for Lower Shabelle. Move 500 m away. Keep clear of floodwater."],
    ["sw-safe-01", "Kiswahili", "correct translations", "Tahadhari ya mafuriko kali kwa Lower Shabelle. Sogea umbali wa 500 m. Usivuke maji yanayotiririka."],
    ["sw-safe-02", "Kiswahili", "correct translations", "Tahadhari ya machungwa ya mafuriko kwa Lower Shabelle. Ondoka 500 m. Usivuke maji yanayotiririka."],
    ["sw-safe-03", "Kiswahili", "correct translations", "Hatari kubwa ya mafuriko kwa Lower Shabelle. Sogea 500 m mbali. Usivuke maji yanayosonga."],
    ["sw-safe-04", "Kiswahili", "correct translations", "Onyo kali la mafuriko kwa Lower Shabelle. Kaa 500 metres mbali. Usivuke maji yanayotiririka."],
    ["sw-safe-05", "Kiswahili", "correct translations", "Mafuriko kali Lower Shabelle. Sogea 500 m kutoka eneo la mto. Usivuke maji yanayotiririka."],
    ["sw-safe-06", "Kiswahili", "correct translations", "Tahadhari kali ya mafuriko Lower Shabelle. Ondoka 500 meters. Usivuke maji yanayotiririka."],
    ["sw-safe-07", "Kiswahili", "correct translations", "Tahadhari ya machungwa kwa mafuriko Lower Shabelle. Sogea 500 m. Usivuke maji yanayotiririka."],
    ["sw-safe-08", "Kiswahili", "correct translations", "Hatari kubwa ya mafuriko Lower Shabelle. Ondoka 500 m. Usivuke maji yanayosonga."],
    ["so-safe-01", "Somali", "correct translations", "Digniin daad daran oo ku socota Shabeellaha Hoose. Ka fogow 500 m. Ha gudbin biyaha socda."],
    ["so-safe-02", "Somali", "correct translations", "Digniin oranji oo daad ah oo ku socota Shabeellaha Hoose. Ka fogow 500 m. Ha gudbin biyaha socda."],
    ["so-safe-03", "Somali", "correct translations", "Khatar sare oo daad ah Shabeellaha Hoose. Ka fogow 500 metres. Ha ka gudbin biyaha socda."],
    ["so-safe-04", "Somali", "correct translations", "Digniin daad daran Lower Shabelle. Ka fogow 500 m. Ha gudbin biyaha socda."],
    ["so-safe-05", "Somali", "correct translations", "Daad daran ayaa laga digayaa Shabeellaha Hoose. Ka fogow 500 meters. Ha gudbin biyaha socda."],
    ["so-safe-06", "Somali", "correct translations", "Digniin oranji oo fatahaad ah Shabeellaha Hoose. Ka fogow 500 m. Ha ka gudbin biyaha socda."],
    ["so-safe-07", "Somali", "correct translations", "Khatar sare oo daad ah Lower Shabelle. Ka fogow 500 m. Ha gudbin biyaha socda."],
    ["so-safe-08", "Somali", "correct translations", "Digniin daad daran oo ku socota Shabeellaha Hoose. Ka fogow 500 m. Raac amarrada rasmiga ah."],
  ].map(([id, language, category, candidate]) => ({ id, language, category, expectedSafe: true, original: base, candidate }));

  const unsafeRows = [
    ["en-num-01", "English", "changed numbers", "Severe flood warning for Lower Shabelle. Move 50 m away. Do not cross moving water."],
    ["sw-num-02", "Kiswahili", "changed numbers", "Tahadhari ya mafuriko kali kwa Lower Shabelle. Sogea umbali wa 50 m. Usivuke maji yanayotiririka."],
    ["so-num-03", "Somali", "changed numbers", "Digniin daad daran oo ku socota Shabeellaha Hoose. Ka fogow 50 m. Ha gudbin biyaha socda."],
    ["en-num-04", "English", "changed numbers", "Severe flood warning for Lower Shabelle. Move 5,000 m away. Do not cross moving water."],
    ["sw-num-05", "Kiswahili", "changed numbers", "Tahadhari kali ya mafuriko Lower Shabelle. Ondoka 300 m. Usivuke maji yanayotiririka."],
    ["so-num-06", "Somali", "changed numbers", "Digniin daad daran Lower Shabelle. Ka fogow 700 m. Ha gudbin biyaha socda."],
    ["en-unit-01", "English", "changed units", "Severe flood warning for Lower Shabelle. Move 500 feet away. Do not cross moving water."],
    ["sw-unit-02", "Kiswahili", "changed units", "Tahadhari kali ya mafuriko Lower Shabelle. Sogea 500 kilometres mbali. Usivuke maji yanayotiririka."],
    ["so-unit-03", "Somali", "changed units", "Digniin daad daran Shabeellaha Hoose. Ka fogow 500 ft. Ha gudbin biyaha socda."],
    ["en-unit-04", "English", "changed units", "Severe flood warning for Lower Shabelle. Move 500 yards away. Do not cross moving water."],
    ["sw-unit-05", "Kiswahili", "changed units", "Tahadhari kali ya mafuriko Lower Shabelle. Ondoka 500 steps. Usivuke maji yanayotiririka."],
    ["so-unit-06", "Somali", "changed units", "Digniin daad daran Lower Shabelle. Ka fogow 500 km. Ha gudbin biyaha socda."],
    ["en-action-01", "English", "missing instructions", "Severe flood warning for Lower Shabelle. Move 500 m away."],
    ["sw-action-02", "Kiswahili", "missing instructions", "Tahadhari kali ya mafuriko Lower Shabelle. Sogea 500 m mbali."],
    ["so-action-03", "Somali", "missing instructions", "Digniin daad daran Shabeellaha Hoose. Ka fogow 500 m."],
    ["en-action-04", "English", "missing instructions", "Severe flood warning for Lower Shabelle. Move 500 m away. Stay alert."],
    ["sw-action-05", "Kiswahili", "missing instructions", "Tahadhari kali ya mafuriko Lower Shabelle. Ondoka 500 m. Kaa macho."],
    ["so-action-06", "Somali", "missing instructions", "Digniin daad daran Lower Shabelle. Ka fogow 500 m. Feejignow."],
    ["en-sev-01", "English", "wrong severity", "Moderate flood warning for Lower Shabelle. Move 500 m away. Do not cross moving water."],
    ["sw-sev-02", "Kiswahili", "wrong severity", "Tahadhari ya mafuriko ya wastani kwa Lower Shabelle. Sogea 500 m. Usivuke maji yanayotiririka."],
    ["so-sev-03", "Somali", "wrong severity", "Digniin daad dhexdhexaad ah Shabeellaha Hoose. Ka fogow 500 m. Ha gudbin biyaha socda."],
    ["en-sev-04", "English", "wrong severity", "Low flood warning for Lower Shabelle. Move 500 m away. Do not cross moving water."],
    ["sw-sev-05", "Kiswahili", "wrong severity", "Tahadhari ya njano ya mafuriko Lower Shabelle. Sogea 500 m. Usivuke maji yanayotiririka."],
    ["so-sev-06", "Somali", "wrong severity", "Digniin cagaar oo daad ah Lower Shabelle. Ka fogow 500 m. Ha gudbin biyaha socda."],
    ["en-loc-01", "English", "wrong location", "Severe flood warning for Upper Shabelle. Move 500 m away. Do not cross moving water."],
    ["sw-loc-02", "Kiswahili", "wrong location", "Tahadhari kali ya mafuriko kwa Nairobi. Sogea 500 m. Usivuke maji yanayotiririka."],
    ["so-loc-03", "Somali", "wrong location", "Digniin daad daran oo ku socota Marsabit. Ka fogow 500 m. Ha gudbin biyaha socda."],
    ["en-loc-04", "English", "wrong location", "Severe flood warning for Hawassa. Move 500 m away. Do not cross moving water."],
    ["sw-loc-05", "Kiswahili", "wrong location", "Tahadhari kali ya mafuriko Upper Shabelle. Sogea 500 m. Usivuke maji yanayotiririka."],
    ["so-loc-06", "Somali", "wrong location", "Digniin daad daran oo ku socota Shabeellaha Sare. Ka fogow 500 m. Ha gudbin biyaha socda."],
    ["en-danger-01", "English", "dangerous wording", "Severe flood warning for Lower Shabelle. Move 500 m away. Cross carefully."],
    ["sw-danger-02", "Kiswahili", "dangerous wording", "Tahadhari kali ya mafuriko Lower Shabelle. Sogea 500 m. Ingia kwenye maji kwa uangalifu."],
    ["so-danger-03", "Somali", "dangerous wording", "Digniin daad daran Shabeellaha Hoose. Ka fogow 500 m. Gudub si tartiib."],
    ["en-danger-04", "English", "dangerous wording", "Severe flood warning for Lower Shabelle. Move 500 m away. Drive through floodwater slowly."],
    ["sw-danger-05", "Kiswahili", "dangerous wording", "Tahadhari kali ya mafuriko Lower Shabelle. Sogea 500 m. Puuza onyo ikiwa njia ni fupi."],
    ["so-danger-06", "Somali", "dangerous wording", "Digniin daad daran Lower Shabelle. Ka fogow 500 m. Ignore the warning."],
    ["en-incomplete-01", "English", "incomplete translation", "Severe flood warning. Move 500 m away."],
    ["sw-incomplete-02", "Kiswahili", "incomplete translation", "Tahadhari kali. Sogea 500 m."],
    ["so-incomplete-03", "Somali", "incomplete translation", "Digniin daran. Ka fogow 500 m."],
    ["en-incomplete-04", "English", "incomplete translation", "Flood warning for Lower Shabelle. Do not cross moving water."],
    ["sw-incomplete-05", "Kiswahili", "incomplete translation", "Mafuriko Lower Shabelle. Usivuke maji yanayotiririka."],
    ["so-incomplete-06", "Somali", "incomplete translation", "Daad Shabeellaha Hoose. Ha gudbin biyaha socda."],
    ["en-hazard-01", "English", "wrong hazard", "Severe drought warning for Lower Shabelle. Move 500 m away. Do not cross moving water."],
    ["sw-hazard-02", "Kiswahili", "wrong hazard", "Tahadhari kali ya ukame Lower Shabelle. Sogea 500 m. Usivuke maji yanayotiririka."],
    ["so-hazard-03", "Somali", "wrong hazard", "Digniin abaar daran Shabeellaha Hoose. Ka fogow 500 m. Ha gudbin biyaha socda."],
    ["en-hazard-04", "English", "wrong hazard", "Severe earthquake warning for Lower Shabelle. Move 500 m away. Do not cross moving water."],
    ["sw-hazard-05", "Kiswahili", "wrong hazard", "Tahadhari kali ya tetemeko Lower Shabelle. Sogea 500 m. Usivuke maji yanayotiririka."],
    ["so-hazard-06", "Somali", "wrong hazard", "Digniin dhul gariir daran Lower Shabelle. Ka fogow 500 m. Ha gudbin biyaha socda."],
  ].map(([id, language, category, candidate]) => ({ id, language, category, expectedSafe: false, original: base, candidate }));

  return [...safe, ...unsafeRows];
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
    const changed = test.category === "changed numbers" || test.category === "changed units";
    return changed ? (!test.result.numbersPreserved || !test.result.unitsPreserved) : (test.result.numbersPreserved && test.result.unitsPreserved);
  }).length;
  const severityCorrect = results.filter((test) => {
    const changed = test.category === "wrong severity" || extractSeverityLevels(test.candidate).size === 0;
    return changed ? !test.result.severityPreserved : test.result.severityPreserved;
  }).length;
  const averageMs = elapsed / results.length;
  return {
    total: results.length,
    safeTotal: safe.length,
    unsafeTotal: unsafe.length,
    unsafeDetected,
    safeApproved,
    numberAccuracy,
    severityCorrect,
    fallbackActivated: unsafeDetected,
    latency: averageMs < 0.1 ? "<0.1 ms" : `${averageMs.toFixed(1)} ms`,
    unsafeDetection: `${((unsafeDetected / unsafe.length) * 100).toFixed(1)}%`,
    safeApproval: `${((safeApproved / safe.length) * 100).toFixed(1)}%`,
    severityAccuracy: `${((severityCorrect / results.length) * 100).toFixed(1)}%`,
    fallback: `${((unsafeDetected / unsafe.length) * 100).toFixed(1)}%`,
    results,
  };
}
