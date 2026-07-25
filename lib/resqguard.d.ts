export type ValidationResult = {
  approved: boolean;
  numbersPreserved: boolean;
  severityPreserved: boolean;
  locationPreserved: boolean;
  requiredAction: boolean;
  dangerousWording: boolean;
};

export function validateMessage(original: string, candidate: string): ValidationResult;
export function buildEvaluationCases(): Array<Record<string, unknown>>;
export function runResqGuardEvaluation(): {
  total: number;
  unsafeDetected: number;
  safeApproved: number;
  numberAccuracy: number;
  fallbackActivated: number;
  latency: string;
  unsafeDetection: string;
  safeApproval: string;
  severityAccuracy: string;
  fallback: string;
  results: Array<Record<string, unknown>>;
};
