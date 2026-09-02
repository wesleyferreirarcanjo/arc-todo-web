import { useMemo, useState, type KeyboardEvent } from 'react';
import { normalizeNameKey } from '../../lib/names/catalog';
import {
  buildFunnelRow,
  pillarCell,
  sortFunnelRows,
  spokenCell,
  type FunnelSortDir,
  type FunnelSortKey,
} from '../../lib/names/funnel';
import type { NameCandidate } from '../../types/name-session';

const SORT_LABELS: Record<FunnelSortKey, string> = {
  name: 'Name',
  domain: 'Domain',
  organic: 'Organic',
  spoken: 'Spoken',
  taste: 'Taste',
  total: 'Total',
};

export function CandidateFunnelTable(props: {
  candidates: NameCandidate[];
  namingGoal: string | null;
  shortlistIds: string[];
  resolvingKeys: string[];
  resolvingCount: number;
  isBlind: (candidateId: string) => boolean;
  onKeep: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
}) {
  const [sortKey, setSortKey] = useState<FunnelSortKey>('total');
  const [sortDir, setSortDir] = useState<FunnelSortDir>('desc');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const resolving = useMemo(
    () => new Set(props.resolvingKeys),
    [props.resolvingKeys],
  );

  const rows = useMemo(() => {
    const built = props.candidates.map((candidate) =>
      buildFunnelRow(candidate, props.namingGoal, {
        kept: props.shortlistIds.includes(candidate.id),
        resolving: resolving.has(normalizeNameKey(candidate.name)),
      }),
    );
    return sortFunnelRows(built, sortKey, sortDir);
  }, [
    props.candidates,
    props.namingGoal,
    props.shortlistIds,
    resolving,
    sortKey,
    sortDir,
  ]);

  const focused =
    rows.find((row) => row.candidate.id === focusedId) ?? rows[0] ?? null;

  function toggleSort(key: FunnelSortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'name' ? 'asc' : 'desc');
  }

  function moveFocus(delta: number) {
    if (!rows.length) return;
    const current = focused ? rows.findIndex((row) => row.candidate.id === focused.candidate.id) : 0;
    const next = rows[(current + delta + rows.length) % rows.length];
    setFocusedId(next.candidate.id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(-1);
    } else if (event.key === 'k' || event.key === 'K') {
      if (focused && !props.isBlind(focused.candidate.id)) {
        event.preventDefault();
        props.onKeep(focused.candidate.id);
      }
    } else if (event.key === 'r' || event.key === 'R') {
      if (focused && !props.isBlind(focused.candidate.id)) {
        event.preventDefault();
        props.onReject(focused.candidate.id);
      }
    } else if (event.key === 'Enter' && focused) {
      event.preventDefault();
      setExpandedId((prev) =>
        prev === focused.candidate.id ? null : focused.candidate.id,
      );
    }
  }

  function ariaSort(key: FunnelSortKey): 'ascending' | 'descending' | 'none' {
    if (sortKey !== key) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }

  return (
    <div
      className="names-funnel-wrap"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Name candidates"
    >
      {props.resolvingCount > 0 && (
        <p className="names-funnel-progress" role="status">
          {props.resolvingCount === 1
            ? '1 of this wave still resolving'
            : `${props.resolvingCount} of this wave still resolving`}
        </p>
      )}
      <p className="names-funnel-hint">
        K keep · R reject · arrows select · Enter opens signals on a phone
      </p>
      <table className="names-funnel">
        <caption className="sr-only">
          Sortable name candidates with domain, organic, spoken, and taste
          signals
        </caption>
        <thead>
          <tr>
            {(Object.keys(SORT_LABELS) as FunnelSortKey[]).map((key) => (
              <th
                key={key}
                scope="col"
                aria-sort={ariaSort(key)}
                className={
                  key === 'name' ? undefined : 'names-funnel-signal'
                }
              >
                <button type="button" onClick={() => toggleSort(key)}>
                  {SORT_LABELS[key]}
                </button>
              </th>
            ))}
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { candidate, pillars, status, weakest } = row;
            const selected = focused?.candidate.id === candidate.id;
            const expanded = expandedId === candidate.id;
            const blind = props.isBlind(candidate.id);
            const kept = props.shortlistIds.includes(candidate.id);
            return (
              <tr
                key={candidate.id}
                className={[
                  selected ? 'is-selected' : '',
                  expanded ? 'is-expanded' : '',
                  status === 'Checking' ? 'is-checking' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  setFocusedId(candidate.id);
                  setExpandedId((prev) =>
                    prev === candidate.id ? null : candidate.id,
                  );
                }}
              >
                <th scope="row">
                  <span className="names-funnel-name">{candidate.name}</span>
                  <span className="names-funnel-weak">{weakest.label}</span>
                </th>
                <td
                  className={`names-funnel-signal ${pillars.domain.unresolved ? 'is-unresolved' : ''}`}
                  data-unresolved={pillars.domain.unresolved ? 'true' : 'false'}
                >
                  <span className="names-funnel-label">Domain</span>
                  {pillarCell(pillars.domain)}
                </td>
                <td
                  className={`names-funnel-signal ${pillars.organic.unresolved ? 'is-unresolved' : ''}`}
                  data-unresolved={pillars.organic.unresolved ? 'true' : 'false'}
                >
                  <span className="names-funnel-label">Organic</span>
                  {pillarCell(pillars.organic)}
                </td>
                <td className="names-funnel-signal">
                  <span className="names-funnel-label">Spoken</span>
                  {spokenCell(pillars)}
                </td>
                <td className="names-funnel-signal">
                  <span className="names-funnel-label">Taste</span>
                  {pillarCell(pillars.taste)}
                </td>
                <td className="names-funnel-total">
                  <span className="names-funnel-label">Total</span>
                  {pillars.total}
                </td>
                <td className="names-funnel-status">{status}</td>
                <td className="names-funnel-actions">
                  {blind ? (
                    <span>Answer in Feedback first.</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        aria-pressed={kept}
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onKeep(candidate.id);
                        }}
                      >
                        Keep
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onReject(candidate.id);
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
