import { describe, expect, it } from 'vitest';
import { detectAirTime, PhaseDetector } from '../src/engine/analysis/phase';
import { VelocityTracker } from '../src/engine/analysis/velocity';
import { PHASE } from '../src/constants/pose';
import type { Landmark } from '../src/types';

/** 33 landmarks standing still; override a few by index. */
function pose(overrides: Record<number, Partial<Landmark>> = {}): Landmark[] {
  const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  lms[23] = { x: 0.45, y: 0.6, z: 0, visibility: 1 };
  lms[24] = { x: 0.55, y: 0.6, z: 0, visibility: 1 };
  lms[27] = { x: 0.45, y: 0.9, z: 0, visibility: 1 };
  lms[28] = { x: 0.55, y: 0.9, z: 0, visibility: 1 };
  for (const [i, o] of Object.entries(overrides)) lms[+i] = { ...lms[+i], ...o };
  return lms;
}

describe('detectAirTime', () => {
  it('is false when the ankles are below the hips', () => {
    expect(detectAirTime(pose())).toBe(false);
  });

  it('is true when both ankles are well above the hips', () => {
    expect(detectAirTime(pose({ 27: { y: 0.4 }, 28: { y: 0.4 } }))).toBe(true);
  });

  it('ignores frames where the hips are not visible', () => {
    expect(detectAirTime(pose({ 23: { visibility: 0.1 }, 27: { y: 0.1 }, 28: { y: 0.1 } }))).toBe(false);
  });
});

describe('VelocityTracker', () => {
  it('reports zero on the first frame and the average step afterwards', () => {
    const tracker = new VelocityTracker();
    expect(tracker.update(pose())[15]).toBe(0);
    expect(tracker.update(pose({ 15: { x: 0.6 } }))[15]).toBeCloseTo(0.1);
  });

  it('forgets history on reset', () => {
    const tracker = new VelocityTracker();
    tracker.update(pose());
    tracker.reset();
    expect(tracker.update(pose({ 15: { x: 0.9 } }))[15]).toBe(0);
  });
});

describe('PhaseDetector', () => {
  it('stays idle until it has a few frames', () => {
    const d = new PhaseDetector();
    expect(d.update(pose(), 0, {})).toBe(PHASE.IDLE);
  });

  it('reports PEAK while airborne', () => {
    const d = new PhaseDetector();
    const air = pose({ 27: { y: 0.4 }, 28: { y: 0.4 } });
    for (let i = 0; i < 3; i++) d.update(air, 0.5, {});
    expect(d.update(air, 0.5, {})).toBe(PHASE.PEAK);
  });

  it('detects LAUNCH when the hips rise quickly with moving limbs', () => {
    const d = new PhaseDetector();
    for (let i = 0; i < 6; i++) d.update(pose({ 23: { y: 0.7 }, 24: { y: 0.7 } }), 0.1, {});
    let last: number = PHASE.IDLE;
    for (let i = 0; i < 6; i++) last = d.update(pose({ 23: { y: 0.55 }, 24: { y: 0.55 } }), 0.1, { 15: 0.05 });
    expect(last).toBe(PHASE.LAUNCH);
  });
});
