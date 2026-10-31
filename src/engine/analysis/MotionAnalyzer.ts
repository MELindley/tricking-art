import { TRACKED_JOINTS } from '../../constants/bodyParts';
import { POSE_JOINTS } from '../../constants/pose';
import type { AnalyzedFrame, Keypoint, Landmark } from '../../types';
import { computeCentroid, deriveKeypoints, diffFrames, pixelDiff } from './frameDiff';
import { detectAirTime, PhaseDetector } from './phase';
import { VelocityTracker } from './velocity';

/**
 * Stateful per-clip analyser. Feed it frames in order; it keeps the history
 * (previous pixels, joint velocities, hip trajectory) the heuristics need.
 */
export class MotionAnalyzer {
  private prev: ImageData | null = null;
  private velocity = new VelocityTracker();
  private phase = new PhaseDetector();

  reset(): void {
    this.prev = null;
    this.velocity.reset();
    this.phase.reset();
  }

  /** Analyse a frame using MediaPipe landmarks. */
  fromLandmarks(landmarks: Landmark[], img: ImageData): AnalyzedFrame {
    const { width: W, height: H } = img;
    const velocities = this.velocity.update(landmarks);

    const keypoints: Keypoint[] = TRACKED_JOINTS.map((idx) => {
      const lm = landmarks[idx];
      const velocity = velocities[idx] ?? 0;
      return {
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility,
        velocity,
        // Blend of detection confidence and speed.
        energy: Math.min(lm.visibility * 0.4 + velocity * 20, 1),
        jointIdx: idx,
      };
    }).filter((kp) => (kp.visibility ?? 0) > 0.4);

    // Body energy stays defined by the original joint set, whatever extra joints are tracked.
    const totalVel = POSE_JOINTS.reduce<number>((s, idx) => s + (velocities[idx] ?? 0), 0);
    const bodyEnergy = Math.min(totalVel * 15, 1);

    const phase = this.phase.update(landmarks, bodyEnergy, velocities);
    const isAirborne = detectAirTime(landmarks);

    // Add a little pixel-level texture to each keypoint's energy.
    if (this.prev) {
      for (const kp of keypoints) {
        const d = pixelDiff(img, this.prev, Math.floor(kp.x * W), Math.floor(kp.y * H));
        kp.energy = Math.min(kp.energy + d * 0.3, 1);
      }
    }
    this.remember(img);

    const hipL = landmarks[23];
    const hipR = landmarks[24];
    return {
      keypoints,
      landmarks,
      velocities,
      motionPoints: keypoints.map((kp) => ({ x: kp.x, y: kp.y, energy: kp.energy })),
      energy: bodyEnergy,
      centroid: { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2 },
      phase,
      isAirborne,
      isPose: true,
    };
  }

  /** Analyse a frame by pixel difference only (no pose available). */
  fromDiff(img: ImageData): AnalyzedFrame {
    const { motionPoints, energy } = diffFrames(img, this.prev);
    this.remember(img);
    return {
      keypoints: deriveKeypoints(motionPoints),
      motionPoints,
      energy,
      centroid: computeCentroid(motionPoints),
      isPose: false,
    };
  }

  private remember(img: ImageData): void {
    this.prev = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
  }
}
