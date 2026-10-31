import { ALL_BODY_PARTS, BODY_PARTS } from '../../constants/bodyParts';
import { POSE_JOINTS, SKELETON } from '../../constants/pose';
import type { BodyPart, FrameData } from '../../types';

export interface PartSelection {
  /** True when every part (or none) is picked: the original whole-body look. */
  isAll: boolean;
  joints: ReadonlySet<number>;
  bones: ReadonlyArray<readonly [number, number]>;
}

/** Turns a list of picked body parts into the landmarks and limbs to draw. */
export function resolveSelection(parts: readonly BodyPart[]): PartSelection {
  const picked = new Set(parts);
  if (picked.size === 0 || ALL_BODY_PARTS.every((p) => picked.has(p))) {
    return { isAll: true, joints: new Set<number>(POSE_JOINTS), bones: SKELETON };
  }
  const defs = BODY_PARTS.filter((d) => picked.has(d.id));
  const joints = new Set(defs.flatMap((d) => d.joints));
  const seen = new Set<string>();
  const bones = defs.flatMap((d) => d.bones).filter(([a, b]) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { isAll: false, joints, bones };
}

/** Rough scale so a part's mean joint speed reads on the same 0–1 range as whole-body energy. */
const PART_ENERGY_GAIN = 60;

export interface PartFrames {
  frames: FrameData[];
  /** Peak energy of the selection on the 0–1 stat scale, or null for the whole body (use the render's own peak). */
  peakEnergy: number | null;
}

/**
 * Restricts analysed frames to the picked body parts. Returns new frames, so the
 * extraction result can be re-filtered with a different selection.
 *
 * - Whole body: pose frames keep the original joint set, everything else is untouched.
 * - A subset: keypoints and motion points are cut down to the picked joints, and the
 *   frame energy is rebuilt from just those joints (normalised to the clip's peak), so
 *   the art follows the part rather than the body. Frames without a pose have no body
 *   parts to follow and are emptied.
 */
export function applyBodyParts(frames: readonly FrameData[], parts: readonly BodyPart[]): PartFrames {
  const sel = resolveSelection(parts);

  const restrict = (fr: FrameData): FrameData => {
    if (!fr.isPose) return sel.isAll ? fr : { ...fr, keypoints: [], motionPoints: [], energy: 0 };
    const keep = fr.keypoints.flatMap((kp, i) => (sel.joints.has(kp.jointIdx ?? -1) ? [i] : []));
    return {
      ...fr,
      keypoints: keep.map((i) => fr.keypoints[i]),
      // motionPoints run parallel to keypoints for pose frames.
      motionPoints: keep.map((i) => fr.motionPoints[i]).filter(Boolean),
    };
  };

  const restricted = frames.map(restrict);
  if (sel.isAll) return { frames: restricted, peakEnergy: null };

  const raw = restricted.map((fr) => {
    if (!fr.isPose || !fr.velocities) return 0;
    const speeds = [...sel.joints].map((j) => fr.velocities![j] ?? 0);
    return speeds.reduce((s, v) => s + v, 0) / Math.max(speeds.length, 1);
  });
  const peak = Math.max(...raw, 0);
  return {
    frames: restricted.map((fr, i) => ({ ...fr, energy: peak > 0 ? raw[i] / peak : 0 })),
    peakEnergy: Math.min(peak * PART_ENERGY_GAIN, 1),
  };
}
