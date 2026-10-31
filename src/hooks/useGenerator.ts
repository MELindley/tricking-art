import { useCallback, useRef, useState, type RefObject } from 'react';
import { extractFrames, isUnsupportedFormatError } from '../engine/extraction/extractFrames';
import { transcodeToMp4 } from '../engine/export/transcode';
import { isPoseReady } from '../engine/pose/mediapipe';
import { buildRenderParams, renderStill } from '../engine/render';
import { applyBodyParts } from '../engine/render/bodyParts';
import { ALL_BODY_PARTS } from '../constants/bodyParts';
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
  /** Pose analysis of the current clip, kept so mode / palette / body-part changes re-render without re-tracking. */
  const extracted = useRef<{ file: File; poseEnabled: boolean; result: ExtractionResult } | null>(null);

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
    extracted.current = null;
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
        const cached = extracted.current;
        if (cached && cached.file === file && cached.poseEnabled === poseEnabled) {
          result = cached.result;
        } else {
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
          extracted.current = { file, poseEnabled, result };
        }

        if (poseEnabled && !result.poseAvailable) onPoseUnavailable();
        setPoseReady(isPoseReady());

        setStatus('RENDERING...', 'active');
        // Body parts need a detected pose; without one, fall back to the whole body.
        const noPose = result.poseHits === 0;
        const bodyParts = noPose ? ALL_BODY_PARTS : settings.bodyParts;
        const partial = !noPose && bodyParts.length > 0 && bodyParts.length < ALL_BODY_PARTS.length;
        const { frames, peakEnergy } = applyBodyParts(result.frames, bodyParts);
        const params = buildRenderParams({ ...settings, bodyParts }, result.W, result.H);
        canvas.width = params.CANVAS_W;
        canvas.height = params.CANVAS_H;
        const maxE = renderStill(canvas.getContext('2d')!, frames, params, settings.mode);

        setArt({ frames, params, mode: settings.mode });
        setStats(computeStats(frames, settings.mode, peakEnergy ?? maxE, result.poseHits));
        setProgress(IDLE_PROGRESS);
        const ignored = noPose && settings.bodyParts.length < ALL_BODY_PARTS.length;
        setStatus(ignored ? 'DONE ✶ NO BODY FOUND — USED FULL MOTION' : partial ? 'DONE ✶ BODY PARTS' : 'DONE ✶');
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
