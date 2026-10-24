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
  showToggleOnMobile?: boolean;
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
  showToggleOnMobile = false,
  children,
}: PageFiltersToolbarProps) {
  const isMobileShell = useMediaQuery(SHELL_MOBILE_QUERY);
  const showToggle = !isMobileShell || showToggleOnMobile;
  const toggleOpen = isMobileShell ? mobileOverlayOpen : open;

  return (
    <>
      <div className="board-chrome-toolbar">
        <div className="board-chrome-actions">
          {showToggle ? (
            <button
              type="button"
              className={`btn btn-secondary board-chrome-toggle${toggleOpen ? ' is-open' : ''}`}
              aria-expanded={toggleOpen}
              aria-controls={!isMobileShell && open ? 'board-chrome-panel' : undefined}
              onClick={() => {
                if (isMobileShell) {
                  onMobileOverlayOpenChange(!mobileOverlayOpen);
                  return;
                }
                onOpenChange(!open);
              }}
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
