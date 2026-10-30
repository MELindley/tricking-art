import { IG_H, IG_W } from '../../constants/canvas';
import type { ArtSettings, RenderParams } from '../../types';

/**
 * Layout: the clip is fitted into a square "art zone" centred in a 9:16
 * Instagram canvas; the rest is filled with fade bars / the video backdrop.
 */
export function buildRenderParams(settings: ArtSettings, W: number, H: number): RenderParams {
  const SIZE = IG_W;
  const artOffY = (IG_H - SIZE) / 2;
  const scale = SIZE / Math.max(W, H);
  return {
    lineWeight: settings.lineWeight,
    glow: settings.glow,
    symmetry: settings.symmetry,
    palette: settings.palette,
    W,
    H,
    SIZE,
    CANVAS_W: IG_W,
    CANVAS_H: IG_H,
    artOffY,
    scale,
    offX: (SIZE - W * scale) / 2,
    offY: artOffY + (SIZE - H * scale) / 2,
    cX: IG_W / 2,
    cY: artOffY + SIZE / 2,
  };
}
