import { ALL_PHASES, TRICK_PHASES } from '../../constants/phases';
import type { FrameData, TrickPhase } from '../../types';

/** True when every phase (or none) is picked: the whole clip, idle frames included. */
export function isAllPhases(phases: readonly TrickPhase[]): boolean {
  return phases.length === 0 || ALL_PHASES.every((p) => phases.includes(p));
}

/**
 * Keeps only the frames whose detected trick phase is picked. All phases returns the
 * frames untouched. Frames without a pose have no phase, so a subset drops them.
 */
export function applyPhases(frames: readonly FrameData[], phases: readonly TrickPhase[]): FrameData[] {
  if (isAllPhases(phases)) return [...frames];
  const wanted = new Set<number>(TRICK_PHASES.filter((d) => phases.includes(d.id)).map((d) => d.phase));
  return frames.filter((fr) => fr.isPose && fr.phase !== undefined && wanted.has(fr.phase));
}
