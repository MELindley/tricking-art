import { loadScript } from '../../lib/loadScript';
import type { Landmark } from '../../types';

const BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404';
const INIT_TIMEOUT_MS = 30_000;
const DETECT_TIMEOUT_MS = 2_000;

interface PoseResults {
  poseLandmarks?: Landmark[];
}

export interface PoseModel {
  setOptions(options: Record<string, unknown>): void;
  onResults(cb: (results: PoseResults) => void): void;
  send(input: { image: HTMLCanvasElement }): Promise<void>;
}

declare global {
  interface Window {
    Pose?: new (config: { locateFile: (file: string) => string }) => PoseModel;
  }
}

let model: PoseModel | null = null;
let loading: Promise<PoseModel | null> | null = null;

export const isPoseReady = () => model !== null;

async function init(): Promise<PoseModel> {
  await loadScript(`${BASE}/pose.js`, 'anonymous');
  if (!window.Pose) throw new Error('MediaPipe Pose global not found');

  const pose = new window.Pose({ locateFile: (f) => `${BASE}/${f}` });
  pose.setOptions({
    modelComplexity: 1, // 0=lite, 1=full, 2=heavy — 1 is the best balance on mobile
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  // Warm up by running a blank frame so the model/wasm download happens now.
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('MediaPipe init timeout')), INIT_TIMEOUT_MS);
    pose.onResults(() => {
      clearTimeout(timeout);
      resolve();
    });
    const blank = document.createElement('canvas');
    blank.width = blank.height = 64;
    pose.send({ image: blank }).catch(reject);
  });
  return pose;
}

/** Loads (once) and returns the pose model, or null if it cannot be loaded. */
export function ensureMediaPipe(): Promise<PoseModel | null> {
  if (model) return Promise.resolve(model);
  loading ??= init()
    .then((p) => (model = p))
    .catch((e) => {
      console.warn('MediaPipe failed to load, falling back to motion diff:', e);
      return null;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Runs pose detection on one canvas frame. Resolves null when nobody is detected. */
export function detectPose(pose: PoseModel, canvas: HTMLCanvasElement): Promise<Landmark[] | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), DETECT_TIMEOUT_MS);
    pose.onResults((results) => {
      clearTimeout(timeout);
      resolve(results.poseLandmarks?.length ? results.poseLandmarks : null);
    });
    pose.send({ image: canvas }).catch(() => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}
