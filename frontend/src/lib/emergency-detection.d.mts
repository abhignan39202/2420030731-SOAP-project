export interface EmergencyDetectionResult {
  confidence: number;
  signals: string[];
}

export class EmergencySignalEvaluator {
  constructor();
  reset(): void;
  pushMotion(accelerationMagnitudeG: number | null, rotationMagnitudeDps: number | null, at: number): EmergencyDetectionResult | null;
  pushOrientation(beta: number | null, gamma: number | null, at: number): EmergencyDetectionResult | null;
  check(at: number): EmergencyDetectionResult | null;
}

export function magnitudeInG(x: number | null, y: number | null, z: number | null): number | null;
export function rotationMagnitude(rotationRate: { alpha: number | null; beta: number | null; gamma: number | null } | null): number | null;
