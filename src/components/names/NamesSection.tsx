import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { ChatApiError, sendChatMessage } from '../../lib/api/chat';
import {
  checkNameHistory,
  fetchProjectNameSession,
} from '../../lib/api/names';
import { BRAND_SOURCES } from '../../lib/names/brandSources';
import {
  googleAppQueryUrl,
  googleImagesQueryUrl,
  googleQueryUrl,
  NAME_FAMILIES,
  normalizeNameKey,
} from '../../lib/names/catalog';
import { languagePrompt } from '../../lib/names/prompts';
import { nameQuality } from '../../lib/names/score';
import type {
  BrandResult,
  FeedbackRoundView,
  NameCandidate,
  ProjectNameSession,
} from '../../types/name-session';
import { availabilityLabel, historyLabel, sourceLabel } from './labels';

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
  isBlind: boolean;
  openRound: FeedbackRoundView | undefined;
  onCheckName: (name?: string) => void;
  onSuggestNames: () => void;
  onGenerateFamilies: () => void;
  onPreview: (candidateId: string) => void;
  onUpdateCandidate: (candidate: NameCandidate) => void;
  onExplore: (candidate: NameCandidate) => void;
  onBusy: (value: string | null) => void;
  onSession: (session: ProjectNameSession) => void;
}) {
  const { session } = props;

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
          disabled={props.busy === 'check'}
          onClick={() => void props.onCheckName()}
        >
          Check name
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={props.busy === 'suggest'}
          onClick={() => void props.onSuggestNames()}
        >
          Suggest names
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
      {props.visibleCandidates.length === 0 ? (
        <p className="names-empty">
          Type a name and press Enter, or Suggest names from the sentence above.
        </p>
      ) : (
      <ul className="names-candidate-list">
        {props.visibleCandidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            session={session}
            orgId={props.orgId}
            projectId={props.projectId}
            sessionId={props.sessionId}
            isBlind={Boolean(props.isBlind && props.openRound?.candidateIds.includes(candidate.id))}
            busy={props.busy}
            onBusy={props.onBusy}
            onSession={props.onSession}
            onCheck={() => void props.onCheckName(candidate.name)}
            onPreview={() => props.onPreview(candidate.id)}
            onUpdate={(next) => props.onUpdateCandidate(next)}
            onExplore={() => props.onExplore(candidate)}
          />
        ))}
      </ul>
      )}
    </section>
  );
}

