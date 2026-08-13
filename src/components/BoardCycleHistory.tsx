import { BOARD_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import type { BoardCycleHistoryResponse } from '../types/boardCycle';

interface BoardCycleHistoryProps {
  history: BoardCycleHistoryResponse;
  loading: boolean;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function HistoryEntries({ history }: { history: BoardCycleHistoryResponse }) {
  return (
    <>
      <p className="board-cycle-note">
        Archived completed work from closed cycles. This is separate from per-task
        edit history in task details.
      </p>
      <ul className="board-cycle-history-list">
        {history.cycles.map((cycle) => (
          <li key={cycle.id} className="board-cycle-history-item">
            <div className="board-cycle-history-heading">
              <strong>
                {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
              </strong>
              {cycle.closedAt && (
                <span className="board-cycle-history-closed">
                  Closed{' '}
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(cycle.closedAt))}
                </span>
              )}
            </div>
            {cycle.entries.length === 0 ? (
              <p className="board-cycle-history-empty">No completed work archived.</p>
            ) : (
              <ul className="board-cycle-history-entries">
                {cycle.entries.map((entry) => (
                  <li key={entry.id}>
                    <span className="board-cycle-entry-id">{entry.displayId}</span>{' '}
                    {entry.title}
                    {entry.parentTaskId ? ' (subtask)' : ''}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function HistoryStatus({ loading }: { loading: boolean }) {
  return (
    <p className="status-message">
      {loading
        ? 'Loading sprint history…'
        : 'No closed cycles yet. Completed work appears here after you close a weekly cycle.'}
    </p>
  );
}

export function BoardCycleHistoryPanel({
  history,
  loading,
}: BoardCycleHistoryProps) {
  const isMobileBoard = useMediaQuery(BOARD_MOBILE_QUERY);
  const showStatus = loading || history.cycles.length === 0;

  if (isMobileBoard) {
    return (
      <details className="board-cycle-history">
        <summary className="board-cycle-history-summary">Sprint history</summary>
        {showStatus ? (
          <p className="status-message">
            {loading ? 'Loading sprint history…' : 'No closed cycles yet.'}
          </p>
        ) : (
          <HistoryEntries history={history} />
        )}
      </details>
    );
  }

  if (showStatus) {
    return <HistoryStatus loading={loading} />;
  }

  return (
    <section className="board-cycle-history">
      <h3>Sprint history</h3>
      <HistoryEntries history={history} />
    </section>
  );
}
