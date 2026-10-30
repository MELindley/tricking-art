import type { StatusKind } from '../../types';
import './Header.css';

interface Props {
  status: { msg: string; kind: StatusKind };
}

/** Mobile-only top bar (hidden on desktop where the sidebar carries the logo). */
export function Header({ status }: Props) {
  return (
    <header className="header">
      <div className="logo">
        TRICK<em>/</em>ART
      </div>
      <div className="header__status">
        <div className={`dot${status.kind === 'idle' ? '' : ` ${status.kind}`}`} />
        <span>{status.msg}</span>
      </div>
    </header>
  );
}
