import { FileButton } from '../ui/FileButton';
import './UploadHero.css';

export function UploadHero({ onFile }: { onFile: (f: File) => void }) {
  return (
    <div className="upload-hero">
      <FileButton accept="video/*" className="upload-hero__ring" onFile={onFile}>
        <span>&#11041;</span>
      </FileButton>
      <div className="upload-hero__title">
        Drop your clip
        <br />
        or tap to browse
      </div>
      <div className="upload-hero__sub">
        10&ndash;15 sec tricking clip
        <br />
        Any format &mdash; we handle the rest
      </div>
    </div>
  );
}
