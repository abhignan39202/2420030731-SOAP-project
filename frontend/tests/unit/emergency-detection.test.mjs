import test from 'node:test';
import assert from 'node:assert/strict';
import { EmergencySignalEvaluator, magnitudeInG, rotationMagnitude } from '../../src/lib/emergency-detection.mjs';

test('normal movement and a single high acceleration spike do not create a possible emergency', () => {
  const evaluator = new EmergencySignalEvaluator();
  evaluator.pushOrientation(0, 0, 0);
  evaluator.pushMotion(1, 5, 50);
  evaluator.pushOrientation(22, 10, 300);
  assert.equal(evaluator.pushMotion(1, 25, 350), null);

  const singleSpike = new EmergencySignalEvaluator();
  singleSpike.pushOrientation(0, 0, 0);
  assert.equal(singleSpike.pushMotion(3.2, 190, 100), null);
  assert.equal(singleSpike.check(500), null);
});

test('impact, orientation change and rapid rotation produce a rule-based possible fall', () => {
  const evaluator = new EmergencySignalEvaluator();
  evaluator.pushOrientation(0, 0, 0);
  evaluator.pushMotion(3.1, 175, 300);
  const result = evaluator.pushOrientation(62, 4, 400);

  assert.deepEqual(result, {
    confidence: 80,
    signals: ['impact', 'orientation-change', 'rapid-rotation'],
  });
});

test('impact, orientation change and subsequent inactivity also form a possible fall', () => {
  const evaluator = new EmergencySignalEvaluator();
  evaluator.pushOrientation(0, 0, 0);
  evaluator.pushMotion(3.0, 0, 100);
  evaluator.pushOrientation(58, 0, 200);
  evaluator.pushMotion(1.0, 0, 300);

  assert.deepEqual(evaluator.check(2_900), {
    confidence: 75,
    signals: ['impact', 'orientation-change', 'post-event-inactivity'],
  });
});

test('orientation change, rapid rotation and inactivity can combine when impact is unavailable', () => {
  const evaluator = new EmergencySignalEvaluator();
  evaluator.pushOrientation(0, 0, 0);
  evaluator.pushMotion(1.0, 160, 100);
  evaluator.pushOrientation(61, 0, 200);
  evaluator.pushMotion(1.0, 0, 300);

  assert.deepEqual(evaluator.check(2_900), {
    confidence: 70,
    signals: ['orientation-change', 'rapid-rotation', 'post-event-inactivity'],
  });
});

test('free fall followed by impact participates in the multi-signal rule', () => {
  const evaluator = new EmergencySignalEvaluator();
  evaluator.pushOrientation(0, 0, 0);
  evaluator.pushMotion(0.3, 20, 100);
  evaluator.pushMotion(2.0, 175, 400);

  assert.deepEqual(evaluator.pushOrientation(61, 0, 600), {
    confidence: 80,
    signals: ['impact', 'orientation-change', 'rapid-rotation'],
  });
});

test('sensor feature conversion rejects missing measurements', () => {
  assert.ok(Math.abs(magnitudeInG(0, 0, 9.80665) - 1) < 0.001);
  assert.equal(magnitudeInG(null, 0, 1), null);
  assert.equal(rotationMagnitude({ alpha: null, beta: null, gamma: null }), null);
});
