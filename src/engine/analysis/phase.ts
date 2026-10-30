import { PHASE, PHASE_WINDOW } from '../../constants/pose';
import type { Landmark, Phase } from '../../types';

/** Both ankles at least 8% of the frame height above the hips. */
export function detectAirTime(landmarks: Landmark[]): boolean {
  const hipL = landmarks[23];
  const hipR = landmarks[24];
  const ankleL = landmarks[27];
  const ankleR = landmarks[28];
  if (hipL.visibility < 0.3 || hipR.visibility < 0.3) return false;
  const hipY = (hipL.y + hipR.y) / 2;
  // y grows downward, so "above" means a smaller y.
  const ankleY = (ankleL.y + ankleR.y) / 2;
  return ankleY < hipY - 0.08;
}

interface HipSample {
  y: number | null;
  energy: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);

/** Classifies each frame as idle / load / launch / peak / land from hip trajectory + body energy. */
export class PhaseDetector {
  private history: HipSample[] = [];

  reset(): void {
    this.history = [];
  }

  update(landmarks: Landmark[], bodyEnergy: number, velocities: Record<number, number>): Phase {
    const hipL = landmarks[23];
    const hipR = landmarks[24];
    const hipY = hipL.visibility > 0.3 && hipR.visibility > 0.3 ? (hipL.y + hipR.y) / 2 : null;

    this.history.push({ y: hipY, energy: bodyEnergy });
    if (this.history.length > PHASE_WINDOW * 2) this.history.shift();
    if (this.history.length < 3) return PHASE.IDLE;

    const recent = this.history.slice(-PHASE_WINDOW);
    const older = this.history.slice(-PHASE_WINDOW * 2, -PHASE_WINDOW);
    const ys = (xs: HipSample[]) => xs.flatMap((h) => (h.y === null ? [] : [h.y]));

    // Negative trend = hips moving up the frame.
    const hipTrend = mean(ys(recent)) - mean(ys(older));
    const avgEnergy = mean(recent.map((h) => h.energy));

    const wristVel = Math.max(velocities[15] ?? 0, velocities[16] ?? 0);
    const ankleVel = Math.max(velocities[27] ?? 0, velocities[28] ?? 0);
    const limbVel = Math.max(wristVel, ankleVel);

    if (detectAirTime(landmarks)) return PHASE.PEAK;
    if (hipTrend < -0.015 && limbVel > 0.008) return PHASE.LAUNCH;
    if (hipTrend > 0.015 && avgEnergy > 0.3) return PHASE.LAND;
    if (limbVel > 0.01 && avgEnergy > 0.2) return PHASE.LOAD;
    return PHASE.IDLE;
  }
}
