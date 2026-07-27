export type HazardType = "flood" | "drought" | "earthquake";

export type DataClassification =
  | "live"
  | "model-derived"
  | "simulated"
  | "cached"
  | "community-reported";

export type Severity =
  | "low"
  | "moderate"
  | "high"
  | "severe"
  | "critical";

export type EvidenceStatus = "available" | "stale" | "missing";

export type ActionStatus =
  | "pending"
  | "in-progress"
  | "verified"
  | "completed"
  | "blocked";

export type ActionPriority = "normal" | "urgent" | "critical";

export type Audience =
  | "executive"
  | "government"
  | "humanitarian"
  | "community"
  | "technical";

export type SupportedLanguage = "en" | "sw" | "so";

export type EvidenceItem = {
  id: string;
  source: string;
  signal: string;
  value: string;
  status: EvidenceStatus;
  classification: DataClassification;
  observedAt: string;
  freshnessMinutes?: number;
  reliabilityWeight: number;
  sourceUrl?: string;
};

export type RiskFactor = {
  id: string;
  label: string;
  explanation: string;
  contribution: number;
  evidenceIds: string[];
};

export type ActionTask = {
  id: string;
  title: string;
  description: string;
  responsibleRole: string;
  deadline: string;
  priority: ActionPriority;
  status: ActionStatus;
  requiredEvidence: string[];
  expectedResult: string;
  completionEvidence?: string[];
};

export type ExpectedImpact = {
  objective: string;
  successIndicator: string;
  targetValue?: string;
};

export type IncidentAssessment = {
  id: string;
  hazardId: string;
  hazardType: HazardType;

  location: {
    country: string;
    region: string;
    district?: string;
    latitude: number;
    longitude: number;
  };

  classification: DataClassification;
  severity: Severity;

  /**
   * Prototype prioritisation score.
   * It must not be presented as an official forecast probability.
   */
  riskScore: number;

  /**
   * Confidence in the supporting evidence,
   * not the probability that the disaster will occur.
   */
  confidenceScore: number;

  confidenceExplanation: string;

  evidence: EvidenceItem[];
  contributingFactors: RiskFactor[];
  missingEvidence: string[];
  priorityActions: ActionTask[];

  expectedImpact: ExpectedImpact;

  generatedAt: string;
  validUntil: string;
};

export type CommunicationProduct = {
  id: string;
  assessmentId: string;
  audience: Audience;
  language: SupportedLanguage;
  title: string;
  content: string;
  createdAt: string;

  validation: {
    approved: boolean;
    score: number;
    violations: string[];
    fallbackActivated: boolean;
  };
};