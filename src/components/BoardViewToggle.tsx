import type { ReactNode } from 'react';

export type BoardViewMode = 'board' | 'list';

interface BoardViewToggleProps {
  viewMode: BoardViewMode;
  onChange: (mode: BoardViewMode) => void;
}

export function BoardViewToggle({ viewMode, onChange }: BoardViewToggleProps) {
  return (
    <div className="board-view-toggle" role="group" aria-label="Task visualization">
      <button
        type="button"
        className={`board-view-toggle-btn${viewMode === 'board' ? ' is-active' : ''}`}
        aria-pressed={viewMode === 'board'}
        onClick={() => onChange('board')}
      >
        Board
      </button>
      <button
        type="button"
        className={`board-view-toggle-btn${viewMode === 'list' ? ' is-active' : ''}`}
        aria-pressed={viewMode === 'list'}
        onClick={() => onChange('list')}
      >
        List
      </button>
    </div>
  );
}

interface BoardViewModePanelProps {
  viewMode: BoardViewMode;
  onViewModeChange: (mode: BoardViewMode) => void;
  board: ReactNode;
  list: ReactNode;
}

export function BoardViewModePanel({
  viewMode,
  onViewModeChange,
  board,
  list,
}: BoardViewModePanelProps) {
  return (
    <>
      <BoardViewToggle viewMode={viewMode} onChange={onViewModeChange} />
      {viewMode === 'board' ? board : list}
    </>
  );
}
