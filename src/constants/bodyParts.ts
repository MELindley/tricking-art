import type { BodyPart } from '../types';
import { POSE_JOINTS } from './pose';

export interface BodyPartDef {
  id: BodyPart;
  label: string;
  /** MediaPipe landmark indices that make up the part. */
  joints: readonly number[];
  /** Pairs of those landmarks drawn as limbs. */
  bones: ReadonlyArray<readonly [number, number]>;
}

/**
 * Left/right follow MediaPipe: they are the athlete's own left and right
 * (11/13/15/23/25/27/29/31 are left; 12/14/16/24/26/28/30/32 are right).
 * 0=nose, 7/8=ears, 11/12=shoulders, 13/14=elbows, 15/16=wrists,
 * 23/24=hips, 27/28=ankles, 29/30=heels, 31/32=foot index (toes).
 */
export const BODY_PARTS: readonly BodyPartDef[] = [
  { id: 'head', label: 'Head', joints: [0, 7, 8], bones: [[7, 0], [0, 8]] },
  { id: 'torso', label: 'Torso', joints: [11, 12, 23, 24], bones: [[11, 12], [11, 23], [12, 24], [23, 24]] },
  { id: 'leftArm', label: 'L Arm', joints: [11, 13, 15], bones: [[11, 13], [13, 15]] },
  { id: 'rightArm', label: 'R Arm', joints: [12, 14, 16], bones: [[12, 14], [14, 16]] },
  { id: 'leftFoot', label: 'L Foot', joints: [27, 29, 31], bones: [[27, 29], [29, 31], [27, 31]] },
  { id: 'rightFoot', label: 'R Foot', joints: [28, 30, 32], bones: [[28, 30], [30, 32], [28, 32]] },
];

export const ALL_BODY_PARTS: readonly BodyPart[] = BODY_PARTS.map((p) => p.id);

/** Every joint we derive keypoints and velocities for: the whole-body set plus the extra foot/ear landmarks. */
const WHOLE_BODY: readonly number[] = POSE_JOINTS;
export const TRACKED_JOINTS: readonly number[] = [
  ...WHOLE_BODY,
  ...BODY_PARTS.flatMap((p) => p.joints).filter((j, i, all) => !WHOLE_BODY.includes(j) && all.indexOf(j) === i),
];
