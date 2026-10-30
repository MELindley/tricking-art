import { EXTREMITY_JOINTS, PHASE, PHASE_PALETTE_IDX, SKELETON } from '../../constants/pose';
import { hexToRgb, rgba } from '../../lib/color';
import type { FrameData, RenderParams } from '../../types';
import { bodyCentre, isVisible, symmetryAngle, symPoint } from './geometry';

/**
 * Motion trail. Pose: anatomically correct limbs coloured by trick phase.
 * Fallback: dot cloud of the strongest motion blocks.
 */
export function drawTrailFrame(
  ctx: CanvasRenderingContext2D,
  fr: FrameData,
  fi: number,
  total: number,
  p: RenderParams,
): void {
  const t = fr.time ?? fi / total;
  const n = p.palette.length;
  const timeIdx = Math.floor(t * n) % n;
  const paletteIdx = (fr.isPose && fr.phase !== undefined ? PHASE_PALETTE_IDX[fr.phase] : timeIdx) % n;
  const color = hexToRgb(p.palette[paletteIdx]);

  // Brighter during air time and peak/launch.
  const hot = fr.isAirborne || fr.phase === PHASE.PEAK || fr.phase === PHASE.LAUNCH;
  const alpha = hot ? 0.4 + fr.eN * 0.5 : 0.12 + fr.eN * 0.35;

  if (p.glow > 0) {
    ctx.shadowBlur = hot ? 16 + fr.eN * 30 * p.glow : 6 + fr.eN * 14 * p.glow;
    ctx.shadowColor = p.palette[paletteIdx];
  }

  const body = bodyCentre(fr, p);

  if (fr.isPose && fr.landmarks) {
    const lms = fr.landmarks;
    for (let sym = 0; sym < p.symmetry; sym++) {
      const angle = symmetryAngle(sym, p.symmetry);

      for (const [ia, ib] of SKELETON) {
        const a = lms[ia];
        const b = lms[ib];
        if (!isVisible(a, b)) continue;
        const [ax, ay] = symPoint(a.x, a.y, angle, p, body);
        const [bx, by] = symPoint(b.x, b.y, angle, p, body);
        const velA = fr.velocities?.[ia] ?? 0;
        const velB = fr.velocities?.[ib] ?? 0;
        const weight = p.lineWeight * (0.4 + ((velA + velB) / 2) * 60 + fr.eN * 0.8);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = rgba(color, alpha * ((a.visibility + b.visibility) / 2));
        ctx.lineWidth = Math.min(weight, p.lineWeight * 4);
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      for (const kp of fr.keypoints) {
        const extremity = EXTREMITY_JOINTS.includes(kp.jointIdx ?? -1);
        const velBoost = (fr.velocities?.[kp.jointIdx ?? -1] ?? 0) * 40;
        const r =
          p.lineWeight * (extremity ? 2.5 : 1.2) +
          kp.energy * 3 +
          velBoost +
          (fr.isAirborne && extremity ? 3 : 0);
        const [kx, ky] = symPoint(kp.x, kp.y, angle, p, body);
        ctx.beginPath();
        ctx.arc(kx, ky, Math.min(r, p.lineWeight * 6), 0, Math.PI * 2);
        ctx.fillStyle = rgba(color, alpha * (kp.visibility ?? 1));
        ctx.fill();
      }
    }
  } else {
    for (const kp of fr.keypoints) {
      for (let s = 0; s < p.symmetry; s++) {
        const [kx, ky] = symPoint(kp.x, kp.y, symmetryAngle(s, p.symmetry), p, body);
        ctx.beginPath();
        ctx.arc(kx, ky, p.lineWeight + kp.energy * 4, 0, Math.PI * 2);
        ctx.fillStyle = rgba(color, alpha);
        ctx.fill();
      }
    }
  }
  ctx.shadowBlur = 0;
}
