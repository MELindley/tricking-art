import { describe, expect, it } from 'vitest';
import { computeCentroid, deriveKeypoints } from '../src/engine/analysis/frameDiff';

describe('computeCentroid', () => {
  it('defaults to the frame centre with no motion', () => {
    expect(computeCentroid([])).toEqual({ x: 0.5, y: 0.5 });
  });

  it('weights points by energy', () => {
    const c = computeCentroid([
      { x: 0, y: 0, energy: 1 },
      { x: 1, y: 1, energy: 3 },
    ]);
    expect(c.x).toBeCloseTo(0.75);
    expect(c.y).toBeCloseTo(0.75);
  });
});

describe('deriveKeypoints', () => {
  it('keeps the strongest points and drops near-duplicates', () => {
    const kps = deriveKeypoints([
      { x: 0.1, y: 0.1, energy: 0.9 },
      { x: 0.11, y: 0.1, energy: 0.8 }, // too close to the first
      { x: 0.6, y: 0.6, energy: 0.5 },
    ]);
    expect(kps).toHaveLength(2);
    expect(kps[0].energy).toBe(0.9);
  });

  it('caps the result at 8 points', () => {
    const pts = Array.from({ length: 12 }, (_, i) => ({ x: i / 12, y: 0.5, energy: 1 - i / 100 }));
    expect(deriveKeypoints(pts).length).toBeLessThanOrEqual(8);
  });
});
