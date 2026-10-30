import type { ProgressState } from '../../hooks/useGenerator';
import './ProgressOverlay.css';

export function ProgressOverlay({ progress }: { progress: ProgressState }) {
  if (!progress.visible) return null;
  return (
    <div className="progress">
      <div className="progress__label">{progress.label}</div>
      <div className="progress__track">
        <div className="progress__bar" style={{ width: `${progress.pct}%` }} />
      </div>
      <div className="progress__detail">{progress.detail}</div>
    </div>
  );
}
