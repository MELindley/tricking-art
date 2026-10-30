import type { ReactNode } from 'react';
import { FileButton } from '../ui/FileButton';
import './ControlSheet.css';

interface Props {
  /** Mobile: sheet expanded. Ignored on desktop where the panel is always visible. */
  open: boolean;
  /** Pixel height when open on mobile. */
  height: number;
  hasVideo: boolean;
  onToggle: () => void;
  onChangeVideo: (f: File) => void;
  children: ReactNode;
}

/** Bottom sheet on mobile, fixed sidebar on desktop. */
export function ControlSheet({ open, height, hasVideo, onToggle, onChangeVideo, children }: Props) {
  const hint = open ? 'TAP TO CLOSE' : hasVideo ? 'STYLE & GENERATE' : 'LOAD A VIDEO FIRST';
  return (
    <aside className={`sheet${open ? '' : ' collapsed'}`} style={open ? { height } : undefined}>
      <button type="button" className="sheet__handle" onClick={onToggle}>
        <div className="sheet__bar" />
        <div className="sheet__hint">{hint}</div>
      </button>

      <div className="sheet__content">
        <div className="sheet__logo">
          <div className="logo">
            TRICK<em>/</em>ART
          </div>
          <div className="sheet__tagline">MOTION &rarr; VISUAL</div>
        </div>

        {hasVideo && (
          <FileButton accept="video/*" className="sheet__change" onFile={onChangeVideo}>
            &#8635; CHANGE VIDEO
          </FileButton>
        )}

        {children}
      </div>
    </aside>
  );
}
