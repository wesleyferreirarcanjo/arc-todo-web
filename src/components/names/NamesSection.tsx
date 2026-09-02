import { type Dispatch, type SetStateAction } from 'react';
import { NAME_FAMILIES } from '../../lib/names/catalog';
import type {
  FeedbackRoundView,
  NameCandidate,
  ProjectNameSession,
} from '../../types/name-session';
import { CandidateCard } from './CandidateCard';
import { CandidateFunnelTable } from './CandidateFunnelTable';

export function NamesSection(props: {
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  typedName: string;
  onTypedName: (value: string) => void;
  busy: string | null;
  families: string[];
  onFamilies: Dispatch<SetStateAction<string[]>>;
  filterLane: string;
  onFilterLane: (value: string) => void;
  filterFamily: string;
  onFilterFamily: (value: string) => void;
  filterSource: string;
  onFilterSource: (value: string) => void;
  visibleCandidates: NameCandidate[];
  resolvingKeys: string[];
  isBlind: boolean;
  openRound: FeedbackRoundView | undefined;
  onCheckName: (name?: string) => void;
  onSuggestNames: () => void;
  onGenerateFamilies: () => void;
  onPreview: (candidateId: string) => void;
  onUpdateCandidate: (candidate: NameCandidate) => void;
  onExplore: (candidate: NameCandidate) => void;
  onKeep: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
  onBusy: (value: string | null) => void;
  onSession: (session: ProjectNameSession) => void;
}) {
  const { session } = props;
  const wave = props.visibleCandidates.filter(
    (candidate) => candidate.status !== 'rejected',
  );
  const kept = wave.filter((candidate) =>
    session.shortlistIds.includes(candidate.id),
  );
  const rejectedCount = props.visibleCandidates.filter(
    (candidate) => candidate.status === 'rejected',
  ).length;

  function isBlind(candidateId: string) {
    return Boolean(
      props.isBlind && props.openRound?.candidateIds.includes(candidateId),
    );
  }

  return (
    <section className="names-panel">
      <h3>Names</h3>
      <div className="names-composer">
        <input
          value={props.typedName}
          placeholder="Type a name"
          aria-label="Name"
          onChange={(event) => props.onTypedName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void props.onCheckName();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={props.busy === 'suggest'}
          onClick={() => void props.onSuggestNames()}
        >
          Suggest names
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={props.busy === 'check'}
          onClick={() => void props.onCheckName()}
        >
          Check name
        </button>
      </div>
      <details className="names-description-details">
        <summary>
          <span>
            <strong>Generate more</strong>
            <small>Families, filters, and AI possibilities</small>
          </span>
        </summary>
        <div className="names-description-details-body">
          <fieldset className="names-families">
            <legend>Name families</legend>
            {NAME_FAMILIES.map((family) => (
              <label key={family.id} className="names-chip">
                <input
                  type="checkbox"
                  checked={props.families.includes(family.id)}
                  onChange={(event) =>
                    props.onFamilies((prev) =>
                      event.target.checked
                        ? [...prev, family.id]
                        : prev.filter((id) => id !== family.id),
                    )
                  }
                />
                {family.label}
              </label>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={props.busy === 'families'}
              onClick={() => void props.onGenerateFamilies()}
            >
              Generate possibilities
            </button>
          </fieldset>
          {(session.candidates.length > 3 || (session.lanes ?? []).length > 0) && (
            <div className="names-filters">
              {(session.lanes ?? []).length > 0 && (
                <select value={props.filterLane} onChange={(event) => props.onFilterLane(event.target.value)}>
                  <option value="">All lanes</option>
                  {(session.lanes ?? []).map((lane) => (
                    <option key={lane.id} value={lane.id}>
                      {lane.title}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={props.filterFamily}
                onChange={(event) => props.onFilterFamily(event.target.value)}
              >
                <option value="">All families</option>
                {NAME_FAMILIES.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.label}
                  </option>
                ))}
              </select>
              <select
                value={props.filterSource}
                onChange={(event) => props.onFilterSource(event.target.value)}
              >
                <option value="">All sources</option>
                <option value="human">human</option>
                <option value="chatbot">chatbot</option>
                <option value="mcp">mcp</option>
              </select>
            </div>
          )}
        </div>
      </details>
      {wave.length === 0 ? (
        <p className="names-empty">
          Type a name to check it, or Suggest names from the sentence above.
        </p>
      ) : (
        <CandidateFunnelTable
          candidates={wave}
          namingGoal={session.namingGoal}
          shortlistIds={session.shortlistIds}
          resolvingKeys={props.resolvingKeys}
          resolvingCount={props.resolvingKeys.length}
          isBlind={isBlind}
          onKeep={props.onKeep}
          onReject={props.onReject}
        />
      )}
      {rejectedCount > 0 && (
        <p className="diagram-card-meta">
          {rejectedCount === 1
            ? '1 rejected name is hidden from this wave.'
            : `${rejectedCount} rejected names are hidden from this wave.`}
        </p>
      )}
      {kept.length > 0 && (
        <div className="names-kept">
          <h4>Kept</h4>
          <ul className="names-candidate-list">
            {kept.map((candidate) => (
              <li key={candidate.id}>
                <CandidateCard
                  candidate={candidate}
                  session={session}
                  orgId={props.orgId}
                  projectId={props.projectId}
                  sessionId={props.sessionId}
                  isBlind={isBlind(candidate.id)}
                  busy={props.busy}
                  onBusy={props.onBusy}
                  onSession={props.onSession}
                  onCheck={() => void props.onCheckName(candidate.name)}
                  onPreview={() => props.onPreview(candidate.id)}
                  onUpdate={(next) => props.onUpdateCandidate(next)}
                  onExplore={() => props.onExplore(candidate)}
                  onReject={() => props.onReject(candidate.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
