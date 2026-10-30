import { MODES } from '../../constants/modes';
import type { ArtMode } from '../../types';
import './ModeGrid.css';

interface Props {
  value: ArtMode;
  onChange: (mode: ArtMode) => void;
}

export function ModeGrid({ value, onChange }: Props) {
  return (
    <div className="mode-grid">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`mode-card${m.id === value ? ' active' : ''}`}
          onClick={() => onChange(m.id)}
        >
          <span className="mode-card__icon">{m.icon}</span>
          <div className="mode-card__name">{m.label}</div>
        </button>
      ))}
    </div>
  );
}
