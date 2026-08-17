import { BOARD_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import type { BoardCycle } from '../types/boardCycle';

interface BoardCycleHeaderProps {
  cycle: BoardCycle;
  autoClosesOn: string;
  advancing: boolean;
  onAdvance: () => void;
  /** Closed `<details>` at every width. Default keeps desktop expanded. */
  alwaysCollapsed?: boolean;
  /** Body only — parent owns the toggle button (All tasks toolbar). */
  embedded?: boolean;
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
  alwaysCollapsed = false,
  embedded = false,
}: BoardCycleHeaderProps) {
  const isMobileBoard = useMediaQuery(BOARD_MOBILE_QUERY);
  const collapse = !embedded && (alwaysCollapsed || isMobileBoard);
  const remainingDays = daysUntil(autoClosesOn);
  const dateRange = formatDateRange(cycle.startDate, cycle.endDate);
  const autoCloseCopy =
    remainingDays === 0
      ? 'This cycle auto-closes after today (UTC). Done tasks move to sprint history.'
      : `This cycle auto-closes in ${remainingDays} day${remainingDays === 1 ? '' : 's'} on ${formatDate(autoClosesOn)} (UTC). Done tasks move to sprint history then.`;

  const notes = (
    <>
      <p className="board-cycle-note">{autoCloseCopy}</p>
      <p className="board-cycle-note">
        Cycles are counted from the project start date. You can also close early
        with the button below. Recurring tasks and time tracking will extend this
        system later.
      </p>
    </>
  );

  const closeButton = (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={advancing}
      onClick={onAdvance}
    >
      {advancing ? 'Closing cycle…' : 'Close early and start next week'}
    </button>
  );

  if (embedded) {
    return (
      <div className="board-cycle-header-body">
        <p className="board-cycle-dates">{dateRange}</p>
        {notes}
        {closeButton}
      </div>
    );
  }

  if (collapse) {
    return (
      <details className="board-cycle-header">
        <summary className="board-cycle-header-summary">
          Weekly cycle
          <span className="board-cycle-header-summary-dates">{dateRange}</span>
        </summary>
        <div className="board-cycle-header-body">
          {notes}
          {closeButton}
        </div>
      </details>
    );
  }

  return (
    <section className="board-cycle-header">
      <div className="board-cycle-header-copy">
        <h2>Weekly cycle</h2>
        <p className="board-cycle-dates">{dateRange}</p>
        {notes}
      </div>
      {closeButton}
    </section>
  );
}
