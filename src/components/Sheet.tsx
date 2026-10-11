import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { pushBack } from '../lib/backStack.ts';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Bottom sheet. The Android back button closes the top-most sheet first (see lib/backStack.ts). */
export function Sheet({ title, onClose, children, footer }: SheetProps) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => pushBack(() => closeRef.current()), []);

  return (
    <div className="overlay">
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
