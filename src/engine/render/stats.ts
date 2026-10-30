import { PHASE_NAMES } from '../../constants/pose';
import type { ArtMode, ArtStats, FrameData } from '../../types';

export function computeStats(frames: FrameData[], mode: ArtMode, maxEnergy: number, poseHits: number): ArtStats {
  const stats: ArtStats = { frames: frames.length, energy: maxEnergy, mode, poseHits };

  const poseFrames = frames.filter((f) => f.isPose && f.phase !== undefined);
  if (poseHits > 0 && poseFrames.length) {
    const counts = [0, 0, 0, 0, 0];
    let air = 0;
    for (const f of poseFrames) {
      counts[f.phase!]++;
      if (f.isAirborne) air++;
    }
    stats.dominantPhase = PHASE_NAMES[counts.indexOf(Math.max(...counts))];
    if (air > 0) stats.airPct = Math.round((air / poseFrames.length) * 100);
  }
  return stats;
}
