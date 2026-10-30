import type { ArtMode, TuneSettings } from '../types';

export interface ModeOption {
  id: ArtMode;
  label: string;
  /** HTML entity code point shown as the card icon. */
  icon: string;
}

export const MODES: ModeOption[] = [
  { id: 'trail', label: 'Motion Trail', icon: '〜' },
  { id: 'mandala', label: 'Mandala', icon: '✻' },
  { id: 'ghost', label: 'Ghost Stack', icon: '❀' },
  { id: 'flow', label: 'Flow Field', icon: '≈' },
];

export interface TuneControl {
  key: keyof TuneSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  digits: number;
}

export const TUNE_CONTROLS: TuneControl[] = [
  { key: 'lineWeight', label: 'Line Weight', min: 0.5, max: 8, step: 0.5, digits: 1 },
  { key: 'glow', label: 'Glow Intensity', min: 0, max: 1, step: 0.05, digits: 2 },
  { key: 'symmetry', label: 'Symmetry Axes', min: 1, max: 8, step: 1, digits: 0 },
  { key: 'persistence', label: 'Trail Fade', min: 0.5, max: 0.99, step: 0.01, digits: 2 },
];

export const DEFAULT_TUNE: TuneSettings = {
  lineWeight: 2,
  glow: 0.6,
  symmetry: 1,
  persistence: 0.85,
};
