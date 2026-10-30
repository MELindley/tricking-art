import { useCallback, useRef, useState } from 'react';
import { renderAnimated } from '../engine/export/animated';
import { convertWebmToMp4 } from '../engine/export/convertToMp4';
import { downloadBlob, timestampedName } from '../lib/download';
import type { GeneratedArt } from './useGenerator';

export interface AnimExportState {
  open: boolean;
  pct: number;
  label: string;
  sub: string;
  /** "WEBM" or "MP4" depending on what MediaRecorder produced. */
  format: string | null;
  converting: boolean;
}

const CLOSED: AnimExportState = {
  open: false,
  pct: 0,
  label: 'PREPARING...',
  sub: 'Rendering frame by frame',
  format: null,
  converting: false,
};

export function useAnimatedExport(art: GeneratedArt | null) {
  const [state, setState] = useState<AnimExportState>(CLOSED);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobRef = useRef<Blob | null>(null);
  const patch = (p: Partial<AnimExportState>) => setState((s) => ({ ...s, ...p }));

  const start = useCallback(async () => {
    const target = canvasRef.current;
    if (!art || !target) return;
    blobRef.current = null;
    setState({ ...CLOSED, open: true });

    try {
      const blob = await renderAnimated({
        ...art,
        target,
        onProgress: (pct, label) => patch({ pct, label }),
      });
      blobRef.current = blob;
      const format = blob.type.includes('mp4') ? 'MP4' : 'WEBM';
      patch({ format, sub: `Done! Save as ${format} or convert to MP4 for Instagram/TikTok.` });
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      patch({ label: `ERROR: ${msg.slice(0, 50)}`, sub: msg });
    }
  }, [art]);

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const downloadRecording = useCallback(() => {
    const blob = blobRef.current;
    if (!blob) return;
    downloadBlob(blob, timestampedName(blob.type.includes('mp4') ? 'mp4' : 'webm'));
  }, []);

  const downloadMp4 = useCallback(async () => {
    const blob = blobRef.current;
    if (!blob) return;
    patch({ converting: true, pct: 0, label: 'STARTING...' });
    try {
      const mp4 = await convertWebmToMp4(blob, (pct, label) => patch({ pct, label }));
      downloadBlob(mp4, timestampedName('mp4'));
      patch({ converting: false, pct: 100, label: 'MP4 SAVED!' });
    } catch (e) {
      console.error('MP4 export error:', e);
      const msg = e instanceof Error ? e.message : String(e);
      patch({
        converting: false,
        pct: 0,
        label: 'FAILED — see console for details',
        sub: `Error: ${msg.slice(0, 80)} — Try the WebM file instead.`,
      });
    }
  }, []);

  return { state, canvasRef, start, close, downloadRecording, downloadMp4 };
}
