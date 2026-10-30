export interface Point {
  x: number;
  y: number;
}

/** A MediaPipe pose landmark (coordinates normalised to 0–1). */
export interface Landmark extends Point {
  z: number;
  visibility: number;
}

export interface Keypoint extends Point {
  energy: number;
  z?: number;
  visibility?: number;
  velocity?: number;
  jointIdx?: number;
}

export interface MotionPoint extends Point {
  energy: number;
}

/** 0 = idle, 1 = load, 2 = launch, 3 = peak, 4 = land. */
export type Phase = 0 | 1 | 2 | 3 | 4;

/** What the motion analyser produces for one video frame. */
export interface AnalyzedFrame {
  keypoints: Keypoint[];
  motionPoints: MotionPoint[];
  energy: number;
  centroid: Point;
  isPose: boolean;
  landmarks?: Landmark[];
  velocities?: Record<number, number>;
  phase?: Phase;
  isAirborne?: boolean;
}

/** An analysed frame plus capture metadata and render-time normalisation. */
export interface FrameData extends AnalyzedFrame {
  /** Position in the clip, 0–1. */
  time: number;
  /** Position in the clip, seconds. */
  videoTime: number;
  /** JPEG data-URL used as background when exporting video. */
  videoSnapshot: string;
  snapW: number;
  snapH: number;
  /** Energy normalised against the loudest frame (set by `normalizeEnergy`). */
  eN: number;
}

export interface ExtractionResult {
  frames: FrameData[];
  W: number;
  H: number;
  dur: number;
  total: number;
  poseHits: number;
  /** False when pose was requested but the model could not be loaded. */
  poseAvailable: boolean;
}

export type ArtMode = 'trail' | 'mandala' | 'ghost' | 'flow';

export interface Palette {
  name: string;
  colors: string[];
}

export interface TuneSettings {
  lineWeight: number;
  glow: number;
  symmetry: number;
  /** Currently not consumed by any renderer (carried over from the original UI). */
  persistence: number;
}

export interface ArtSettings extends TuneSettings {
  mode: ArtMode;
  palette: string[];
}

export interface RenderParams {
  lineWeight: number;
  glow: number;
  symmetry: number;
  palette: string[];
  /** Source video size. */
  W: number;
  H: number;
  /** Side of the square art zone. */
  SIZE: number;
  CANVAS_W: number;
  CANVAS_H: number;
  /** Top of the art zone inside the 9:16 canvas. */
  artOffY: number;
  /** Video px → canvas px. */
  scale: number;
  offX: number;
  offY: number;
  /** Rotation pivot (centre of the art zone). */
  cX: number;
  cY: number;
}

export interface ProgressUpdate {
  label?: string;
  detail?: string;
  /** 0–100 */
  pct?: number;
}

export type StatusKind = 'idle' | 'active' | 'error';

export interface ArtStats {
  frames: number;
  energy: number;
  mode: ArtMode;
  poseHits: number;
  dominantPhase?: string;
  airPct?: number;
}
