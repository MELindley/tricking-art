import type { RefObject } from 'react';
import type { AnimExportState } from '../../hooks/useAnimatedExport';
import './AnimExportModal.css';

interface Props {
  state: AnimExportState;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onClose: () => void;
  onDownloadRecording: () => void;
  onDownloadMp4: () => void;
}

export function AnimExportModal({ state, canvasRef, onClose, onDownloadRecording, onDownloadMp4 }: Props) {
  // Keep mounted while hidden: the recorder draws on this canvas.
  return (
    <div className={`anim-modal${state.open ? ' visible' : ''}`}>
      <div className="anim-modal__title">EXPORTING VIDEO</div>
      <canvas ref={canvasRef} className="anim-modal__canvas" />
      <div className="anim-modal__progress">
        <div className="anim-modal__track">
          <div className="anim-modal__bar" style={{ width: `${state.pct}%` }} />
        </div>
        <div className="anim-modal__label">{state.label}</div>
      </div>
      <div className="anim-modal__sub">{state.sub}</div>
      <div className="anim-modal__buttons">
        {state.format && (
          <>
            <button type="button" className="anim-modal__dl" onClick={onDownloadRecording}>
              &darr; {state.format}
            </button>
            <button type="button" className="anim-modal__dl" disabled={state.converting} onClick={onDownloadMp4}>
              {state.converting ? 'CONVERTING...' : <>&darr; MP4</>}
            </button>
          </>
        )}
      </div>
      <button type="button" className="anim-modal__cancel" onClick={onClose}>
        CANCEL / CLOSE
      </button>
    </div>
  );
}
