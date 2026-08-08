import {
  BOARD_QUICK_FILTER_OPTIONS,
  type BoardQuickFilter,
} from '../lib/tasks/taskQuickFilter';

interface BoardQuickFilterChipsProps {
  value: BoardQuickFilter;
  onChange: (value: BoardQuickFilter) => void;
}

export function BoardQuickFilterChips({ value, onChange }: BoardQuickFilterChipsProps) {
  return (
    <div className="board-quick-filters" role="group" aria-label="Quick filters">
      {BOARD_QUICK_FILTER_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`board-quick-filter-chip${selected ? ' is-active' : ''}`}
            aria-pressed={selected}
            onClick={() => {
              if (option.value === value && option.value !== 'all') {
                onChange('all');
                return;
              }
              onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
