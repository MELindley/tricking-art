import { hexToRgb, rgba } from '../../lib/color';
import type { FrameData, RenderParams } from '../../types';
import { isVisible, symmetryAngle } from './geometry';

/**
 * Energy mandala radiating from the centre of the art zone.
 * Pose: each bone becomes a petal (length/angle drive its shape).
 * Fallback: keypoint cloud spiral.
 */
export function drawMandalaFrame(
  ctx: CanvasRenderingContext2D,
  fr: FrameData,
  fi: number,
  total: number,
  p: RenderParams,
): void {
  const { cX: cx, cY: cy, SIZE } = p;
  const axes = Math.max(p.symmetry, 6);
  const t = fi / total;
  const ci = Math.floor(t * p.palette.length) % p.palette.length;
  const color = hexToRgb(p.palette[ci]);
  const baseR = ((0.1 + fr.eN * 0.4) * SIZE) / 2;
  const alpha = 0.1 + fr.eN * 0.4;

  if (p.glow > 0) {
    ctx.shadowBlur = 10 + fr.eN * 30 * p.glow;
    ctx.shadowColor = p.palette[ci];
  }

  for (let axis = 0; axis < axes; axis++) {
    const axisAngle = symmetryAngle(axis, axes);

    if (fr.isPose && fr.landmarks) {
      for (const [ia, ib] of p.bones) {
        const a = fr.landmarks[ia];
        const b = fr.landmarks[ib];
        if (!isVisible(a, b)) continue;
        const boneAngle = Math.atan2(b.y - a.y, b.x - a.x);
        const boneLen = Math.hypot(b.x - a.x, b.y - a.y);
        const r = baseR * (0.3 + boneLen * 3);
        const petal = axisAngle + t * Math.PI * 4 + boneAngle;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(
          cx + Math.cos(petal + 0.3) * r * 0.6,
          cy + Math.sin(petal + 0.3) * r * 0.6,
          cx + Math.cos(petal) * r,
          cy + Math.sin(petal) * r,
        );
        ctx.strokeStyle = rgba(color, alpha * ((a.visibility + b.visibility) / 2));
        ctx.lineWidth = p.lineWeight * (0.5 + fr.eN);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    } else {
      const count = fr.keypoints.length;
      const pointAt = (ki: number) => {
        const kp = fr.keypoints[ki];
        const ang = axisAngle + t * Math.PI * 4 + ki * ((Math.PI * 2) / count);
        const rad = baseR * (0.3 + kp.energy * 0.7) + ki * (SIZE * 0.025);
        return [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad] as const;
      };
      for (let ki = 0; ki < count; ki++) {
        const [x, y] = pointAt(ki);
        ctx.beginPath();
        ctx.arc(x, y, p.lineWeight + fr.keypoints[ki].energy * 3, 0, Math.PI * 2);
        ctx.fillStyle = rgba(color, alpha);
        ctx.fill();
        if (ki > 0) {
          const [px, py] = pointAt(ki - 1);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.quadraticCurveTo(cx, cy, x, y);
          ctx.strokeStyle = rgba(color, alpha * 0.3);
          ctx.lineWidth = p.lineWeight * 0.4;
          ctx.stroke();
        }
      }
    }
  }
  ctx.shadowBlur = 0;
}
