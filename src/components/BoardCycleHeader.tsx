import type { BoardCycle } from '../types/boardCycle';

interface BoardCycleHeaderProps {
  cycle: BoardCycle;
  autoClosesOn: string;
  advancing: boolean;
  onAdvance: () => void;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

function daysUntil(endDate: string): number {
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const endUtc = Date.parse(`${endDate}T00:00:00.000Z`);
  return Math.max(0, Math.round((endUtc - todayUtc) / 86400000));
}

export function BoardCycleHeader({
  cycle,
  autoClosesOn,
  advancing,
  onAdvance,
}: BoardCycleHeaderProps) {
  const remainingDays = daysUntil(autoClosesOn);
  const autoCloseCopy =
    remainingDays === 0
      ? 'This cycle auto-closes after today (UTC). Done tasks move to sprint history.'
      : `This cycle auto-closes in ${remainingDays} day${remainingDays === 1 ? '' : 's'} on ${formatDate(autoClosesOn)} (UTC). Done tasks move to sprint history then.`;

  return (
    <section className="board-cycle-header">
      <div className="board-cycle-header-copy">
        <h2>Weekly cycle</h2>
        <p className="board-cycle-dates">
          {formatDateRange(cycle.startDate, cycle.endDate)}
        </p>
        <p className="board-cycle-note">{autoCloseCopy}</p>
        <p className="board-cycle-note">
          Cycles are counted from the project start date. You can also close early
          with the button below. Recurring tasks and time tracking will extend this
          system later.
        </p>
      </div>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={advancing}
        onClick={onAdvance}
      >
        {advancing ? 'Closing cycle…' : 'Close early and start next week'}
      </button>
    </section>
  );
}
