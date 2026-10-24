import type { ReactNode } from 'react';

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
  if (!open) {
    return null;
  }

  return (
    <div
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
