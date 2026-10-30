import type { Keypoint, MotionPoint, Point } from '../../types';

const BLOCK = 16;
const MOTION_THRESHOLD = 15;
/** Max colour distance between two RGB pixels (sqrt(3 * 255²)). */
const MAX_RGB_DIST = 442;

export function computeCentroid(pts: MotionPoint[]): Point {
  if (!pts.length) return { x: 0.5, y: 0.5 };
  const s = pts.reduce(
    (a, p) => ({ x: a.x + p.x * p.energy, y: a.y + p.y * p.energy, w: a.w + p.energy }),
    { x: 0, y: 0, w: 0 },
  );
  return s.w ? { x: s.x / s.w, y: s.y / s.w } : { x: 0.5, y: 0.5 };
}

/** Picks up to 8 well-separated high-energy blocks to act as pseudo-keypoints. */
export function deriveKeypoints(pts: MotionPoint[]): Keypoint[] {
  if (!pts.length) return [];
  const kp: Keypoint[] = [];
  for (const pt of [...pts].sort((a, b) => b.energy - a.energy).slice(0, 12)) {
    if (!kp.some((k) => Math.hypot(k.x - pt.x, k.y - pt.y) < 0.08)) kp.push(pt);
    if (kp.length >= 8) break;
  }
  return kp;
}

export interface DiffResult {
  motionPoints: MotionPoint[];
  energy: number;
}

/** Block-based pixel difference between two frames (fallback when no pose is available). */
export function diffFrames(curr: ImageData, prev: ImageData | null): DiffResult {
  const { width: W, height: H, data } = curr;
  const motionPoints: MotionPoint[] = [];
  let totalMotion = 0;

  if (prev) {
    const p = prev.data;
    for (let y = 0; y < H; y += BLOCK) {
      for (let x = 0; x < W; x += BLOCK) {
        const i = (y * W + x) * 4;
        const dr = data[i] - p[i];
        const dg = data[i + 1] - p[i + 1];
        const db = data[i + 2] - p[i + 2];
        const m = Math.sqrt(dr * dr + dg * dg + db * db);
        if (m > MOTION_THRESHOLD) {
          motionPoints.push({ x: x / W, y: y / H, energy: m / MAX_RGB_DIST });
          totalMotion += m;
        }
      }
    }
  }
  return { motionPoints, energy: totalMotion / ((W * H) / BLOCK / BLOCK) };
}

/** Normalised colour distance (0–1) at one pixel. */
export function pixelDiff(curr: ImageData, prev: ImageData, px: number, py: number): number {
  const i = (py * curr.width + px) * 4;
  if (i < 0 || i >= curr.data.length - 4) return 0;
  const dr = curr.data[i] - prev.data[i];
  const dg = curr.data[i + 1] - prev.data[i + 1];
  const db = curr.data[i + 2] - prev.data[i + 2];
  return Math.sqrt(dr * dr + dg * dg + db * db) / MAX_RGB_DIST;
}
