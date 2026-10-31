import type { RefObject } from 'react';
import type { useAnimatedExport } from '../../hooks/useAnimatedExport';
import type { ProgressState } from '../../hooks/useGenerator';
import { downloadUrl, timestampedName } from '../../lib/download';
import { AnimExportModal } from './AnimExportModal';
import { ExportButtons } from './ExportButtons';
import { ProgressOverlay } from './ProgressOverlay';
import { UploadHero } from './UploadHero';
import './CanvasStage.css';

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  previewUrl: string | null;
  hasArt: boolean;
  showPoseBadge: boolean;
  progress: ProgressState;
  animExport: ReturnType<typeof useAnimatedExport>;
  /** Extra bottom padding while the mobile sheet is open (px). */
  bottomInset?: number;
  onFile: (f: File) => void;
}

/** The big canvas area: upload prompt → video preview → generated art, plus overlays. */
export function CanvasStage({
  canvasRef,
  previewUrl,
  hasArt,
  showPoseBadge,
  progress,
  animExport,
  bottomInset,
  onFile,
}: Props) {
  const exportPng = () => {
    const canvas = canvasRef.current;
    if (canvas) downloadUrl(canvas.toDataURL('image/png'), timestampedName('png'));
  };

  return (
    <main className="stage" style={bottomInset ? { paddingBottom: bottomInset } : undefined}>
      {showPoseBadge && <div className="stage__badge">&#9670; MEDIAPIPE</div>}

      {!previewUrl && <UploadHero onFile={onFile} />}
      {previewUrl && !hasArt && (
        <div className="stage__preview">
          <video src={previewUrl} muted loop playsInline autoPlay />
        </div>
      )}
      <canvas ref={canvasRef} className="stage__canvas" />

      <ProgressOverlay progress={progress} />
      <AnimExportModal
        state={animExport.state}
        canvasRef={animExport.canvasRef}
        onClose={animExport.close}
        onDownloadRecording={animExport.downloadRecording}
        onDownloadMp4={animExport.downloadMp4}
      />
      {hasArt && <ExportButtons onPng={exportPng} onVideo={animExport.start} />}
    </main>
  );
}
