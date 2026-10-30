import './ExportButtons.css';

interface Props {
  onPng: () => void;
  onVideo: () => void;
}

export function ExportButtons({ onPng, onVideo }: Props) {
  return (
    <div className="export-buttons">
      <button type="button" className="export-buttons__png" onClick={onPng}>
        <span>&darr;</span> PNG
      </button>
      <button type="button" className="export-buttons__video" onClick={onVideo}>
        <span>&#9654;</span> VIDEO
      </button>
    </div>
  );
}
