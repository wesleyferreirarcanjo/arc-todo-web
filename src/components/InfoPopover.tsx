import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { InfoIcon } from './icons';

export function InfoPopover({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="analytics-metric-info" ref={rootRef}>
      <button
        type="button"
        className="analytics-metric-info-btn"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`About ${label}`}
        onClick={() => setOpen((current) => !current)}
      >
        <InfoIcon />
      </button>
      {open ? (
        <div className="analytics-metric-info-pop" id={panelId} role="note">
          {children}
        </div>
      ) : null}
    </div>
  );
}
