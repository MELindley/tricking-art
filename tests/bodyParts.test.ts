import { beforeAll, describe, expect, it } from 'vitest';
import { ALL_BODY_PARTS, BODY_PARTS, TRACKED_JOINTS } from '../src/constants/bodyParts';
import { POSE_JOINTS, SKELETON } from '../src/constants/pose';
import { MotionAnalyzer } from '../src/engine/analysis/MotionAnalyzer';
import { VelocityTracker } from '../src/engine/analysis/velocity';
import { PALETTES } from '../src/constants/palettes';
import { buildRenderParams, renderStill } from '../src/engine/render';
import { applyBodyParts, resolveSelection } from '../src/engine/render/bodyParts';
import type { ArtMode, BodyPart, FrameData, Landmark } from '../src/types';

class FakeImageData {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}
beforeAll(() => {
  (globalThis as unknown as { ImageData: unknown }).ImageData = FakeImageData;
});

const img = () => new FakeImageData(new Uint8ClampedArray(32 * 32 * 4), 32, 32) as unknown as ImageData;

const standing = (): Landmark[] => {
  const lms: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  lms[23] = { x: 0.45, y: 0.6, z: 0, visibility: 1 };
  lms[24] = { x: 0.55, y: 0.6, z: 0, visibility: 1 };
  return lms;
};

/** A clip where only the given landmarks move, one step per frame. */
function clip(moving: number[], frames = 8): FrameData[] {
  const an = new MotionAnalyzer();
  return Array.from({ length: frames }, (_, i) => {
    const lms = standing();
    for (const j of moving) lms[j] = { ...lms[j], x: 0.3 + i * 0.05 };
    return {
      ...an.fromLandmarks(lms, img()),
      time: i / frames,
      videoTime: i,
      videoSnapshot: '',
      snapW: 0,
      snapH: 0,
      eN: 0,
    };
  });
}

describe('body part definitions', () => {
  it('maps left/right to the athlete’s own sides (MediaPipe indices)', () => {
    const joints = (id: BodyPart) => BODY_PARTS.find((p) => p.id === id)!.joints;
    expect(joints('leftFoot')).toEqual([27, 29, 31]);
    expect(joints('rightFoot')).toEqual([28, 30, 32]);
    expect(joints('leftArm')).toEqual([11, 13, 15]);
    expect(joints('rightArm')).toEqual([12, 14, 16]);
    expect(joints('head')).toContain(0);
    expect(joints('torso')).toEqual(expect.arrayContaining([11, 12, 23, 24]));
  });

  it('only references landmarks MediaPipe provides, and every bone joins joints of its own part', () => {
    for (const part of BODY_PARTS) {
      for (const j of part.joints) {
        expect(j).toBeGreaterThanOrEqual(0);
        expect(j).toBeLessThan(33);
      }
      for (const [a, b] of part.bones) {
        expect(part.joints).toContain(a);
        expect(part.joints).toContain(b);
      }
    }
  });

  it('tracks every part joint plus the original whole-body joints, once each', () => {
    expect(new Set(TRACKED_JOINTS).size).toBe(TRACKED_JOINTS.length);
    for (const j of [...POSE_JOINTS, ...BODY_PARTS.flatMap((p) => p.joints)]) expect(TRACKED_JOINTS).toContain(j);
  });
});

describe('resolveSelection', () => {
  it('whole body (or nothing) keeps the original skeleton and joint set', () => {
    for (const parts of [ALL_BODY_PARTS, []]) {
      const sel = resolveSelection(parts);
      expect(sel.isAll).toBe(true);
      expect(sel.bones).toBe(SKELETON);
      expect([...sel.joints].sort()).toEqual([...POSE_JOINTS].sort());
    }
  });

  it('one part yields only that part’s joints and bones', () => {
    const sel = resolveSelection(['leftFoot']);
    expect(sel.isAll).toBe(false);
    expect([...sel.joints]).toEqual([27, 29, 31]);
    expect(sel.bones).toHaveLength(3);
  });

  it('several parts combine without duplicate bones', () => {
    const sel = resolveSelection(['torso', 'leftArm']);
    const keys = sel.bones.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(sel.joints.has(13)).toBe(true);
    expect(sel.joints.has(27)).toBe(false);
  });
});

describe('extra joints are analysed', () => {
  it('VelocityTracker reports speed for foot landmarks', () => {
    const tracker = new VelocityTracker();
    tracker.update(standing());
    const moved = standing();
    moved[31] = { ...moved[31], x: 0.7 };
    expect(tracker.update(moved)[31]).toBeCloseTo(0.2);
  });

  it('whole-body energy ignores the extra joints', () => {
    const base = new MotionAnalyzer();
    base.fromLandmarks(standing(), img());
    const heelMoved = standing();
    heelMoved[29] = { ...heelMoved[29], x: 0.9 };
    expect(base.fromLandmarks(heelMoved, img()).energy).toBe(0);
  });
});

