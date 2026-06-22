import type { BoardCycle } from '../types/boardCycle';

interface BoardCycleHeaderProps {
  cycle: BoardCycle;
  advancing: boolean;
  onAdvance: () => void;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function BoardCycleHeader({
  cycle,
  advancing,
  onAdvance,
}: BoardCycleHeaderProps) {
  return (
    <section className="board-cycle-header">
      <div className="board-cycle-header-copy">
        <h2>Weekly cycle</h2>
        <p className="board-cycle-dates">
          {formatDateRange(cycle.startDate, cycle.endDate)}
        </p>
        <p className="board-cycle-note">
          Completed tasks are archived into sprint history when you close the
          cycle and hidden from the next active board. Recurring tasks and time
          tracking will extend this cycle system later.
        </p>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={advancing}
        onClick={onAdvance}
      >
        {advancing ? 'Closing cycle…' : 'Close and start next week'}
      </button>
    </section>
  );
}
