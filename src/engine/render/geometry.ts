import type { FrameData, Landmark, Point, RenderParams } from '../../types';

/** Where the body sits on the canvas; symmetry copies rotate around the canvas pivot, re-centred on this. */
export function bodyCentre(fr: FrameData, p: RenderParams): Point {
  return {
    x: p.offX + (fr.centroid?.x || 0.5) * p.W * p.scale,
    y: p.offY + (fr.centroid?.y || 0.5) * p.H * p.scale,
  };
}

/**
 * Maps a normalised (0–1) point to canvas coordinates, rotated by `angle` around
 * the body centre and re-anchored on the canvas pivot, so every symmetry copy
 * radiates from the same point wherever the body is in the frame.
 */
export function symPoint(
  nx: number,
  ny: number,
  angle: number,
  p: RenderParams,
  body: Point,
): [number, number] {
  const dx = p.offX + nx * p.W * p.scale - body.x;
  const dy = p.offY + ny * p.H * p.scale - body.y;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [p.cX + dx * cos - dy * sin, p.cY + dx * sin + dy * cos];
}

export const symmetryAngle = (index: number, count: number) => (index / count) * Math.PI * 2;

export const isVisible = (a: Landmark, b: Landmark, min = 0.3) => a.visibility >= min && b.visibility >= min;
