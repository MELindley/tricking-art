import { describe, expect, it } from 'vitest';
import { PHASE } from '../src/constants/pose';
import { ALL_PHASES } from '../src/constants/phases';
import { applyPhases, isAllPhases } from '../src/engine/render/phases';
import type { FrameData, Phase } from '../src/types';

const frame = (phase: Phase | undefined, isPose = true): FrameData =>
  ({ isPose, phase, keypoints: [], motionPoints: [], energy: 0, eN: 0 }) as unknown as FrameData;

const clip = [PHASE.IDLE, PHASE.LOAD, PHASE.LAUNCH, PHASE.PEAK, PHASE.LAND, PHASE.IDLE].map((p) => frame(p));

describe('applyPhases', () => {
  it('all phases (or none) keeps every frame, idle included', () => {
    expect(applyPhases(clip, ALL_PHASES)).toHaveLength(clip.length);
    expect(applyPhases(clip, [])).toHaveLength(clip.length);
    expect(isAllPhases(ALL_PHASES)).toBe(true);
    expect(isAllPhases(['peak'])).toBe(false);
  });

  it('keeps launch and peak only', () => {
    const out = applyPhases(clip, ['launch', 'peak']);
    expect(out.map((f) => f.phase)).toEqual([PHASE.LAUNCH, PHASE.PEAK]);
  });

  it('keeps peak and land only, in clip order', () => {
    expect(applyPhases(clip, ['land', 'peak']).map((f) => f.phase)).toEqual([PHASE.PEAK, PHASE.LAND]);
  });

  it('drops frames without a pose when picking a subset', () => {
    expect(applyPhases([frame(undefined, false), frame(PHASE.PEAK)], ['peak'])).toHaveLength(1);
  });

  it('does not mutate the input', () => {
    const copy = [...clip];
    applyPhases(clip, ['load']);
    expect(clip).toEqual(copy);
  });
});
