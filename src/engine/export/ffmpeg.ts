import { loadScript } from '../../lib/loadScript';

const FFMPEG_JS = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js';
const FFMPEG_UTIL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/umd/index.js';
const CORE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';

export interface FFmpegInstance {
  load(opts: { coreURL: string; wasmURL: string }): Promise<void>;
  on(event: 'progress', cb: (e: { progress: number }) => void): void;
  on(event: 'log', cb: (e: { message: string }) => void): void;
  writeFile(name: string, data: Uint8Array): Promise<void>;
  readFile(name: string): Promise<Uint8Array>;
  deleteFile(name: string): Promise<void>;
  exec(args: string[]): Promise<number>;
}

interface FFmpegUtil {
  toBlobURL(url: string, mime: string): Promise<string>;
  fetchFile(file: Blob | File | string): Promise<Uint8Array>;
}

declare global {
  interface Window {
    FFmpegWASM?: { FFmpeg: new () => FFmpegInstance };
    FFmpegUtil?: FFmpegUtil;
  }
}

async function loadLibs() {
  await Promise.all([loadScript(FFMPEG_JS), loadScript(FFMPEG_UTIL)]);
  const FFmpeg = window.FFmpegWASM?.FFmpeg;
  const util = window.FFmpegUtil;
  if (!FFmpeg || !util) throw new Error('FFmpeg library not loaded on page');
  return { FFmpeg, util };
}

export interface FFmpegSession {
  ff: FFmpegInstance;
  fetchFile: FFmpegUtil['fetchFile'];
}

/**
 * Creates and loads a fresh FFmpeg instance. A new one per job avoids stale
 * progress listeners from earlier transcodes.
 */
export async function createFFmpeg(): Promise<FFmpegSession> {
  const { FFmpeg, util } = await loadLibs();
  const ff = new FFmpeg();
  await ff.load({
    coreURL: await util.toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await util.toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  return { ff, fetchFile: util.fetchFile };
}

/** Wraps a Uint8Array from ffmpeg's FS into a Blob. */
export const toBlob = (data: Uint8Array, type: string) => new Blob([data.buffer as ArrayBuffer], { type });
