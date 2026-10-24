const SIGNAL_WINDOW_MS = 8_000;
const INACTIVITY_MS = 2_500;
const HIGH_IMPACT_G = 2.5;
const FREE_FALL_G = 0.45;
const RAPID_ROTATION_DPS = 150;
const ORIENTATION_CHANGE_DEGREES = 50;

/**
 * Small, local-only rule evaluator for the academic automated emergency prototype.
 * It requires a combination of signals; one acceleration or rotation spike cannot alert.
 */
export class EmergencySignalEvaluator {
  reset() {
    this.impactAt = null;
    this.freeFallAt = null;
    this.orientationAt = null;
    this.rotationAt = null;
    this.quietSince = null;
    this.lastOrientation = null;
  }

  constructor() {
    this.reset();
  }

  pushMotion(accelerationMagnitudeG, rotationMagnitudeDps, at) {
    if (Number.isFinite(accelerationMagnitudeG)) {
      if (accelerationMagnitudeG <= FREE_FALL_G) this.freeFallAt = at;

      const impactAfterFreeFall = this.freeFallAt !== null &&
        at - this.freeFallAt <= 1_500 && accelerationMagnitudeG >= 1.8;
      if (accelerationMagnitudeG >= HIGH_IMPACT_G || impactAfterFreeFall) this.impactAt = at;

      const quietAcceleration = accelerationMagnitudeG >= 0.85 && accelerationMagnitudeG <= 1.15;
      const quietRotation = !Number.isFinite(rotationMagnitudeDps) || rotationMagnitudeDps <= 18;
      if (quietAcceleration && quietRotation) this.quietSince ??= at;
      else this.quietSince = null;
    }

    if (Number.isFinite(rotationMagnitudeDps) && rotationMagnitudeDps >= RAPID_ROTATION_DPS) {
      this.rotationAt = at;
    }
    return this.check(at);
  }

  pushOrientation(beta, gamma, at) {
    if (Number.isFinite(beta) && Number.isFinite(gamma)) {
      if (this.lastOrientation) {
        const betaDelta = shortestAngle(this.lastOrientation.beta, beta);
        const gammaDelta = shortestAngle(this.lastOrientation.gamma, gamma);
        if (Math.hypot(betaDelta, gammaDelta) >= ORIENTATION_CHANGE_DEGREES) {
          this.orientationAt = at;
        }
      }
      this.lastOrientation = { beta, gamma };
    }
    return this.check(at);
  }

  check(at) {
    const recent = (signalAt) => signalAt !== null && at - signalAt <= SIGNAL_WINDOW_MS;
    const impact = recent(this.impactAt);
    const orientation = recent(this.orientationAt);
    const rotation = recent(this.rotationAt);
    const eventObserved = impact || orientation || rotation;
    const inactivity = eventObserved && this.quietSince !== null && at - this.quietSince >= INACTIVITY_MS;
    const signals = [
      impact && 'impact',
      orientation && 'orientation-change',
      rotation && 'rapid-rotation',
      inactivity && 'post-event-inactivity',
    ].filter(Boolean);

    // At least three independent signals are required. The no-impact rule still
    // requires a large orientation change, rapid rotation, and subsequent quiet.
    const confidence =
      (impact ? 0.3 : 0) +
      (orientation ? 0.25 : 0) +
      (rotation ? 0.25 : 0) +
      (inactivity ? 0.2 : 0);
    const qualifyingCombination =
      (impact && orientation && (rotation || inactivity)) ||
      (!impact && orientation && rotation && inactivity);

    if (signals.length >= 3 && confidence >= 0.7 && qualifyingCombination) {
      return { confidence: Math.round(confidence * 100), signals };
    }
    return null;
  }
}

function shortestAngle(from, to) {
  const delta = ((to - from + 540) % 360) - 180;
  return Math.abs(delta);
}

export function magnitudeInG(x, y, z) {
  if (![x, y, z].every(Number.isFinite)) return null;
  return Math.hypot(x, y, z) / 9.80665;
}

export function rotationMagnitude(rotationRate) {
  if (!rotationRate) return null;
  const values = [rotationRate.alpha, rotationRate.beta, rotationRate.gamma].filter(Number.isFinite);
  return values.length ? Math.hypot(...values) : null;
}
