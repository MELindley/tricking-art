import {
  FRAME_BUDGET,
  MAX_SAMPLE_FPS,
  MIN_FRAMES,
  SNAPSHOT_MAX_SIDE,
} from '../../constants/canvas';
import { nextFrame } from '../../lib/async';
import type { ExtractionResult, FrameData, ProgressUpdate } from '../../types';
import { MotionAnalyzer } from '../analysis/MotionAnalyzer';
import { detectPose, ensureMediaPipe } from '../pose/mediapipe';

export interface ExtractOptions {
  poseEnabled: boolean;
  onProgress: (update: ProgressUpdate) => void;
}

/** True when the browser could not decode the file (so it should be transcoded). */
export function isUnsupportedFormatError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : '';
  return msg.includes('code 4') || msg.includes('unsupported') || msg.includes('load failed');
}

function loadVideo(file: Blob): Promise<{ video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    video.playsInline = true;
    video.addEventListener(
      'error',
      () => {
        URL.revokeObjectURL(url);
        const code = video.error?.code ?? '?';
        const msg = video.error?.message || 'unsupported format';
        reject(new Error(`Video load failed (code ${code}): ${msg}`));
      },
      { once: true },
    );
    video.addEventListener('loadeddata', () => resolve({ video, url }), { once: true });
    video.src = url;
    video.load();
  });
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Seek timeout at t=${t.toFixed(2)}`)), 6000);
    video.addEventListener(
      'seeked',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
    video.currentTime = t;
  });
}

/** Downscaled JPEG of the current canvas contents, used as the background for video exports. */
function snapshot(source: HTMLCanvasElement, W: number, H: number) {
  const scale = Math.min(SNAPSHOT_MAX_SIDE / Math.max(W, H), 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), w: canvas.width, h: canvas.height };
}

/** Samples the clip at an even cadence and analyses every sampled frame. */
export async function extractFrames(file: Blob, opts: ExtractOptions): Promise<ExtractionResult> {
  const { poseEnabled, onProgress } = opts;

  let pose = null;
  if (poseEnabled) {
    onProgress({ label: 'LOADING POSE MODEL', detail: 'FIRST TIME: ~20MB DOWNLOAD', pct: 2 });
    pose = await ensureMediaPipe();
  }

  const { video, url } = await loadVideo(file);
  try {
    const dur = video.duration;
    if (!dur || !isFinite(dur)) throw new Error('Cannot read duration. Try MP4/H.264.');
    const W = video.videoWidth;
    const H = video.videoHeight;
    if (!W || !H) throw new Error('Cannot read video dimensions.');

    const fps = Math.min(MAX_SAMPLE_FPS, Math.floor(FRAME_BUDGET / dur));
    const total = Math.max(MIN_FRAMES, Math.floor(dur * fps));

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const analyzer = new MotionAnalyzer();
    const frames: FrameData[] = [];
    let poseHits = 0;
    onProgress({ label: pose ? 'POSE TRACKING' : 'EXTRACTING FRAMES' });

    for (let i = 0; i < total; i++) {
      const t = Math.min(0.01 + (i / total) * dur, dur - 0.01);
      await seek(video, t);
      await nextFrame();

      ctx.drawImage(video, 0, 0, W, H);
      const img = ctx.getImageData(0, 0, W, H);
      const snap = snapshot(canvas, W, H);

      const landmarks = pose ? await detectPose(pose, canvas) : null;
      if (landmarks) poseHits++;
      const analyzed = landmarks ? analyzer.fromLandmarks(landmarks, img) : analyzer.fromDiff(img);

      frames.push({
        ...analyzed,
        time: i / total,
        videoTime: t,
        videoSnapshot: snap.dataUrl,
        snapW: snap.w,
        snapH: snap.h,
        eN: 0,
      });

      onProgress({
        pct: Math.round(((i + 1) / total) * 100),
        detail: pose ? `POSE ${i + 1}/${total} — ${poseHits} detected` : `FRAME ${i + 1} / ${total}`,
      });
    }

    return { frames, W, H, dur, total, poseHits, poseAvailable: !poseEnabled || pose !== null };
  } finally {
    URL.revokeObjectURL(url);
  }
}
