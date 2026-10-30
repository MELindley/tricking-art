import { ANIM_BITRATE, ANIM_FPS, ANIM_HOLD_SECONDS } from '../../constants/canvas';
import { sleep } from '../../lib/async';
import type { ArtMode, FrameData, RenderParams } from '../../types';
import { drawFadeBars, normalizeEnergy, RENDERERS } from '../render';

const MIME_CANDIDATES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
const BACKDROP_ALPHA = 0.5;

export interface AnimatedExportOptions {
  frames: FrameData[];
  params: RenderParams;
  mode: ArtMode;
  /** Visible canvas the composite is drawn on (and recorded from). */
  target: HTMLCanvasElement;
  onProgress: (pct: number, label: string) => void;
}

function loadSnapshots(frames: FrameData[]): Promise<(HTMLImageElement | null)[]> {
  return Promise.all(
    frames.map(
      (fr) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          if (!fr.videoSnapshot) return resolve(null);
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = fr.videoSnapshot;
        }),
    ),
  );
}

/**
 * Re-plays the analysis frame by frame: the video is drawn as a dimmed backdrop,
 * the art accumulates on a separate layer and is screen-blended on top. The
 * result is captured live with MediaRecorder.
 */
export async function renderAnimated(opts: AnimatedExportOptions): Promise<Blob> {
  const { frames, params: p, mode, target, onProgress } = opts;
  const { CANVAS_W, CANVAS_H } = p;

  if (!RENDERERS[mode].drawFrame) {
    // Whole-clip modes (flow field) can't be built incrementally.
    throw new Error(`"${mode}" mode can't be exported as video yet — use PNG, or pick another mode.`);
  }

  onProgress(5, 'LOADING SNAPSHOTS...');
  const snapshots = await loadSnapshots(frames);
  normalizeEnergy(frames);

  target.width = CANVAS_W;
  target.height = CANVAS_H;
  const out = target.getContext('2d')!;

  const art = document.createElement('canvas');
  art.width = CANVAS_W;
  art.height = CANVAS_H;
  const artCtx = art.getContext('2d')!;
  artCtx.fillStyle = '#000';
  artCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';
  const recorder = new MediaRecorder(target.captureStream(ANIM_FPS), {
    mimeType,
    videoBitsPerSecond: ANIM_BITRATE,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(100);
  onProgress(5, 'RECORDING...');

  const draw = (i: number) => {
    const fr = frames[i];
    RENDERERS[mode].drawFrame!(artCtx, fr, i, frames.length, p);

    out.fillStyle = '#000';
    out.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Cover-fit the clip over the whole 9:16 frame (sides are cropped).
    const img = snapshots[i];
    if (img) {
      const vw = fr.snapW || img.naturalWidth || CANVAS_W;
      const vh = fr.snapH || img.naturalHeight || CANVAS_H;
      const s = Math.max(CANVAS_W / vw, CANVAS_H / vh);
      out.globalAlpha = BACKDROP_ALPHA;
      out.drawImage(img, (CANVAS_W - vw * s) / 2, (CANVAS_H - vh * s) / 2, vw * s, vh * s);
      out.globalAlpha = 1;
    }

    out.globalCompositeOperation = 'screen';
    out.drawImage(art, 0, 0);
    out.globalCompositeOperation = 'source-over';

    drawFadeBars(out, p, { alpha: 0.7, spread: 1.5 });
  };

  const frameMs = 1000 / ANIM_FPS;
  for (let i = 0; i < frames.length; i++) {
    draw(i);
    onProgress(Math.round(((i + 1) / frames.length) * 90), `RECORDING ${i + 1} / ${frames.length}`);
    await sleep(frameMs);
  }
  // Hold the final composite for a moment.
  await sleep(frameMs * Math.round(ANIM_FPS * ANIM_HOLD_SECONDS));

  onProgress(95, 'FINALIZING...');
  const blob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.stop();
  });
  onProgress(100, 'DONE!');
  return blob;
}
