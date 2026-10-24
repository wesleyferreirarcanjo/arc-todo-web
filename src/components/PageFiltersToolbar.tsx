import type { ReactNode } from 'react';
import { SHELL_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { MobileBoardFiltersOverlay } from './MobileBoardFiltersOverlay';

export interface PageFiltersToolbarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilterCount: number;
  panel: ReactNode;
  chips?: ReactNode;
  mobileOverlayOpen: boolean;
  onMobileOverlayOpenChange: (open: boolean) => void;
  mobileOverlayTitle?: string;
  children?: ReactNode;
}

export function PageFiltersToolbar({
  open,
  onOpenChange,
  activeFilterCount,
  panel,
  chips,
  mobileOverlayOpen,
  onMobileOverlayOpenChange,
  mobileOverlayTitle,
  children,
}: PageFiltersToolbarProps) {
  const isMobileShell = useMediaQuery(SHELL_MOBILE_QUERY);

  return (
    <>
      <div className="board-chrome-toolbar">
        <div className="board-chrome-actions">
          {!isMobileShell ? (
            <button
              type="button"
              className={`btn btn-secondary board-chrome-toggle${open ? ' is-open' : ''}`}
              aria-expanded={open}
              aria-controls={open ? 'board-chrome-panel' : undefined}
              onClick={() => onOpenChange(!open)}
            >
              Filters
              {activeFilterCount > 0 ? (
                <span className="board-chrome-count" aria-hidden="true">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          ) : null}
          {children}
        </div>
        {chips ? <div className="board-chrome-filters-cluster">{chips}</div> : null}
      </div>
      {open && !isMobileShell ? (
        <div
          id="board-chrome-panel"
          className="board-filters board-filters-inline"
          role="region"
          aria-label="Filters"
        >
          {panel}
        </div>
      ) : null}
      <MobileBoardFiltersOverlay
        open={isMobileShell && mobileOverlayOpen}
        onClose={() => onMobileOverlayOpenChange(false)}
        title={mobileOverlayTitle}
      >
        {panel}
      </MobileBoardFiltersOverlay>
    </>
  );
}
