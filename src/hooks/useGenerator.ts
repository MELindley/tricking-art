import { useCallback, useRef, useState, type RefObject } from 'react';
import { extractFrames, isUnsupportedFormatError } from '../engine/extraction/extractFrames';
import { transcodeToMp4 } from '../engine/export/transcode';
import { isPoseReady } from '../engine/pose/mediapipe';
import { buildRenderParams, renderStill } from '../engine/render';
import { computeStats } from '../engine/render/stats';
import type {
  ArtMode,
  ArtSettings,
  ArtStats,
  ExtractionResult,
  FrameData,
  ProgressUpdate,
  RenderParams,
  StatusKind,
} from '../types';

export interface ProgressState extends Required<ProgressUpdate> {
  visible: boolean;
}

const IDLE_PROGRESS: ProgressState = { visible: false, label: 'ANALYZING MOTION', detail: 'INITIALIZING', pct: 0 };

/** Everything the animated export needs, captured at generation time. */
export interface GeneratedArt {
  frames: FrameData[];
  params: RenderParams;
  mode: ArtMode;
}

interface Options {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  poseEnabled: boolean;
  onPoseUnavailable: () => void;
  onSourceReplaced: (blob: Blob) => void;
  onGenerateStart: () => void;
}

/** Owns the video → frames → still-image pipeline and its UI state (status, progress, stats). */
export function useGenerator({ canvasRef, poseEnabled, onPoseUnavailable, onSourceReplaced, onGenerateStart }: Options) {
  const [status, setStatusState] = useState<{ msg: string; kind: StatusKind }>({ msg: 'READY', kind: 'idle' });
  const [progress, setProgress] = useState<ProgressState>(IDLE_PROGRESS);
  const [stats, setStats] = useState<ArtStats | null>(null);
  const [art, setArt] = useState<GeneratedArt | null>(null);
  const [busy, setBusy] = useState(false);
  const [poseReady, setPoseReady] = useState(false);
  const transcoded = useRef<Blob | null>(null);

  const setStatus = useCallback((msg: string, kind: StatusKind = 'idle') => setStatusState({ msg, kind }), []);
  const patchProgress = useCallback(
    (u: ProgressUpdate) =>
      setProgress((prev) => ({
        ...prev,
        visible: true,
        ...(u.label !== undefined && { label: u.label }),
        ...(u.detail !== undefined && { detail: u.detail }),
        ...(u.pct !== undefined && { pct: u.pct }),
      })),
    [],
  );

  /** Forget cached transcode + results when a new video is picked. */
  const reset = useCallback(() => {
    transcoded.current = null;
    setArt(null);
    setStats(null);
  }, []);

  const generate = useCallback(
    async (file: File, settings: ArtSettings) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      onGenerateStart();
      setBusy(true);
      setProgress({ ...IDLE_PROGRESS, visible: true });

      try {
        const opts = { poseEnabled, onProgress: patchProgress };
        let result: ExtractionResult;
        try {
          result = await extractFrames(transcoded.current ?? file, opts);
        } catch (e) {
          if (!isUnsupportedFormatError(e)) throw e;
          setStatus('TRANSCODING...', 'active');
          patchProgress({ label: 'TRANSCODING' });
          const blob = await transcodeToMp4(file, (pct, detail) => patchProgress({ pct, detail }));
          transcoded.current = blob;
          onSourceReplaced(blob);
          result = await extractFrames(blob, opts);
        }

        if (poseEnabled && !result.poseAvailable) onPoseUnavailable();
        setPoseReady(isPoseReady());

        setStatus('RENDERING...', 'active');
        const params = buildRenderParams(settings, result.W, result.H);
        canvas.width = params.CANVAS_W;
        canvas.height = params.CANVAS_H;
        const maxE = renderStill(canvas.getContext('2d')!, result.frames, params, settings.mode);

        setArt({ frames: result.frames, params, mode: settings.mode });
        setStats(computeStats(result.frames, settings.mode, maxE, result.poseHits));
        setProgress(IDLE_PROGRESS);
        setStatus('DONE ✶');
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : String(e);
        setStatus(`ERROR: ${msg}`, 'error');
        setProgress({ visible: true, label: 'ERROR', detail: msg.slice(0, 60), pct: 0 });
        setTimeout(() => setProgress(IDLE_PROGRESS), 4000);
      } finally {
        setBusy(false);
      }
    },
    [canvasRef, poseEnabled, onGenerateStart, onPoseUnavailable, onSourceReplaced, patchProgress, setStatus],
  );

  return { status, setStatus, progress, stats, art, busy, poseReady, generate, reset };
}
