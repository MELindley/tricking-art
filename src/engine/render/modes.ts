import type { ArtMode, FrameData, RenderParams } from '../../types';
import { drawFlowField } from './flow';
import { drawGhostFrame } from './ghost';
import { drawMandalaFrame } from './mandala';
import { drawTrailFrame } from './trail';

export type FrameDrawer = (
  ctx: CanvasRenderingContext2D,
  fr: FrameData,
  fi: number,
  total: number,
  p: RenderParams,
) => void;

export interface ModeRenderer {
  /** Draws one frame on top of what is already on the canvas (works for live/animated export). */
  drawFrame?: FrameDrawer;
  /** Draws the whole clip in one go (modes that need global statistics). */
  drawAll?: (ctx: CanvasRenderingContext2D, frames: FrameData[], p: RenderParams) => void;
}

export const RENDERERS: Record<ArtMode, ModeRenderer> = {
  trail: { drawFrame: drawTrailFrame },
  mandala: { drawFrame: drawMandalaFrame },
  ghost: { drawFrame: drawGhostFrame },
  flow: { drawAll: drawFlowField },
};
