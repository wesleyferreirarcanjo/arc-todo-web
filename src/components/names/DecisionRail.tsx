import { EvidenceLedger } from '../EvidenceLedger';
import { deskStanding, deskUnresolvedRows } from '../../lib/names/desk';
import type { ProjectNameSession } from '../../types/name-session';

export function DecisionRail({ session }: { session: ProjectNameSession }) {
  const standing = deskStanding(session);
  const unresolved = deskUnresolvedRows(session);
  const pickLabel = standing.pick?.name ?? 'No pick yet';
  const runnerLabel = standing.runnerUp?.name ?? 'None yet';

  return (
    <aside className="names-desk-rail" aria-label="Decision desk">
      <section className="names-desk-rail-block">
        <h3>Standing pick</h3>
        <p className="names-desk-rail-name">{pickLabel}</p>
        <p className="names-meta">
          Human choice. Highest total is not auto-picked.
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
        {unresolved.length === 0 ? (
          <p className="names-meta">Nothing unresolved on the names in play.</p>
        ) : (
          <EvidenceLedger rows={unresolved} />
        )}
      </section>
    </aside>
  );
}
