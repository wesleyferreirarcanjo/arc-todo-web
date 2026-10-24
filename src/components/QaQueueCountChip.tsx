import { Link } from 'react-router-dom';

interface QaQueueCountChipProps {
  count: number;
}

export function QaQueueCountChip({ count }: QaQueueCountChipProps) {
  const label =
    count > 0
      ? `QA extension, ${count} ${count === 1 ? 'card' : 'cards'}`
      : 'QA extension';

  return (
    <Link
      to="/download"
      className="btn btn-secondary board-chrome-toggle"
      aria-label={label}
    >
      QA extension
      {count > 0 ? (
        <span className="board-chrome-count" aria-hidden="true">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
