import type { ArtStats } from '../../types';
import './StatsRow.css';

function Chip({ value, label, pose }: { value: string | number; label: string; pose?: boolean }) {
  return (
    <div className={`stat-chip${pose ? ' stat-chip--pose' : ''}`}>
      <span>{value}</span>
      {label}
    </div>
  );
}

export function StatsRow({ stats }: { stats: ArtStats }) {
  return (
    <div className="stats-row">
      <Chip value={stats.frames} label="FRAMES" />
      {stats.poseHits > 0 && <Chip pose value={stats.poseHits} label="POSE" />}
      {stats.dominantPhase && <Chip value={stats.dominantPhase} label="PHASE" />}
      {stats.airPct !== undefined && <Chip value={`${stats.airPct}%`} label="AIR TIME" />}
      <Chip value={stats.energy.toFixed(1)} label="ENERGY" />
      <Chip value={stats.mode.toUpperCase()} label="MODE" />
    </div>
  );
}
