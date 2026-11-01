import { ALL_PHASES, TRICK_PHASES } from '../../constants/phases';
import type { TrickPhase } from '../../types';
import './BodyPartPicker.css';

interface Props {
  value: readonly TrickPhase[];
  onChange: (phases: TrickPhase[]) => void;
  disabled?: boolean;
}

/** Multi-select chips choosing which phases of the trick are drawn. At least one stays selected. */
export function PhasePicker({ value, onChange, disabled }: Props) {
  const all = value.length === ALL_PHASES.length;

  const toggle = (id: TrickPhase) => {
    if (value.includes(id)) {
      if (value.length > 1) onChange(value.filter((p) => p !== id));
    } else {
      onChange(ALL_PHASES.filter((p) => p === id || value.includes(p)));
    }
  };

  return (
    <div
      className={`part-picker part-picker--phases${disabled ? ' part-picker--disabled' : ''}`}
      role="group"
      aria-label="Trick phases to show"
    >
      <button
        type="button"
        className={`part-chip${all ? ' active' : ''}`}
        aria-pressed={all}
        disabled={disabled}
        onClick={() => onChange([...ALL_PHASES])}
      >
        Whole trick
      </button>
      {TRICK_PHASES.map((phase) => {
        const active = !all && value.includes(phase.id);
        return (
          <button
            key={phase.id}
            type="button"
            className={`part-chip${active ? ' active' : ''}`}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => (all ? onChange([phase.id]) : toggle(phase.id))}
          >
            {phase.label}
          </button>
        );
      })}
    </div>
  );
}
