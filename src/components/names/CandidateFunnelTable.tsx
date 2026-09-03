import { Fragment, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import type { EvidenceLedgerRow } from '../EvidenceLedger';
import { EvidenceLedger } from '../EvidenceLedger';
import { AnalyticsMetricInfo } from '../analytics/AnalyticsMetricInfo';
import { normalizeNameKey } from '../../lib/names/catalog';
import {
  buildFunnelRow,
  keptVerdict,
  pillarCell,
  sortFunnelRows,
  spokenCell,
  type FunnelRow,
  type FunnelSortDir,
  type FunnelSortKey,
} from '../../lib/names/funnel';
import { SIGNAL_COPY } from '../../lib/names/signalCopy';
import { NamesScoreStrip } from './NamesScoreStrip';
import type { NameCandidate } from '../../types/name-session';

const SORT_LABELS: Record<FunnelSortKey, string> = {
  name: 'Name',
  domain: SIGNAL_COPY.domain.name,
  organic: SIGNAL_COPY.organic.name,
  spoken: SIGNAL_COPY.spoken.name,
  taste: SIGNAL_COPY.taste.name,
  total: SIGNAL_COPY.total.name,
};

const COLUMN_INFO_KEYS = ['domain', 'organic', 'spoken', 'taste', 'total'] as const;
type ColumnInfoKey = (typeof COLUMN_INFO_KEYS)[number];

function isColumnInfoKey(key: FunnelSortKey): key is ColumnInfoKey {
  return key !== 'name';
}

function stopInfoKeys(event: KeyboardEvent<HTMLElement>) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.stopPropagation();
  }
}

function stopInfoClick(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function ColumnInfo({ id }: { id: ColumnInfoKey }) {
  const copy = SIGNAL_COPY[id];
  return (
    <span
      className="names-funnel-col-info"
      onClick={stopInfoClick}
      onKeyDown={stopInfoKeys}
    >
      <AnalyticsMetricInfo label={copy.name}>
        <p>{copy.source}</p>
        <p>{copy.howToRead}</p>
        <p>{copy.honestLimit}</p>
        <p>{copy.rules.join(' · ')}</p>
      </AnalyticsMetricInfo>
    </span>
  );
}

function expandedLedgerRows(row: FunnelRow): EvidenceLedgerRow[] {
  return (['domain', 'organic', 'spoken', 'taste'] as const).flatMap((key) => {
    const pillar = row.pillars[key];
    const copy = SIGNAL_COPY[key];
    return pillar.notes.map((note) => ({
      claim: copy.name,
      source: copy.source,
      confidence: note,
      unknown: pillar.unresolved,
    }));
  });
}

function UnresolvedCue() {
  return (
    <>
      <span className="names-unknown-mark" aria-hidden="true" />
      <span className="sr-only">Unresolved</span>
    </>
  );
}

export function CandidateFunnelTable(props: {
  candidates: NameCandidate[];
  namingGoal: string | null;
  shortlistIds: string[];
  resolvingKeys: string[];
  resolvingCount: number;
  isBlind: (candidateId: string) => boolean;
  onKeep: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
  expandedId?: string | null;
  onExpandedId?: (id: string | null) => void;
  renderDetail?: (candidate: NameCandidate) => ReactNode;
}) {
  const [sortKey, setSortKey] = useState<FunnelSortKey>('total');
  const [sortDir, setSortDir] = useState<FunnelSortDir>('desc');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(null);
  const expandedId = props.expandedId ?? internalExpandedId;

  function setExpandedId(next: string | null) {
    props.onExpandedId?.(next);
    if (props.expandedId === undefined) {
      setInternalExpandedId(next);
    }
  }
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
    if (target?.closest('.analytics-metric-info-pop')) return;
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
      setExpandedId(
        expandedId === focused.candidate.id ? null : focused.candidate.id,
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
      <details className="names-funnel-hint">
        <summary>Shortcuts</summary>
        K keep · R reject · arrows select · Enter expands
      </details>
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
                <span className="names-funnel-colhead">
                  <button type="button" onClick={() => toggleSort(key)}>
                    {SORT_LABELS[key]}
                  </button>
                  {isColumnInfoKey(key) ? <ColumnInfo id={key} /> : null}
                </span>
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
              <Fragment key={candidate.id}>
                <tr
                  className={[
                    selected ? 'is-selected' : '',
                    expanded ? 'is-expanded' : '',
                    status === 'Checking' ? 'is-checking' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setFocusedId(candidate.id);
                    setExpandedId(
                      expandedId === candidate.id ? null : candidate.id,
                    );
                  }}
                >
                  <th scope="row" id={`names-candidate-${candidate.id}`}>
                    <span className="names-funnel-name">{candidate.name}</span>
                    {kept ? (
                      <span className="names-funnel-verdict">
                        {keptVerdict(candidate, props.namingGoal)}
                      </span>
                    ) : (
                      <span className="names-funnel-weak">
                        {weakest.reason
                          ? `${weakest.label} · ${weakest.reason}`
                          : weakest.label}
                      </span>
                    )}
                  </th>
                  <td
                    className={`names-funnel-signal ${pillars.domain.unresolved ? 'is-unresolved' : ''}`}
                    data-unresolved={pillars.domain.unresolved ? 'true' : 'false'}
                  >
                    <span className="names-funnel-label">
                      {SIGNAL_COPY.domain.name}
                      <ColumnInfo id="domain" />
                    </span>
                    {pillars.domain.unresolved ? <UnresolvedCue /> : null}
                    {pillarCell(pillars.domain)}
                  </td>
                  <td
                    className={`names-funnel-signal ${pillars.organic.unresolved ? 'is-unresolved' : ''}`}
                    data-unresolved={pillars.organic.unresolved ? 'true' : 'false'}
                  >
                    <span className="names-funnel-label">
                      {SIGNAL_COPY.organic.name}
                      <ColumnInfo id="organic" />
                    </span>
                    {pillars.organic.unresolved ? <UnresolvedCue /> : null}
                    {pillarCell(pillars.organic)}
                  </td>
                  <td className="names-funnel-signal">
                    <span className="names-funnel-label">
                      {SIGNAL_COPY.spoken.name}
                      <ColumnInfo id="spoken" />
                    </span>
                    {spokenCell(pillars)}
                  </td>
                  <td className="names-funnel-signal">
                    <span className="names-funnel-label">
                      {SIGNAL_COPY.taste.name}
                      <ColumnInfo id="taste" />
                    </span>
                    {pillarCell(pillars.taste)}
                  </td>
                  <td className="names-funnel-total">
                    <span className="names-funnel-label">
                      {SIGNAL_COPY.total.name}
                      <ColumnInfo id="total" />
                    </span>
                    {pillars.total}
                  </td>
                  <td className="names-funnel-status">{status}</td>
                  <td className="names-funnel-actions">
                    {blind ? (
                      <span>Answer in Feedback first.</span>
                    ) : (
                      <>
                        {kept ? null : (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
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
                      </>
                    )}
                  </td>
                </tr>
                {expanded ? (
                  <tr className="names-funnel-detail">
                    <td colSpan={8}>
                      {props.renderDetail ? (
                        props.renderDetail(candidate)
                      ) : (
                        <>
                          <NamesScoreStrip pillars={pillars} />
                          <EvidenceLedger
                            caption={`${weakest.label} · ${weakest.reason}`}
                            rows={expandedLedgerRows(row)}
                          />
                        </>
                      )}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
