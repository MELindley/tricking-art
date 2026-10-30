import { PALETTES } from '../../constants/palettes';
import './PaletteRow.css';

interface Props {
  value: number;
  onChange: (index: number) => void;
}

export function PaletteRow({ value, onChange }: Props) {
  return (
    <div className="pal-row">
      {PALETTES.map((p, i) => (
        <button
          key={p.name}
          type="button"
          title={p.name}
          aria-label={p.name}
          aria-pressed={i === value}
          className={`pal-chip${i === value ? ' active' : ''}`}
          style={{ background: `linear-gradient(135deg,${p.colors.slice(0, 3).join(',')})` }}
          onClick={() => onChange(i)}
        />
      ))}
    </div>
  );
}
