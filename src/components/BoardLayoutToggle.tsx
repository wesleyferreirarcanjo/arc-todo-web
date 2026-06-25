import type { BoardLayoutMode } from '../lib/storage/appStorage';

interface BoardLayoutToggleProps {
  layoutMode: BoardLayoutMode;
  onChange: (mode: BoardLayoutMode) => void;
}

export function BoardLayoutToggle({ layoutMode, onChange }: BoardLayoutToggleProps) {
  return (
    <div className="board-view-toggle" role="group" aria-label="Board layout">
      <button
        type="button"
        className={`board-view-toggle-btn${layoutMode === 'compact' ? ' is-active' : ''}`}
        aria-pressed={layoutMode === 'compact'}
        onClick={() => onChange('compact')}
      >
        Compact
      </button>
      <button
        type="button"
        className={`board-view-toggle-btn${layoutMode === 'wide' ? ' is-active' : ''}`}
        aria-pressed={layoutMode === 'wide'}
        onClick={() => onChange('wide')}
      >
        Wide
      </button>
    </div>
  );
}
