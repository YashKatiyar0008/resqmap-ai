import type {
  ActionTask,
  DataClassification,
  EvidenceItem,
  HazardType,
  IncidentAssessment,
  RiskFactor,
  Severity,
} from "./decision-types";

export type HazardInput = {
  id: string;
  type: HazardType;
  title: string;
  place: string;
  severity: string;
  time: string;
  source: string;
  sourceUrl?: string;
  status: string;
  detail: string;
  latitude: number;
  longitude: number;
};

function normaliseSeverity(value: string): Severity {
  const severity = value.toLowerCase();

  if (severity.includes("critical") || severity.includes("red")) {
    return "critical";
  }

  if (severity.includes("severe") || severity.includes("orange")) {
    return "severe";
  }

  if (severity.includes("high")) {
    return "high";
  }

  if (severity.includes("moderate") || severity.includes("yellow")) {
    return "moderate";
  }

  return "low";
}

function classifyHazard(status: string): DataClassification {
  const normalisedStatus = status.toLowerCase();

  if (normalisedStatus.includes("simulated")) {
    return "simulated";
  }

  if (
    normalisedStatus.includes("model-derived") ||
    normalisedStatus.includes("model-signal")
  ) {
    return "model-derived";
  }

  if (normalisedStatus.includes("cached")) {
    return "cached";
  }

  if (normalisedStatus.includes("community")) {
    return "community-reported";
  }

  return "live";
}

function calculateRiskScore(severity: Severity): number {
  const scores: Record<Severity, number> = {
    low: 25,
    moderate: 48,
    high: 68,
    severe: 84,
    critical: 94,
  };

  return scores[severity];
}

function calculateConfidence(
  classification: DataClassification,
  evidence: EvidenceItem[],
): {
  score: number;
  explanation: string;
} {
  const availableEvidence = evidence.filter(
    (item) => item.status === "available",
  );

  if (availableEvidence.length === 0) {
    return {
      score: 0,
      explanation:
        "No currently available evidence supports this assessment.",
    };
  }

  const uniqueSources = new Set(
    availableEvidence.map((item) => item.source),
  ).size;

  const averageReliability =
    availableEvidence.reduce(
      (total, item) => total + item.reliabilityWeight,
      0,
    ) / availableEvidence.length;

  let score = Math.round(
    averageReliability * 75 + Math.min(uniqueSources * 8, 24),
  );

  if (classification === "simulated") {
    score = Math.min(score, 70);
  }

  if (classification === "cached") {
    score = Math.min(score, 55);
  }

  score = Math.max(0, Math.min(score, 100));

  let explanation = `The assessment currently uses ${uniqueSources} independent evidence source`;

  if (uniqueSources !== 1) {
    explanation += "s";
  }

  explanation += ".";

  if (classification === "simulated") {
    explanation =
      "Confidence describes the completeness of this demonstration scenario, not a live forecast.";
  }

  if (classification === "cached") {
    explanation =
      "Confidence is limited because the latest available information is cached.";
  }

  return {
    score,
    explanation,
  };
}

function buildEvidence(hazard: HazardInput): EvidenceItem[] {
  const classification = classifyHazard(hazard.status);

  return [
    {
      id: `${hazard.id}-primary-source`,
      source: hazard.source,
      signal: `${hazard.type} hazard signal`,
      value: hazard.detail,
      status: "available",
      classification,
      observedAt: hazard.time,
      reliabilityWeight:
        classification === "simulated" ? 0.65 : 0.85,
      sourceUrl: hazard.sourceUrl,
    },
  ];
}

function buildRiskFactors(
  hazard: HazardInput,
  severity: Severity,
): RiskFactor[] {
  const severityContribution: Record<Severity, number> = {
    low: 14,
    moderate: 22,
    high: 30,
    severe: 38,
    critical: 45,
  };

  const factors: RiskFactor[] = [
    {
      id: `${hazard.id}-severity-factor`,
      label: `${severity} hazard severity`,
      explanation:
        "The reported hazard severity is used as the primary prioritisation signal.",
      contribution: severityContribution[severity],
      evidenceIds: [`${hazard.id}-primary-source`],
    },
    {
      id: `${hazard.id}-source-factor`,
      label: "Hazard-source evidence",
      explanation: `The assessment includes evidence supplied by ${hazard.source}.`,
      contribution:
        classifyHazard(hazard.status) === "simulated" ? 18 : 30,
      evidenceIds: [`${hazard.id}-primary-source`],
    },
  ];

  if (hazard.type === "flood") {
    factors.push({
      id: `${hazard.id}-exposure-factor`,
      label: "Potential low-lying-area exposure",
      explanation:
        "Flood impacts may increase in river-adjacent and low-lying areas. Local verification is still required.",
      contribution: 16,
      evidenceIds: [],
    });
  }

  if (hazard.type === "drought") {
    factors.push({
      id: `${hazard.id}-livelihood-factor`,
      label: "Potential water and livelihood pressure",
      explanation:
        "Drought conditions may affect water availability, crops and livestock.",
      contribution: 16,
      evidenceIds: [],
    });
  }

  if (hazard.type === "earthquake") {
    factors.push({
      id: `${hazard.id}-structural-factor`,
      label: "Potential structural exposure",
      explanation:
        "Impact depends on magnitude, depth, building vulnerability and population exposure.",
      contribution: 16,
      evidenceIds: [],
    });
  }

  return factors;
}

