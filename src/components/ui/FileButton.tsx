import type { ReactNode } from 'react';

interface Props {
  accept: string;
  className?: string;
  onFile: (file: File) => void;
  children: ReactNode;
}

/** A <label> wrapping an invisible file input, so the whole element is the tap target. */
export function FileButton({ accept, className, onFile, children }: Props) {
  return (
    <label className={className}>
      {children}
      <input
        type="file"
        accept={accept}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </label>
  );
}