function CandidateCard(props: {
  candidate: NameCandidate;
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  isBlind: boolean;
  busy: string | null;
  onBusy: (value: string | null) => void;
  onSession: (session: ProjectNameSession) => void;
  onCheck: () => void;
  onPreview: () => void;
  onUpdate: (candidate: NameCandidate) => void;
  onExplore: () => void;
}) {
  const { candidate, isBlind } = props;
  const quality = nameQuality(candidate.name);
  const [brandNote, setBrandNote] = useState('');
  const [heard, setHeard] = useState(candidate.pronunciation?.heardSpelling ?? '');
  const [notes, setNotes] = useState(candidate.notes ?? '');
  const speechOk = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    setHeard(candidate.pronunciation?.heardSpelling ?? '');
    setNotes(candidate.notes ?? '');
  }, [candidate.id, candidate.notes, candidate.pronunciation?.heardSpelling]);

  if (isBlind) {
    return (
      <li className="names-card">
        <strong>{candidate.name}</strong>
        <p>Answer this name in Feedback round first.</p>
      </li>
    );
  }

  return (
    <li className="names-card">
      <header className="names-card-head">
        <div>
          <strong>{candidate.name}</strong>
          <p className="diagram-card-meta">
            {sourceLabel(candidate.sources)} · {candidate.family || 'untagged'}
            {candidate.derivedFromCandidateId && ' · variation'}
            {candidate.status !== 'active' && ` · ${candidate.status}`}
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={props.onCheck}>
          Check name
        </button>
      </header>
      <div className="names-tlds">
        {(candidate.domainChecks ?? []).map((check) => (
          <span key={check.host} className={`names-pill names-pill-${check.availability}`}>
            .{check.tld} {availabilityLabel(check.availability)}
          </span>
        ))}
        {!candidate.domainChecks?.length && <span className="names-pill">Unchecked</span>}
      </div>
      <div className="names-card-links">
        <a
          href={candidate.googleQueryUrl || googleQueryUrl(candidate.name)}
          target="_blank"
          rel="noreferrer"
        >
          View all on Google
        </a>
        <a href={googleAppQueryUrl(candidate.name)} target="_blank" rel="noreferrer">
          {candidate.name} app
        </a>
        <a href={googleImagesQueryUrl(candidate.name)} target="_blank" rel="noreferrer">
          Images
        </a>
        <button type="button" onClick={props.onPreview}>
          Preview in context
        </button>
      </div>
      <details className="names-card-more">
        <summary>More checks</summary>
        <p className="diagram-card-meta">
          {quality.charCount} chars · ~{quality.syllablesApprox} syllables
          {quality.hyphen ? ' · hyphen' : ''}
          {quality.digit ? ' · digit' : ''}
          {quality.ambiguous ? ' · ambiguous letters' : ''}
        </p>
        <div className="names-card-links">
          <button type="button" onClick={props.onExplore}>
            Explore variations
          </button>
        </div>
        <p className="page-subtitle">
          Brand footprint — preliminary check only, not legal clearance.
        </p>
        <div className="names-brand-grid">
          {BRAND_SOURCES.map((source) => {
            const recorded = (candidate.brandChecks ?? []).find(
              (item) => item.source === source.id,
            );
            return (
              <div key={source.id} className="names-brand-row">
                <a href={source.url(candidate.name)} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
                <select
                  value={recorded?.result ?? 'unknown'}
                  onChange={(event) => {
                    const result = event.target.value as BrandResult;
                    const next = [...(candidate.brandChecks ?? []).filter((item) => item.source !== source.id), {
                      source: source.id,
                      result,
                      note: brandNote || recorded?.note || '',
                      queryUrl: source.url(candidate.name),
                      checkedAt: new Date().toISOString(),
                    }];
                    props.onUpdate({ ...candidate, brandChecks: next });
                  }}
                >
                  <option value="unknown">Unknown</option>
                  <option value="clear">Clear</option>
                  <option value="collision">Collision</option>
                </select>
              </div>
            );
          })}
        </div>
        <label className="form-field">
          <span>Note</span>
          <input value={brandNote} onChange={(event) => setBrandNote(event.target.value)} />
        </label>
        {(candidate.brandChecks ?? []).some((item) => item.result === 'collision') && (
          <div className="alert">Exact collision recorded. This is not legal clearance.</div>
        )}
        <p className="names-brief-label">Domain history</p>
        {(candidate.domainHistory ?? []).map((item) => (
          <p key={item.host}>
            {item.host}: {historyLabel(item.status)} · {item.checkedAt}
            {' · '}
            <a href={item.googleSiteUrl} target="_blank" rel="noreferrer">
              site: search
            </a>
          </p>
        ))}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={async () => {
            props.onBusy('history');
            try {
              await checkNameHistory(
                props.orgId,
                props.projectId,
                props.sessionId,
                candidate.name,
              );
              const latest = await fetchProjectNameSession(
                props.orgId,
                props.projectId,
                props.sessionId,
              );
              props.onSession(latest);
            } finally {
              props.onBusy(null);
            }
          }}
        >
          Recheck history
        </button>
        <div className="names-inline">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (!speechOk) {
                props.onUpdate({
                  ...candidate,
                  pronunciation: { ...candidate.pronunciation, speechUnsupported: true },
                });
                return;
              }
              const utter = new SpeechSynthesisUtterance(candidate.name);
              window.speechSynthesis.speak(utter);
            }}
          >
            Hear name
          </button>
          {candidate.pronunciation?.speechUnsupported && (
            <span>Speech is unavailable in this browser.</span>
          )}
          <input
            placeholder="How you heard the spelling"
            value={heard}
            onChange={(event) => setHeard(event.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              props.onUpdate({
                ...candidate,
                pronunciation: {
                  heardSpelling: heard,
                  mismatch: normalizeNameKey(heard) !== normalizeNameKey(candidate.name),
                  note: heard,
                },
              })
            }
          >
            Save heard spelling
          </button>
        </div>
        <p className="page-subtitle">Check language — AI-assisted, verify with a native speaker</p>
        <div className="names-inline">
          {['Português', 'Inglês'].map((language) => {
            const manual = (candidate.languageChecks?.manual ?? []).find(
              (item) => item.language === language,
            );
            return (
              <label key={language}>
                {language}
                <select
                  value={manual?.result ?? 'unknown'}
                  onChange={(event) => {
                    const result = event.target.value as 'clear' | 'concern' | 'unknown';
                    const rest = (candidate.languageChecks?.manual ?? []).filter(
                      (item) => item.language !== language,
                    );
                    props.onUpdate({
                      ...candidate,
                      languageChecks: {
                        ...candidate.languageChecks,
                        manual: [
                          ...rest,
                          {
                            language,
                            result,
                            note: manual?.note ?? '',
                          },
                        ],
                      },
                    });
                  }}
                >
                  <option value="unknown">Unknown</option>
                  <option value="clear">Clear</option>
                  <option value="concern">Concern</option>
                </select>
              </label>
            );
          })}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={async () => {
            try {
              const reply = await sendChatMessage({
                messages: [
                  {
                    role: 'user',
                    content: languagePrompt(candidate.name, ['Português', 'Inglês']),
                  },
                ],
                organizationId: props.orgId,
                projectId: props.projectId,
              });
              props.onUpdate({
                ...candidate,
                languageChecks: {
                  ...candidate.languageChecks,
                  aiAssisted: {
                    text: reply.message,
                    languages: ['Português', 'Inglês'],
                    checkedAt: new Date().toISOString(),
                  },
                },
              });
            } catch (err) {
              props.onUpdate({
                ...candidate,
                languageChecks: {
                  ...candidate.languageChecks,
                  aiAssisted: {
                    text:
                      err instanceof ChatApiError
                        ? err.message
                        : 'Language helper unavailable.',
                    languages: ['Português', 'Inglês'],
                    checkedAt: new Date().toISOString(),
                  },
                },
              });
            }
          }}
        >
          Check language
        </button>
        {candidate.languageChecks?.aiAssisted?.text && (
          <p>{candidate.languageChecks.aiAssisted.text}</p>
        )}
        <label className="form-field">
          <span>Language note</span>
          <input
            value={
              (candidate.languageChecks?.manual ?? []).find((item) => item.note)?.note ??
              ''
            }
            onChange={(event) => {
              const manual = (candidate.languageChecks?.manual ?? []).map((item) => ({
                ...item,
                note: event.target.value,
              }));
              props.onUpdate({
                ...candidate,
                languageChecks: { ...candidate.languageChecks, manual },
              });
            }}
          />
        </label>
        <label className="form-field">
          <span>Notes</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => {
              if (notes !== (candidate.notes ?? '')) {
                props.onUpdate({ ...candidate, notes });
              }
            }}
          />
        </label>
        <div className="names-inline">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              props.onUpdate({ ...candidate, status: 'rejected', notes })
            }
          >
            Reject
          </button>
        </div>
      </details>
    </li>
  );
}