function buildPriorityActions(
  hazard: HazardInput,
  severity: Severity,
): ActionTask[] {
 const parsedHazardTime = Date.parse(hazard.time);

const currentTime = Number.isNaN(parsedHazardTime)
  ? 0
  : parsedHazardTime;

  const priority =
    severity === "critical" || severity === "severe"
      ? "critical"
      : "urgent";

  return [
    {
      id: `${hazard.id}-verify-action`,
      title: "Verify local conditions",
      description:
        "Confirm hazard impact, access constraints and reported conditions in the affected area.",
      responsibleRole: "Field Verification Team",
      deadline: new Date(
        currentTime + 30 * 60 * 1000,
      ).toISOString(),
      priority,
      status: "pending",
      requiredEvidence: [
        "Verified field report",
        "Location confirmation",
        "Access-condition confirmation",
      ],
      expectedResult:
        "Local conditions are confirmed or clearly marked as unverified before escalation.",
    },
    {
      id: `${hazard.id}-communication-action`,
      title: "Approve multilingual warning",
      description:
        "Review the citizen warning and approve it only after ResQGuard validation.",
      responsibleRole: "Communications Officer",
      deadline: new Date(
        currentTime + 15 * 60 * 1000,
      ).toISOString(),
      priority,
      status: "pending",
      requiredEvidence: [
        "English warning",
        "Kiswahili warning",
        "Somali warning",
        "ResQGuard validation result",
      ],
      expectedResult:
        "One approved and fact-preserving public warning is available.",
    },
  ];
}

function inferLocation(place: string): {
  region: string;
  country: string;
} {
  const parts = place
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    region: parts[0] || place,
    country: parts[1] || "East Africa",
  };
}

function getStableHazardTime(hazard: HazardInput): number {
  const parsedTime = Date.parse(hazard.time);

  return Number.isNaN(parsedTime) ? 0 : parsedTime;
}

function getMissingEvidence(hazardType: HazardType): string[] {
  if (hazardType === "flood") {
    return [
      "Current river-level measurement",
      "Verified road-accessibility information",
      "Official safe-point capacity",
    ];
  }

  if (hazardType === "drought") {
    return [
      "Verified water-point status",
      "Current vegetation condition",
      "Local livestock and market observations",
    ];
  }

  return [
    "Verified building-damage reports",
    "Population exposure assessment",
    "Local road and infrastructure conditions",
  ];
}

export function buildIncidentAssessment(
  hazard: HazardInput,
): IncidentAssessment {
  const classification = classifyHazard(hazard.status);
  const severity = normaliseSeverity(hazard.severity);
  const evidence = buildEvidence(hazard);
  const confidence = calculateConfidence(
    classification,
    evidence,
  );
  const location = inferLocation(hazard.place);
  const currentTime = getStableHazardTime(hazard);

  return {
    id: `assessment-${hazard.id}`,
    hazardId: hazard.id,
    hazardType: hazard.type,

    location: {
      country: location.country,
      region: location.region,
      latitude: hazard.latitude,
      longitude: hazard.longitude,
    },

    classification,
    severity,
    riskScore: calculateRiskScore(severity),
    confidenceScore: confidence.score,
    confidenceExplanation: confidence.explanation,

    evidence,
    contributingFactors: buildRiskFactors(
      hazard,
      severity,
    ),
    missingEvidence: getMissingEvidence(hazard.type),
    priorityActions: buildPriorityActions(
      hazard,
      severity,
    ),

    expectedImpact: {
      objective:
        "Convert the detected hazard into a verified and accountable early action.",
      successIndicator:
        "Priority evidence is reviewed and a safe multilingual warning is approved before the deadline.",
    },

   generatedAt: new Date(currentTime).toISOString(),
validUntil: new Date(
  currentTime + 60 * 60 * 1000,
).toISOString(),
  };
}