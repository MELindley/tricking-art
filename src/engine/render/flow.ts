import { hexToRgb, rgba } from '../../lib/color';
import type { FrameData, RenderParams } from '../../types';

const GRID = 40;
const STREAMLINES = 800;
const STEPS = 60;

/**
 * Flow field: accumulates every frame's motion into a coarse grid (energy +
 * outward direction from the body), then traces random streamlines through it.
 * Needs the whole clip, so it is only available as a one-shot render.
 */
export function drawFlowField(ctx: CanvasRenderingContext2D, frames: FrameData[], p: RenderParams): void {
  const { SIZE } = p;
  const energy = new Float32Array(GRID * GRID);
  const dir = new Float32Array(GRID * GRID * 2);

  for (const fr of frames) {
    for (const mp of fr.motionPoints) {
      const gx = Math.floor(mp.x * GRID);
      const gy = Math.floor(mp.y * GRID);
      if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) continue;
      const idx = gy * GRID + gx;
      energy[idx] += mp.energy;
      dir[idx * 2] += mp.x - (fr.centroid?.x ?? 0.5);
      dir[idx * 2 + 1] += mp.y - (fr.centroid?.y ?? 0.5);
    }
  }
  const maxEnergy = Math.max(...energy, 1);

  ctx.save();
  // The field lives in the square art zone, which is centred vertically in the 9:16 canvas.
  ctx.translate(0, p.artOffY);
  if (p.glow > 0) ctx.shadowBlur = 4 * p.glow;

  for (let s = 0; s < STREAMLINES; s++) {
    let x = Math.random() * SIZE;
    let y = Math.random() * SIZE;
    const ci = Math.floor(Math.random() * p.palette.length);
    const color = hexToRgb(p.palette[ci]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    let total = 0;

    for (let step = 0; step < STEPS; step++) {
      const gx = Math.floor((x / SIZE) * GRID);
      const gy = Math.floor((y / SIZE) * GRID);
      if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) break;
      const idx = gy * GRID + gx;
      const e = energy[idx] / maxEnergy;
      total += e;
      const len = Math.hypot(dir[idx * 2], dir[idx * 2 + 1]) || 1;
      const ang = Math.atan2(dir[idx * 2 + 1] / len, dir[idx * 2] / len) + (e * 0.5 - 0.25) * Math.PI;
      x += Math.cos(ang) * (2 + e * 4);
      y += Math.sin(ang) * (2 + e * 4);
      ctx.lineTo(x, y);
    }
    ctx.shadowColor = p.palette[ci];
    ctx.strokeStyle = rgba(color, Math.min(0.05 + (total / STEPS) * 0.4, 0.7));
    ctx.lineWidth = p.lineWeight * 0.4;
    ctx.stroke();
  }
  ctx.restore();
}
