import { useEffect, useState } from 'react';
import { ChatApiError, sendChatMessage } from '../../lib/api/chat';
import {
  checkNameHandles,
  checkNameHistory,
  fetchProjectNameSession,
} from '../../lib/api/names';
import { BRAND_SOURCES } from '../../lib/names/brandSources';
import {
  googleAppQueryUrl,
  googleImagesQueryUrl,
  googleQueryUrl,
  normalizeNameKey,
} from '../../lib/names/catalog';
import { languagePrompt } from '../../lib/names/prompts';
import { spokenClarity, spokenFlagLabel } from '../../lib/names/pronunciation';
import { candidateScore, nameQuality, pillarDisplay } from '../../lib/names/score';
import type {
  BrandResult,
  NameCandidate,
  ProjectNameSession,
} from '../../types/name-session';
import {
  availabilityLabel,
  handlePlatformLabel,
  historyLabel,
  organicLabel,
  sourceLabel,
  spokenBandLabel,
} from './labels';

export function CandidateCard(props: {
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
  onReject: () => void;
}) {
  const { candidate, isBlind } = props;
  const quality = nameQuality(candidate.name);
  const spoken = spokenClarity(candidate.name, {
    heardSpelling: candidate.pronunciation?.heardSpelling,
    kept: props.session.shortlistIds.includes(candidate.id),
  });
  const pillars = candidateScore(candidate, props.session.namingGoal, {
    kept: props.session.shortlistIds.includes(candidate.id),
  });
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
      <article className="names-card">
        <strong>{candidate.name}</strong>
        <p>Answer this name in Feedback round first.</p>
      </article>
    );
  }

  return (
    <article className="names-card">
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
      <div className="names-tlds">
        <span
          className={`names-pill ${pillars.domain.unresolved ? 'names-pill-unknown' : ''}`}
        >
          Domain {pillarDisplay(pillars.domain)}
        </span>
        <span
          className={`names-pill names-pill-${candidate.organicCompetition?.status ?? 'unknown'}`}
        >
          Organic {pillarDisplay(pillars.organic)}
        </span>
        <span className={`names-pill names-pill-${spoken.pt.band}`}>
          PT {spoken.pt.score} {spokenBandLabel(spoken.pt.band)}
        </span>
        <span className={`names-pill names-pill-${spoken.en.band}`}>
          EN {spoken.en.score} {spokenBandLabel(spoken.en.band)}
        </span>
        <span className="names-pill">Total {pillars.total}</span>
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
      <details className="names-card-more" open>
        <summary>Evidence</summary>
        <p className="diagram-card-meta">
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
        <p className="page-subtitle">
          Spoken clarity — Portuguese and English are scored separately, not as
          one verdict.
        </p>
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
        <p className="page-subtitle">
          Organic competition — not trademark, language, or ranking clearance.
        </p>
        <p>
          {organicLabel(candidate.organicCompetition?.status)}
          {candidate.organicCompetition?.autocomplete.status
            ? ` · autocomplete ${candidate.organicCompetition.autocomplete.status.replace(/_/g, ' ')}`
            : ''}
          {(candidate.domainHistory ?? [])[0]?.status
            ? ` · history ${historyLabel((candidate.domainHistory ?? [])[0]?.status)}`
            : ''}
        </p>
        <p className="names-brief-label">Social handles</p>
        {(candidate.handleChecks ?? []).length === 0 && (
          <p className="diagram-card-meta">Not checked yet.</p>
        )}
        {(candidate.handleChecks ?? []).map((item) => (
          <p key={item.platform}>
            <a href={item.profileUrl} target="_blank" rel="noreferrer">
              {handlePlatformLabel(item.platform)}
            </a>
            {': '}
            {availabilityLabel(item.availability)}
          </p>
        ))}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={props.busy === 'handles'}
          onClick={async () => {
            props.onBusy('handles');
            try {
              await checkNameHandles(
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
          Recheck handles
        </button>
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
          {spoken.pt.flags.includes('heard_mismatch') && (
            <span>
              Heard spelling does not match — strongest negative for this kept
              name.
            </span>
          )}
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
            onClick={() => {
              props.onUpdate({ ...candidate, notes });
              props.onReject();
            }}
          >
            Reject
          </button>
        </div>
      </details>
    </article>
  );
}
