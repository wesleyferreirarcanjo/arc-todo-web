import type { SessionLogView } from '../lib/tasks/sessionLogView';

function formatLogTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

export function SessionLogInlineView({ view }: { view: SessionLogView }) {
  if (view.mode === 'raw') {
    return (
      <div className="task-qa-session-log-view">
        <pre>{view.text}</pre>
      </div>
    );
  }

  return (
    <div className="task-qa-session-log-view">
      {view.events.length === 0 ? (
        <p className="task-details-muted">No capture events.</p>
      ) : (
        view.events.map((event, index) => (
          <div
            key={`${event.ts}-${event.kind}-${index}`}
            className="task-qa-session-log-event"
          >
            <span className="task-qa-session-log-ts">{formatLogTime(event.ts)}</span>
            <span className="task-qa-session-log-kind">{event.kind}</span>
            {event.kind === 'console' ? (
              <span
                className={`task-qa-session-log-level${event.level === 'error' ? ' is-error' : ''}`}
              >
                {event.level}
              </span>
            ) : (
              <span className="task-qa-session-log-level">
                {event.method} {event.status ?? '—'}
              </span>
            )}
            <div className="task-qa-session-log-body">
              {event.kind === 'console' ? (
                <>
                  {event.message}
                  {event.stack ? (
                    <pre className="task-qa-session-log-stack">{event.stack}</pre>
                  ) : null}
                </>
              ) : (
                event.url
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
