import { useEffect, useRef, type ReactNode } from 'react';

interface MobileBoardFiltersOverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function MobileBoardFiltersOverlay({
  open,
  onClose,
  children,
  title = 'Filters',
}: MobileBoardFiltersOverlayProps) {
  const onCloseRef = useRef(onClose);
  const overlayRef = useRef<HTMLDivElement>(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const restoreTarget =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlayRef.current
      ?.querySelector<HTMLElement>('.mobile-filters-back')
      ?.focus({ preventScroll: true });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (restoreTarget?.isConnected) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="mobile-filters-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="mobile-filters-header">
        <button
          type="button"
          className="mobile-filters-back"
          onClick={onClose}
        >
          Back
        </button>
        <span className="mobile-filters-title">{title}</span>
      </div>
      <div className="mobile-filters-body board-filters">{children}</div>
    </div>
  );
}
