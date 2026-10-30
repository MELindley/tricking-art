import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlSheet } from './components/controls/ControlSheet';
import { ControlTabs } from './components/controls/ControlTabs';
import { Header } from './components/layout/Header';
import { CanvasStage } from './components/stage/CanvasStage';
import { MOBILE_BREAKPOINT } from './constants/canvas';
import { DEFAULT_TUNE } from './constants/modes';
import { PALETTES } from './constants/palettes';
import { useAnimatedExport } from './hooks/useAnimatedExport';
import { useGenerator } from './hooks/useGenerator';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useObjectUrl } from './hooks/useObjectUrl';
import type { ArtMode, ArtSettings, TuneSettings } from './types';
import './App.css';

export function App() {
  const isDesktop = useMediaQuery(`(min-width: ${MOBILE_BREAKPOINT}px)`);

  const [file, setFile] = useState<File | null>(null);
  /** What the <video> preview plays: the original, or the H.264 transcode of it. */
  const [previewSource, setPreviewSource] = useState<Blob | null>(null);
  const previewUrl = useObjectUrl(previewSource);

  const [mode, setMode] = useState<ArtMode>('trail');
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [tune, setTune] = useState<TuneSettings>(DEFAULT_TUNE);
  const [poseEnabled, setPoseEnabled] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const openSheet = useCallback((open: boolean) => {
    if (open) setSheetHeight(Math.min(window.innerHeight * 0.82, 600));
    setSheetOpen(open);
  }, []);

  const generator = useGenerator({
    canvasRef,
    poseEnabled,
    onPoseUnavailable: useCallback(() => setPoseEnabled(false), []),
    onSourceReplaced: setPreviewSource,
    onGenerateStart: useCallback(() => openSheet(false), [openSheet]),
  });
  const animExport = useAnimatedExport(generator.art);

  const loadVideo = useCallback(
    (f: File) => {
      generator.reset();
      setFile(f);
      setPreviewSource(f);
      generator.setStatus('VIDEO READY');
      // Slide the controls up shortly after the preview appears.
      setTimeout(() => openSheet(true), 300);
    },
    [generator, openSheet],
  );

  // On desktop the panel is permanently visible; make sure the mobile state doesn't linger.
  useEffect(() => {
    if (isDesktop) setSheetOpen(false);
  }, [isDesktop]);

  const settings = useMemo<ArtSettings>(
    () => ({ ...tune, mode, palette: PALETTES[paletteIdx].colors }),
    [tune, mode, paletteIdx],
  );
  const generate = useCallback(() => {
    if (file) void generator.generate(file, settings);
  }, [file, generator, settings]);

  return (
    <div className="app">
      <Header status={generator.status} />

      <CanvasStage
        canvasRef={canvasRef}
        previewUrl={previewUrl}
        hasArt={generator.art !== null}
        showPoseBadge={poseEnabled && generator.poseReady}
        progress={generator.progress}
        animExport={animExport}
        bottomInset={!isDesktop && sheetOpen ? sheetHeight : undefined}
        onFile={loadVideo}
      />

      <ControlSheet
        open={sheetOpen && !isDesktop}
        height={sheetHeight}
        hasVideo={file !== null}
        onToggle={() => openSheet(!sheetOpen)}
        onChangeVideo={loadVideo}
      >
        <ControlTabs
          mode={mode}
          onModeChange={setMode}
          paletteIdx={paletteIdx}
          onPaletteChange={setPaletteIdx}
          tune={tune}
          onTuneChange={setTune}
          poseEnabled={poseEnabled}
          onPoseToggle={() => setPoseEnabled((v) => !v)}
          canGenerate={file !== null && !generator.busy}
          onGenerate={generate}
          stats={generator.stats}
        />
      </ControlSheet>
    </div>
  );
}
