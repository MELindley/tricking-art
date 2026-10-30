import { POSE_JOINTS, VELOCITY_WINDOW } from '../../constants/pose';
import type { Landmark } from '../../types';

interface Sample {
  x: number;
  y: number;
}

/** Rolling per-joint position history → average speed (normalised units / frame). */
export class VelocityTracker {
  private history = new Map<number, Sample[]>();

  reset(): void {
    this.history.clear();
  }

  update(landmarks: Landmark[]): Record<number, number> {
    const velocities: Record<number, number> = {};
    for (const idx of POSE_JOINTS) {
      const lm = landmarks[idx];
      let hist = this.history.get(idx);
      if (!hist) this.history.set(idx, (hist = []));
      hist.push({ x: lm.x, y: lm.y });
      if (hist.length > VELOCITY_WINDOW) hist.shift();

      let total = 0;
      for (let i = 1; i < hist.length; i++) {
        total += Math.hypot(hist[i].x - hist[i - 1].x, hist[i].y - hist[i - 1].y);
      }
      velocities[idx] = hist.length >= 2 ? total / (hist.length - 1) : 0;
    }
    return velocities;
  }
}
