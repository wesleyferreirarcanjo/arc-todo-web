interface QaQueueCountChipProps {
  count: number;
  expanded: boolean;
  panelId?: string;
  onToggle: () => void;
}

export function QaQueueCountChip({
  count,
  expanded,
  panelId = 'board-qa-queue-panel',
  onToggle,
}: QaQueueCountChipProps) {
  const label =
    count > 0
      ? `Fila de QA, ${count} ${count === 1 ? 'card' : 'cards'}`
      : 'Fila de QA';

  return (
    <button
      type="button"
      className={`btn btn-secondary board-chrome-toggle${expanded ? ' is-open' : ''}`}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={expanded ? panelId : undefined}
      onClick={onToggle}
    >
      Fila de QA
      {count > 0 ? (
        <span className="board-chrome-count" aria-hidden="true">
          {count}
        </span>
      ) : null}
    </button>
  );
}
