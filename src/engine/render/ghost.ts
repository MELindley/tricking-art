import { SKELETON } from '../../constants/pose';
import { hexToRgb, rgba } from '../../lib/color';
import type { FrameData, RenderParams } from '../../types';
import { bodyCentre, isVisible, symmetryAngle, symPoint } from './geometry';

const GHOST_COUNT = 20;

/**
 * Ghost stack: ~20 evenly spaced "echoes" of the body.
 * Pose: skeleton + head ring. Fallback: polygon through the keypoints.
 * Frames that are not echoes draw nothing.
 */
export function drawGhostFrame(
  ctx: CanvasRenderingContext2D,
  fr: FrameData,
  fi: number,
  total: number,
  p: RenderParams,
): void {
  const step = Math.max(1, Math.floor(total / GHOST_COUNT));
  if (fi % step !== 0) return;

  const ghostIdx = fi / step;
  const ghostTotal = Math.ceil(total / step);
  const t = ghostIdx / ghostTotal;
  const ci = Math.floor(t * p.palette.length) % p.palette.length;
  const color = hexToRgb(p.palette[ci]);
  const alpha = 0.07 + fr.eN * 0.22;

  if (p.glow > 0) {
    ctx.shadowBlur = 12 + fr.eN * 25 * p.glow;
    ctx.shadowColor = p.palette[ci];
  }

  const body = bodyCentre(fr, p);
  for (let sym = 0; sym < p.symmetry; sym++) {
    const angle = symmetryAngle(sym, p.symmetry);

    if (fr.isPose && fr.landmarks) {
      for (const [ia, ib] of SKELETON) {
        const a = fr.landmarks[ia];
        const b = fr.landmarks[ib];
        if (!isVisible(a, b)) continue;
        const [ax, ay] = symPoint(a.x, a.y, angle, p, body);
        const [bx, by] = symPoint(b.x, b.y, angle, p, body);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = rgba(color, alpha * 1.5);
        ctx.lineWidth = p.lineWeight * 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      const nose = fr.landmarks[0];
      if (nose.visibility > 0.3) {
        const [nx, ny] = symPoint(nose.x, nose.y, angle, p, body);
        ctx.beginPath();
        ctx.arc(nx, ny, p.lineWeight * 3, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(color, alpha * 1.5);
        ctx.lineWidth = p.lineWeight;
        ctx.stroke();
      }
    } else if (fr.keypoints.length > 2) {
      ctx.beginPath();
      fr.keypoints.forEach((kp, i) => {
        const [x, y] = symPoint(kp.x, kp.y, angle, p, body);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = p.lineWeight;
      ctx.stroke();
      ctx.fillStyle = rgba(color, alpha * 0.1);
      ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
}
