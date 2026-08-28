interface QaQueueCountChipProps {
  count: number;
}

export function QaQueueCountChip({ count }: QaQueueCountChipProps) {
  if (count <= 0) return null;

  return (
    <span
      className="board-qa-queue-chip"
      aria-label={`Fila de QA, ${count} ${count === 1 ? 'card' : 'cards'}`}
    >
      Fila de QA
      <span className="board-chrome-count">{count}</span>
    </span>
  );
}
