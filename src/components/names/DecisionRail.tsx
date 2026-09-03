import { deskNameRows, deskStanding } from '../../lib/names/desk';
import type { ProjectNameSession } from '../../types/name-session';

export function DecisionRail(props: {
  session: ProjectNameSession;
  onFocusName?: (candidateId: string) => void;
}) {
  const standing = deskStanding(props.session);
  const names = deskNameRows(props.session);
  const pickLabel = standing.pick?.name ?? 'No pick yet';
  const runnerLabel = standing.runnerUp?.name ?? 'None yet';

  return (
    <aside className="names-desk-rail" aria-label="Decision desk">
      <section className="names-desk-rail-block">
        <h3>Standing pick</h3>
        <p className="names-desk-rail-name">{pickLabel}</p>
        <p className="names-meta">
          You pick — totals do not.
        </p>
      </section>
      <section className="names-desk-rail-block">
        <h3>Also standing</h3>
        <p className="names-desk-rail-name">{runnerLabel}</p>
        {standing.alsoStanding.length > 1 ? (
          <p className="names-meta">
            {standing.alsoStanding.length} kept names besides the pick.
          </p>
        ) : null}
      </section>
      <section className="names-desk-rail-block">
        <h3>Still unresolved</h3>
        {names.length === 0 ? (
          <p className="names-meta">Nothing unresolved on the names in play.</p>
        ) : (
          <ul className="names-desk-name-list">
            {names.map((row) => (
              <li key={row.candidateId}>
                <button
                  type="button"
                  className="names-desk-name-link"
                  onClick={() => props.onFocusName?.(row.candidateId)}
                >
                  {row.name} — {row.unknownCount}{' '}
                  {row.unknownCount === 1 ? 'unknown' : 'unknowns'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
