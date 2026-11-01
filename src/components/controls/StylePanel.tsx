import type { ArtMode, ArtStats, BodyPart, TrickPhase } from '../../types';
import { Toggle } from '../ui/Toggle';
import { BodyPartPicker } from './BodyPartPicker';
import { PhasePicker } from './PhasePicker';
import { ModeGrid } from './ModeGrid';
import { PaletteRow } from './PaletteRow';
import { StatsRow } from './StatsRow';

interface Props {
  mode: ArtMode;
  onModeChange: (m: ArtMode) => void;
  paletteIdx: number;
  onPaletteChange: (i: number) => void;
  bodyParts: readonly BodyPart[];
  onBodyPartsChange: (parts: BodyPart[]) => void;
  phases: readonly TrickPhase[];
  onPhasesChange: (phases: TrickPhase[]) => void;
  poseEnabled: boolean;
  onPoseToggle: () => void;
  canGenerate: boolean;
  onGenerate: () => void;
  stats: ArtStats | null;
}

export function StylePanel(props: Props) {
  return (
    <>
      <Toggle
        title="Pose Tracking"
        subtitle={props.poseEnabled ? 'MediaPipe — 33 body landmarks' : 'Motion diff (fallback mode)'}
        on={props.poseEnabled}
        onToggle={props.onPoseToggle}
      />

      <span className="sec-lbl">Art Mode</span>
      <ModeGrid value={props.mode} onChange={props.onModeChange} />

      <span className="sec-lbl">Track{props.poseEnabled ? '' : ' (needs pose tracking)'}</span>
      <BodyPartPicker value={props.bodyParts} onChange={props.onBodyPartsChange} disabled={!props.poseEnabled} />

      <span className="sec-lbl">Trick Phase{props.poseEnabled ? '' : ' (needs pose tracking)'}</span>
      <PhasePicker value={props.phases} onChange={props.onPhasesChange} disabled={!props.poseEnabled} />

      <span className="sec-lbl">Color Palette</span>
      <PaletteRow value={props.paletteIdx} onChange={props.onPaletteChange} />

      <button type="button" className="gen-btn" disabled={!props.canGenerate} onClick={props.onGenerate}>
        GENERATE ART
      </button>

      {props.stats && <StatsRow stats={props.stats} />}
    </>
  );
}
