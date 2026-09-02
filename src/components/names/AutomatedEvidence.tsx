import { useState } from 'react';
import {
  checkNameHandles,
  checkNameHistory,
  fetchProjectNameSession,
} from '../../lib/api/names';
import { nameQuality } from '../../lib/names/score';
import { spokenClarity, spokenFlagLabel } from '../../lib/names/pronunciation';
import type {
  DomainHistory,
  HandleCheck,
  NameCandidate,
  ProjectNameSession,
} from '../../types/name-session';
import {
  availabilityLabel,
  handlePlatformLabel,
  historyLabel,
  organicLabel,
  spokenBandLabel,
} from './labels';
import { NamesSignalHeading } from './NamesSignalHeading';

type RecheckPhase = 'idle' | 'checking' | 'done';

function handleSummary(checks: HandleCheck[]): string {
  if (!checks.length) {
    return 'Handle recheck finished. No probes returned; results stay Unknown.';
  }
  return checks
    .map(
      (item) =>
        `${handlePlatformLabel(item.platform)} ${availabilityLabel(item.availability)}`,
    )
    .join(' · ');
}

function historySummary(items: DomainHistory[]): string {
  if (!items.length) {
    return 'History recheck finished. No probes returned; results stay Unknown.';
  }
  return items
    .map((item) => `${item.host} ${historyLabel(item.status)}`)
    .join(' · ');
}

export function AutomatedEvidence(props: {
  candidate: NameCandidate;
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  busy: string | null;
  onBusy: (value: string | null) => void;
  onSession: (session: ProjectNameSession) => void;
}) {
  const { candidate } = props;
  const quality = nameQuality(candidate.name);
  const spoken = spokenClarity(candidate.name, {
    heardSpelling: candidate.pronunciation?.heardSpelling,
    kept: props.session.shortlistIds.includes(candidate.id),
  });
  const visualFlags = (candidate.visualConcerns?.flags ?? []).filter(
    (flag) => flag !== 'looks_clear',
  );
  const [handlesRecheck, setHandlesRecheck] = useState<{
    phase: RecheckPhase;
    detail: string;
  }>({ phase: 'idle', detail: '' });
  const [historyRecheck, setHistoryRecheck] = useState<{
    phase: RecheckPhase;
    detail: string;
  }>({ phase: 'idle', detail: '' });

  return (
    <div className="names-card-evidence-body">
      <p className="names-meta">
        {quality.charCount} chars · PT ~{spoken.pt.syllables} syllables · EN ~
        {spoken.en.syllables} syllables
        {quality.hyphen ? ' · hyphen' : ''}
        {quality.digit ? ' · digit' : ''}
      </p>
      {candidate.comIncumbency && (
        <p>
          .com owner activity: {candidate.comIncumbency.grade.replace(/_/g, ' ')}
          {candidate.comIncumbency.parking
            ? ` · ${candidate.comIncumbency.parking}`
            : ''}
        </p>
      )}
      <NamesSignalHeading id="spoken" />
      <p>
        Portuguese: {spoken.pt.score}/5 {spokenBandLabel(spoken.pt.band)}
        {spoken.pt.flags.length
          ? ` · ${spoken.pt.flags.map(spokenFlagLabel).join('; ')}`
          : ''}
      </p>
      <p>
        English: {spoken.en.score}/5 {spokenBandLabel(spoken.en.band)}
        {spoken.en.flags.length
          ? ` · ${spoken.en.flags.map(spokenFlagLabel).join('; ')}`
          : ''}
      </p>
      <NamesSignalHeading id="organic" />
      <p>
        {organicLabel(candidate.organicCompetition?.status)}
        {candidate.organicCompetition?.autocomplete.status
          ? ` · autocomplete ${candidate.organicCompetition.autocomplete.status.replace(/_/g, ' ')}`
          : ''}
        {(candidate.domainHistory ?? [])[0]?.status
          ? ` · history ${historyLabel((candidate.domainHistory ?? [])[0]?.status)}`
          : ''}
      </p>
      <NamesSignalHeading id="handles" />
      {(candidate.handleChecks ?? []).length === 0 && (
        <p className="names-meta">Not checked yet.</p>
      )}
      {(candidate.handleChecks ?? []).map((item) => (
        <p key={item.platform}>
          <a
            className="names-text-link"
            href={item.profileUrl}
            target="_blank"
            rel="noreferrer"
          >
            {handlePlatformLabel(item.platform)}
          </a>
          {': '}
          {availabilityLabel(item.availability)}
        </p>
      ))}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={props.busy === 'handles' || handlesRecheck.phase === 'checking'}
        aria-busy={handlesRecheck.phase === 'checking'}
        onClick={async () => {
          props.onBusy('handles');
          setHandlesRecheck({ phase: 'checking', detail: 'Checking handles…' });
          try {
            const checked = await checkNameHandles(
              props.orgId,
              props.projectId,
              props.sessionId,
              candidate.name,
            );
            setHandlesRecheck({
              phase: 'done',
              detail: handleSummary(checked.handleChecks ?? []),
            });
            const latest = await fetchProjectNameSession(
              props.orgId,
              props.projectId,
              props.sessionId,
            );
            props.onSession(latest);
          } catch {
            setHandlesRecheck({
              phase: 'done',
              detail: 'Handle recheck did not finish. Results stay Unknown.',
            });
          } finally {
            props.onBusy(null);
          }
        }}
      >
        Recheck handles
      </button>
      {handlesRecheck.detail ? (
        <p className="names-recheck-status" role="status">
          {handlesRecheck.detail}
        </p>
      ) : null}
      <h5 className="names-brief-label">Domain history</h5>
      {(candidate.domainHistory ?? []).map((item) => (
        <p key={item.host}>
          {item.host}: {historyLabel(item.status)} · {item.checkedAt}
          {' · '}
          <a className="names-text-link" href={item.googleSiteUrl} target="_blank" rel="noreferrer">
            site: search
          </a>
        </p>
      ))}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={props.busy === 'history' || historyRecheck.phase === 'checking'}
        aria-busy={historyRecheck.phase === 'checking'}
        onClick={async () => {
          props.onBusy('history');
          setHistoryRecheck({ phase: 'checking', detail: 'Checking history…' });
          try {
            const checked = await checkNameHistory(
              props.orgId,
              props.projectId,
              props.sessionId,
              candidate.name,
            );
            setHistoryRecheck({
              phase: 'done',
              detail: historySummary(checked.domainHistory ?? []),
            });
            const latest = await fetchProjectNameSession(
              props.orgId,
              props.projectId,
              props.sessionId,
            );
            props.onSession(latest);
          } catch {
            setHistoryRecheck({
              phase: 'done',
              detail: 'History recheck did not finish. Results stay Unknown.',
            });
          } finally {
            props.onBusy(null);
          }
        }}
      >
        Recheck history
      </button>
      {historyRecheck.detail ? (
        <p className="names-recheck-status" role="status">
          {historyRecheck.detail}
        </p>
      ) : null}
      {visualFlags.length > 0 && (
        <div className="names-card-block">
          <NamesSignalHeading id="visual" />
          <p>
            {visualFlags.join(', ')}
            {candidate.visualConcerns?.note ? ` · ${candidate.visualConcerns.note}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
