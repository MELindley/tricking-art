import { beforeAll, describe, expect, it } from 'vitest';
import { diffFrames, pixelDiff } from '../src/engine/analysis/frameDiff';
import { MotionAnalyzer } from '../src/engine/analysis/MotionAnalyzer';
import { TRACKED_JOINTS } from '../src/constants/bodyParts';
import { POSE_JOINTS } from '../src/constants/pose';
import type { Landmark } from '../src/types';

// Node has no ImageData; MotionAnalyzer constructs one to remember the previous frame.
class FakeImageData {
  constructor(
    public data: Uint8ClampedArray,
    public width: number,
    public height: number,
  ) {}
}
beforeAll(() => {
  (globalThis as unknown as { ImageData: unknown }).ImageData = FakeImageData;
});

const solid = (w: number, h: number, rgb: [number, number, number]) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...rgb, 255], i);
  return new FakeImageData(data, w, h) as unknown as ImageData;
};

const standing = (): Landmark[] => {
  const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  lms[23] = { x: 0.45, y: 0.6, z: 0, visibility: 1 };
  lms[24] = { x: 0.55, y: 0.6, z: 0, visibility: 1 };
  return lms;
};

describe('diffFrames', () => {
  it('reports no motion on the first frame', () => {
    const r = diffFrames(solid(64, 64, [0, 0, 0]), null);
    expect(r.motionPoints).toEqual([]);
    expect(r.energy).toBe(0);
  });

  it('reports no motion for identical frames', () => {
    const r = diffFrames(solid(64, 64, [10, 20, 30]), solid(64, 64, [10, 20, 30]));
    expect(r.motionPoints).toEqual([]);
  });

  it('flags every block when the whole frame changes, with normalised energy', () => {
    const r = diffFrames(solid(64, 64, [255, 255, 255]), solid(64, 64, [0, 0, 0]));
    expect(r.motionPoints).toHaveLength(16); // 4×4 blocks of 16px
    expect(r.motionPoints.every((p) => p.energy > 0.99 && p.energy <= 1)).toBe(true);
    expect(r.motionPoints.every((p) => p.x >= 0 && p.x < 1 && p.y >= 0 && p.y < 1)).toBe(true);
  });

  it('ignores sub-threshold noise', () => {
    expect(diffFrames(solid(64, 64, [5, 5, 5]), solid(64, 64, [0, 0, 0])).motionPoints).toEqual([]);
  });
});

describe('pixelDiff', () => {
  it('is 0 for equal pixels and ~1 for black vs white', () => {
    const a = solid(4, 4, [0, 0, 0]);
    expect(pixelDiff(a, solid(4, 4, [0, 0, 0]), 1, 1)).toBe(0);
    expect(pixelDiff(solid(4, 4, [255, 255, 255]), a, 1, 1)).toBeCloseTo(1, 2);
  });

  it('returns 0 for out-of-bounds coordinates instead of reading past the buffer', () => {
    const a = solid(4, 4, [255, 255, 255]);
    const b = solid(4, 4, [0, 0, 0]);
    expect(pixelDiff(a, b, -5, -5)).toBe(0);
    expect(pixelDiff(a, b, 100, 100)).toBe(0);
  });
});

describe('MotionAnalyzer', () => {
  it('fromLandmarks keeps only visible joints and bounds energy to 0–1', () => {
    const an = new MotionAnalyzer();
    const lms = standing();
    lms[POSE_JOINTS[0]] = { ...lms[POSE_JOINTS[0]], visibility: 0.1 };
    const f = an.fromLandmarks(lms, solid(32, 32, [0, 0, 0]));
    expect(f.isPose).toBe(true);
    expect(f.keypoints.some((k) => k.jointIdx === POSE_JOINTS[0])).toBe(false);
    expect(f.keypoints.length).toBe(TRACKED_JOINTS.length - 1);
    expect(f.energy).toBeGreaterThanOrEqual(0);
    expect(f.energy).toBeLessThanOrEqual(1);
    expect(f.keypoints.every((k) => k.energy >= 0 && k.energy <= 1)).toBe(true);
    expect(f.centroid).toEqual({ x: 0.5, y: 0.6 });
  });

  it('raises energy when joints move between frames', () => {
    const an = new MotionAnalyzer();
    const img = solid(32, 32, [0, 0, 0]);
    const still1 = an.fromLandmarks(standing(), img);
    const still2 = an.fromLandmarks(standing(), img);
    const moved = standing();
    for (const i of POSE_JOINTS) moved[i] = { ...moved[i], x: moved[i].x + 0.1 };
    const moving = an.fromLandmarks(moved, img);
    expect(still1.energy).toBe(0);
    expect(still2.energy).toBe(0);
    expect(moving.energy).toBeGreaterThan(0);
  });

  it('survives a frame where landmarks sit at the image edge (pixel lookup out of bounds)', () => {
    const an = new MotionAnalyzer();
    an.fromLandmarks(standing(), solid(32, 32, [0, 0, 0]));
    const edge = standing().map((l) => ({ ...l, x: 1, y: 1 }));
    expect(() => an.fromLandmarks(edge, solid(32, 32, [255, 255, 255]))).not.toThrow();
  });

  it('fromDiff yields a non-pose frame and picks up motion on the second frame', () => {
    const an = new MotionAnalyzer();
    const first = an.fromDiff(solid(64, 64, [0, 0, 0]));
    const second = an.fromDiff(solid(64, 64, [255, 255, 255]));
    expect(first.isPose).toBe(false);
    expect(first.motionPoints).toEqual([]);
    expect(first.centroid).toEqual({ x: 0.5, y: 0.5 });
    expect(second.motionPoints.length).toBeGreaterThan(0);
    expect(second.keypoints.length).toBeLessThanOrEqual(8);
  });

  it('reset forgets the previous frame', () => {
    const an = new MotionAnalyzer();
    an.fromDiff(solid(64, 64, [0, 0, 0]));
    an.reset();
    expect(an.fromDiff(solid(64, 64, [255, 255, 255])).motionPoints).toEqual([]);
  });
});
