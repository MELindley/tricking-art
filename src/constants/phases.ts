import type { Phase, TrickPhase } from '../types';
import { PHASE } from './pose';

export interface PhaseDef {
  id: TrickPhase;
  label: string;
  phase: Phase;
}

/** The pickable phases, in trick order. Idle frames only appear when every phase is picked. */
export const TRICK_PHASES: readonly PhaseDef[] = [
  { id: 'load', label: 'Load', phase: PHASE.LOAD },
  { id: 'launch', label: 'Launch', phase: PHASE.LAUNCH },
  { id: 'peak', label: 'Peak', phase: PHASE.PEAK },
  { id: 'land', label: 'Land', phase: PHASE.LAND },
];

export const ALL_PHASES: readonly TrickPhase[] = TRICK_PHASES.map((p) => p.id);
