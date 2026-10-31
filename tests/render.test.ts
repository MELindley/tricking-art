import { describe, expect, it } from 'vitest';
import { ALL_BODY_PARTS } from '../src/constants/bodyParts';
import { PALETTES } from '../src/constants/palettes';
import { hexToRgb } from '../src/lib/color';
import { symPoint } from '../src/engine/render/geometry';
import { buildRenderParams } from '../src/engine/render/params';
import { normalizeEnergy } from '../src/engine/render';
import { computeStats } from '../src/engine/render/stats';
import type { ArtSettings, FrameData } from '../src/types';

const settings: ArtSettings = {
  mode: 'trail',
  palette: PALETTES[0].colors,
  lineWeight: 2,
  glow: 0.6,
  symmetry: 1,
  persistence: 0.85,
  bodyParts: ALL_BODY_PARTS,
};

const frame = (energy: number, extra: Partial<FrameData> = {}): FrameData => ({
  keypoints: [],
  motionPoints: [],
  energy,
  centroid: { x: 0.5, y: 0.5 },
  isPose: false,
  time: 0,
  videoTime: 0,
  videoSnapshot: '',
  snapW: 0,
  snapH: 0,
  eN: 0,
  ...extra,
});

describe('hexToRgb', () => {
  it('parses #rrggbb', () => {
    expect(hexToRgb('#e8ff3c')).toEqual({ r: 232, g: 255, b: 60 });
  });
});

describe('buildRenderParams', () => {
  it('centres a landscape clip in a square art zone inside the 9:16 canvas', () => {
    const p = buildRenderParams(settings, 1920, 1080);
    expect(p.CANVAS_W).toBe(1080);
    expect(p.CANVAS_H).toBe(1920);
    expect(p.artOffY).toBe(420);
    expect(p.scale).toBeCloseTo(1080 / 1920);
    expect(p.offX).toBe(0);
    expect(p.offY).toBeCloseTo(420 + (1080 - 1080 * p.scale) / 2);
    expect(p.cX).toBe(540);
    expect(p.cY).toBe(960);
  });
});

describe('symPoint', () => {
  const p = buildRenderParams(settings, 1000, 1000);

  it('puts the body centre exactly on the canvas pivot, whatever the angle', () => {
    const body = { x: p.offX + 0.3 * p.W * p.scale, y: p.offY + 0.7 * p.H * p.scale };
    for (const angle of [0, 1, Math.PI]) {
      const [x, y] = symPoint(0.3, 0.7, angle, p, body);
      expect(x).toBeCloseTo(p.cX);
      expect(y).toBeCloseTo(p.cY);
    }
  });

  it('rotates other points around that pivot', () => {
    const body = { x: p.offX, y: p.offY };
    const [x0, y0] = symPoint(0.1, 0, 0, p, body);
    const [x1, y1] = symPoint(0.1, 0, Math.PI, p, body);
    expect(x0 - p.cX).toBeCloseTo(-(x1 - p.cX));
    expect(y0 - p.cY).toBeCloseTo(-(y1 - p.cY));
  });
});

describe('normalizeEnergy', () => {
  it('scales against the loudest frame and returns it', () => {
    const frames = [frame(2), frame(4), frame(1)];
    expect(normalizeEnergy(frames)).toBe(4);
    expect(frames.map((f) => f.eN)).toEqual([0.5, 1, 0.25]);
  });

  it('never divides by less than 1', () => {
    const frames = [frame(0.2)];
    expect(normalizeEnergy(frames)).toBe(1);
    expect(frames[0].eN).toBeCloseTo(0.2);
  });
});

describe('computeStats', () => {
  it('omits pose stats when pose never matched', () => {
    const s = computeStats([frame(1)], 'flow', 1, 0);
    expect(s.dominantPhase).toBeUndefined();
    expect(s.airPct).toBeUndefined();
  });

  it('reports the dominant phase and air-time share', () => {
    const f = (phase: 0 | 1 | 2 | 3 | 4, air: boolean) => frame(1, { isPose: true, phase, isAirborne: air });
    const s = computeStats([f(3, true), f(3, true), f(0, false), f(0, false), f(3, false)], 'trail', 1, 5);
    expect(s.dominantPhase).toBe('PEAK');
    expect(s.airPct).toBe(40);
  });
});