describe('applyBodyParts', () => {
  it('whole body leaves pose frames on the original joints, with their energy unchanged', () => {
    const frames = clip([15]);
    const { frames: out, peakEnergy } = applyBodyParts(frames, ALL_BODY_PARTS);
    expect(peakEnergy).toBeNull();
    expect(out.map((f) => f.energy)).toEqual(frames.map((f) => f.energy));
    for (const f of out) expect(f.keypoints.every((k) => POSE_JOINTS.includes(k.jointIdx as never))).toBe(true);
  });

  it('a subset keeps only that part’s keypoints, with motion points staying in step', () => {
    const { frames } = applyBodyParts(clip([27]), ['leftFoot']);
    for (const f of frames) {
      expect(f.keypoints.length).toBeGreaterThan(0);
      expect(f.keypoints.every((k) => [27, 29, 31].includes(k.jointIdx!))).toBe(true);
      expect(f.motionPoints).toHaveLength(f.keypoints.length);
      f.keypoints.forEach((k, i) => expect(f.motionPoints[i]).toMatchObject({ x: k.x, y: k.y }));
    }
  });

  it('energy follows the selected part: the moving foot is loud, the still foot is silent', () => {
    const frames = clip([27]);
    const moving = applyBodyParts(frames, ['leftFoot']);
    const still = applyBodyParts(frames, ['rightFoot']);
    expect(Math.max(...moving.frames.map((f) => f.energy))).toBe(1);
    expect(moving.peakEnergy).toBeGreaterThan(0);
    expect(still.frames.every((f) => f.energy === 0)).toBe(true);
    expect(still.peakEnergy).toBe(0);
  });

  it('does not mutate its input, so the selection can be changed and re-applied', () => {
    const frames = clip([27]);
    const snapshot = JSON.stringify(frames);
    applyBodyParts(frames, ['head']);
    expect(JSON.stringify(frames)).toBe(snapshot);
  });

  it('empties frames without a pose when a subset is picked, but leaves them alone for the whole body', () => {
    const an = new MotionAnalyzer();
    const diffFrame: FrameData = {
      ...an.fromDiff(img()),
      time: 0,
      videoTime: 0,
      videoSnapshot: '',
      snapW: 0,
      snapH: 0,
      eN: 0,
      keypoints: [{ x: 0.5, y: 0.5, energy: 1 }],
      motionPoints: [{ x: 0.5, y: 0.5, energy: 1 }],
      energy: 0.7,
    };
    expect(applyBodyParts([diffFrame], ['head']).frames[0]).toMatchObject({ keypoints: [], motionPoints: [], energy: 0 });
    expect(applyBodyParts([diffFrame], ALL_BODY_PARTS).frames[0]).toBe(diffFrame);
  });

  it('copes with an empty clip', () => {
    expect(applyBodyParts([], ['head'])).toEqual({ frames: [], peakEnergy: 0 });
  });
});

describe('rendering a subset', () => {
  /** Counts how many strokes a mode makes. */
  function strokes(mode: ArtMode, parts: readonly BodyPart[]): number {
    let count = 0;
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (t, prop) => {
        if (prop in t) return t[prop as string];
        if (prop === 'createLinearGradient') return () => ({ addColorStop: () => {} });
        return () => {
          if (prop === 'stroke') count++;
        };
      },
      set: (t, prop, v) => ((t[prop as string] = v), true),
    }) as unknown as CanvasRenderingContext2D;
    const settings = { mode, palette: PALETTES[0].colors, lineWeight: 2, glow: 0.6, symmetry: 1, persistence: 0.85, bodyParts: parts };
    const params = buildRenderParams(settings, 1080, 1920);
    const { frames } = applyBodyParts(clip([27, 15]), parts);
    renderStill(ctx, frames, params, mode);
    return count;
  }

  it.each(['trail', 'mandala', 'ghost'] as const)('%s draws less for one foot than for the whole body', (mode) => {
    const foot = strokes(mode, ['leftFoot']);
    expect(foot).toBeGreaterThan(0);
    expect(foot).toBeLessThan(strokes(mode, ALL_BODY_PARTS));
  });

  it.each(['trail', 'mandala', 'ghost', 'flow'] as const)('%s renders every single part without throwing', (mode) => {
    for (const part of ALL_BODY_PARTS) expect(() => strokes(mode, [part])).not.toThrow();
  });
});
