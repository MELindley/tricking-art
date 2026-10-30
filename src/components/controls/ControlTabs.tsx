import { useState } from 'react';
import type { ArtMode, ArtStats, TuneSettings } from '../../types';
import { Tabs } from '../ui/Tabs';
import { StylePanel } from './StylePanel';
import { TunePanel } from './TunePanel';

interface Props {
  mode: ArtMode;
  onModeChange: (m: ArtMode) => void;
  paletteIdx: number;
  onPaletteChange: (i: number) => void;
  tune: TuneSettings;
  onTuneChange: (t: TuneSettings) => void;
  poseEnabled: boolean;
  onPoseToggle: () => void;
  canGenerate: boolean;
  onGenerate: () => void;
  stats: ArtStats | null;
}

const TABS = [
  { id: 'style', label: 'Style' },
  { id: 'tune', label: 'Tune' },
] as const;

export function ControlTabs(props: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('style');
  return (
    <>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'style' ? (
        <StylePanel {...props} />
      ) : (
        <TunePanel
          value={props.tune}
          onChange={props.onTuneChange}
          canGenerate={props.canGenerate}
          onGenerate={props.onGenerate}
        />
      )}
    </>
  );
}
