import './Toggle.css';

interface Props {
  title: string;
  subtitle: string;
  on: boolean;
  onToggle: () => void;
}

export function Toggle({ title, subtitle, on, onToggle }: Props) {
  return (
    <div className="toggle-row">
      <div className="toggle-row__info">
        <div className="toggle-row__title">{title}</div>
        <div className="toggle-row__sub">{subtitle}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        className={`toggle-switch${on ? ' on' : ''}`}
        onClick={onToggle}
      >
        <div className="toggle-switch__knob" />
      </button>
    </div>
  );
}
