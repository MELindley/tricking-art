import { describe, expect, it } from 'vitest';
import { PALETTES } from '../src/constants/palettes';
import { rgba } from '../src/lib/color';
import { sleep } from '../src/lib/async';
import { buildRenderParams, renderStill } from '../src/engine/render';
import type { ArtMode, ArtSettings, FrameData, Landmark } from '../src/types';

/** A 2D context that accepts any call and records the method names. */
function mockCtx() {
  const calls: string[] = [];
  const target: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop: () => {} });
      }
      if (prop === 'measureText') return () => ({ width: 10 });
      return (...args: unknown[]) => {
        calls.push(String(prop));
        void args;
      };
    },
    set(t, prop, value) {
      t[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const settings = (mode: ArtMode): ArtSettings => ({
  mode,
  palette: PALETTES[0].colors,
  lineWeight: 2,
  glow: 0.6,
  symmetry: 3,
  persistence: 0.85,
});

const landmarks = (): Landmark[] =>
  Array.from({ length: 33 }, (_, i) => ({ x: 0.3 + (i % 5) * 0.1, y: 0.2 + (i % 7) * 0.08, z: 0, visibility: 1 }));

const frame = (i: number, n: number, pose: boolean): FrameData => ({
  keypoints: [{ x: 0.5, y: 0.5, energy: 0.8, jointIdx: 15, visibility: 1 }],
  motionPoints: [{ x: 0.5, y: 0.5, energy: 0.8 }],
  energy: 0.5 + i,
  centroid: { x: 0.5, y: 0.5 },
  isPose: pose,
  landmarks: pose ? landmarks() : undefined,
  phase: pose ? ((i % 5) as 0 | 1 | 2 | 3 | 4) : undefined,
  isAirborne: pose && i % 2 === 0,
  time: i / n,
  videoTime: i,
  videoSnapshot: '',
  snapW: 0,
  snapH: 0,
  eN: 0,
});

const MODES: ArtMode[] = ['trail', 'mandala', 'ghost', 'flow'];

describe.each(MODES)('%s renderer', (mode) => {
  const p = buildRenderParams(settings(mode), 1080, 1920);

  it('draws pose frames without throwing', () => {
    const { ctx, calls } = mockCtx();
    const frames = Array.from({ length: 12 }, (_, i) => frame(i, 12, true));
    expect(() => renderStill(ctx, frames, p, mode)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
  });

  it('draws pixel-diff (no pose) frames without throwing', () => {
    const { ctx } = mockCtx();
    const frames = Array.from({ length: 12 }, (_, i) => frame(i, 12, false));
    expect(() => renderStill(ctx, frames, p, mode)).not.toThrow();
  });

  it('handles a single frame', () => {
    const { ctx } = mockCtx();
    expect(() => renderStill(ctx, [frame(0, 1, true)], p, mode)).not.toThrow();
  });

  it('handles a clip with no frames', () => {
    const { ctx } = mockCtx();
    expect(() => renderStill(ctx, [], p, mode)).not.toThrow();
  });

  it('survives a frame with no motion points / keypoints', () => {
    const { ctx } = mockCtx();
    const empty = { ...frame(0, 1, false), keypoints: [], motionPoints: [] };
    expect(() => renderStill(ctx, [empty], p, mode)).not.toThrow();
  });
});

describe('rgba', () => {
  it('formats a css colour', () => {
    expect(rgba({ r: 1, g: 2, b: 3 }, 0.5)).toBe('rgba(1,2,3,0.5)');
  });
});

describe('sleep', () => {
  it('resolves after the delay', async () => {
    const t = Date.now();
    await sleep(20);
    expect(Date.now() - t).toBeGreaterThanOrEqual(15);
  });
});
