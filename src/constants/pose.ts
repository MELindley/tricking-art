import type { Phase } from '../types';

/**
 * MediaPipe landmark indices we care about for tricking.
 * 0=nose, 11/12=shoulders, 13/14=elbows, 15/16=wrists,
 * 23/24=hips, 25/26=knees, 27/28=ankles.
 */
export const POSE_JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28] as const;

export const EXTREMITY_JOINTS: readonly number[] = [15, 16, 27, 28];

/** Skeleton connections: pairs of landmark indices drawn as limbs. */
export const SKELETON: ReadonlyArray<readonly [number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // arms
  [11, 23], [12, 24], [23, 24], //                     torso
  [23, 25], [25, 27], [24, 26], [26, 28], //           legs
  [0, 11], [0, 12], //                                 neck
];

export const PHASE = { IDLE: 0, LOAD: 1, LAUNCH: 2, PEAK: 3, LAND: 4 } as const satisfies Record<string, Phase>;

export const PHASE_NAMES = ['IDLE', 'LOAD', 'LAUNCH', 'PEAK', 'LAND'] as const;

/** Phase → index into the active palette. */
export const PHASE_PALETTE_IDX: Record<Phase, number> = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3 };

/** Number of recent frames used to average joint velocity. */
export const VELOCITY_WINDOW = 3;
/** Half-window (frames) used to compare hip height for phase detection. */
export const PHASE_WINDOW = 6;
