import { TUNE_CONTROLS } from '../../constants/modes';
import type { TuneSettings } from '../../types';
import { Slider } from '../ui/Slider';

interface Props {
  value: TuneSettings;
  onChange: (next: TuneSettings) => void;
  canGenerate: boolean;
  onGenerate: () => void;
}

export function TunePanel({ value, onChange, canGenerate, onGenerate }: Props) {
  return (
    <>
      {TUNE_CONTROLS.map(({ key, ...control }) => (
        <Slider key={key} {...control} value={value[key]} onChange={(v) => onChange({ ...value, [key]: v })} />
      ))}
      <button type="button" className="gen-btn" disabled={!canGenerate} onClick={onGenerate}>
        GENERATE ART
      </button>
    </>
  );
}
