import { ALL_BODY_PARTS, BODY_PARTS } from '../../constants/bodyParts';
import type { BodyPart } from '../../types';
import './BodyPartPicker.css';

interface Props {
  value: readonly BodyPart[];
  onChange: (parts: BodyPart[]) => void;
  disabled?: boolean;
}

/** Multi-select chips choosing which body parts drive the art. At least one stays selected. */
export function BodyPartPicker({ value, onChange, disabled }: Props) {
  const all = value.length === ALL_BODY_PARTS.length;

  const toggle = (id: BodyPart) => {
    if (value.includes(id)) {
      if (value.length > 1) onChange(value.filter((p) => p !== id));
    } else {
      onChange(ALL_BODY_PARTS.filter((p) => p === id || value.includes(p)));
    }
  };

  return (
    <div className={`part-picker${disabled ? ' part-picker--disabled' : ''}`} role="group" aria-label="Body parts to track">
      <button
        type="button"
        className={`part-chip${all ? ' active' : ''}`}
        aria-pressed={all}
        disabled={disabled}
        onClick={() => onChange([...ALL_BODY_PARTS])}
      >
        Whole body
      </button>
      {BODY_PARTS.map((part) => {
        const active = !all && value.includes(part.id);
        return (
          <button
            key={part.id}
            type="button"
            className={`part-chip${active ? ' active' : ''}`}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => (all ? onChange([part.id]) : toggle(part.id))}
          >
            {part.label}
          </button>
        );
      })}
    </div>
  );
}
