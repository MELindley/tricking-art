import type { ArtMode, FrameData, RenderParams } from '../../types';
import { RENDERERS } from './modes';

export { buildRenderParams } from './params';
export { RENDERERS } from './modes';

/** Sets `eN` on every frame and returns the peak energy. Idempotent. */
export function normalizeEnergy(frames: FrameData[]): number {
  const maxE = Math.max(...frames.map((f) => f.energy), 1);
  for (const f of frames) f.eN = f.energy / maxE;
  return maxE;
}

export interface FadeBarOptions {
  /** Opacity at the outer edge. */
  alpha: number;
  /** Bar height as a multiple of the space above/below the art zone. */
  spread: number;
}

/** Darkens the strips above and below the art zone so the 9:16 canvas blends into black. */
export function drawFadeBars(ctx: CanvasRenderingContext2D, p: RenderParams, { alpha, spread }: FadeBarOptions) {
  const h = p.artOffY * spread;
  if (p.artOffY <= 0) return;
  const solid = `rgba(0,0,0,${alpha})`;
  const clear = 'rgba(0,0,0,0)';

  const top = ctx.createLinearGradient(0, 0, 0, h);
  top.addColorStop(0, solid);
  top.addColorStop(1, clear);
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, p.CANVAS_W, h);

  const bottom = ctx.createLinearGradient(0, p.CANVAS_H - h, 0, p.CANVAS_H);
  bottom.addColorStop(0, clear);
  bottom.addColorStop(1, solid);
  ctx.fillStyle = bottom;
  ctx.fillRect(0, p.CANVAS_H - h, p.CANVAS_W, h);
}

/** Renders the finished still image for `mode` onto `ctx`. Returns the peak energy. */
export function renderStill(
  ctx: CanvasRenderingContext2D,
  frames: FrameData[],
  p: RenderParams,
  mode: ArtMode,
): number {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, p.CANVAS_W, p.CANVAS_H);

  const maxE = normalizeEnergy(frames);
  const renderer = RENDERERS[mode];
  if (renderer.drawAll) renderer.drawAll(ctx, frames, p);
  else frames.forEach((fr, i) => renderer.drawFrame?.(ctx, fr, i, frames.length, p));

  drawFadeBars(ctx, p, { alpha: 1, spread: 1 });
  return maxE;
}
