import './Slider.css';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  digits: number;
  onChange: (value: number) => void;
}

export function Slider({ label, value, min, max, step, digits, onChange }: Props) {
  return (
    <div className="slider">
      <div className="slider__label">
        {label} <span>{value.toFixed(digits)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
