import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError } from '../lib/api/client';
import { ChatApiError, sendChatMessage } from '../lib/api/chat';
import {
  addNameCandidates,
  checkNameCandidate,
  checkNameHistory,
  closeNameFeedbackRound,
  fetchProjectNameSession,
  recommendNameCandidate,
  startNameFeedbackRound,
  updateProjectNameSession,
  upsertNameFeedback,
} from '../lib/api/names';
import { BRAND_SOURCES } from '../lib/names/brandSources';
import {
  CODENAME_THEMES,
  NAMING_GOAL_OPTIONS,
  NAME_FAMILIES,
  VISUAL_FLAGS,
  goalProfile,
  googleAppQueryUrl,
  googleImagesQueryUrl,
  googleQueryUrl,
  initialsFor,
  normalizeNameKey,
  slugifyName,
} from '../lib/names/catalog';
import {
  buildDescriptionPrompt,
  canvasHasProduct,
  generateFamiliesPrompt,
  languagePrompt,
  messagingPrompt,
  parseJsonBlock,
  parseNameLines,
  suggestNamesPrompt,
} from '../lib/names/prompts';
import { buildDecisionReport } from '../lib/names/report';
import { candidateScore, nameQuality } from '../lib/names/score';
import { exploreVariations } from '../lib/names/variations';
import type {
  BrandResult,
  NameCandidate,
  NameLane,
  NamingGoal,
  ProductDescription,
  ProjectNameSession,
  CandidateSource,
} from '../types/name-session';

const SECTIONS = [
  'description',
  'goal',
  'names',
  'preview',
  'messaging',
  'compare',
  'feedback',
] as const;

function availabilityLabel(value: string | undefined): string {
  if (value === 'available') return 'Available';
  if (value === 'taken') return 'Taken';
  return 'Unknown';
}

function historyLabel(value: string | undefined): string {
  if (value === 'history_found') return 'History found';
  if (value === 'no_history_found') return 'No history found';
  return 'Unknown';
}

function sourceLabel(sources: string[] | undefined): string {
  if (!sources?.length) return 'human';
  return sources.join(', ');
}

export function NameSessionPage() {
  const { orgId, projectId, sessionId } = useParams();
  const { currentProject } = useWorkspace();
  const { user } = useAuth();
  const [session, setSession] = useState<ProjectNameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [section, setSection] = useState<(typeof SECTIONS)[number]>('description');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [families, setFamilies] = useState<string[]>([
    'descriptive',
    'suggestive',
    'invented',
  ]);
  const [codenameTheme, setCodenameTheme] = useState('astronomy');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [filterFamily, setFilterFamily] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterLane, setFilterLane] = useState('');
  const [previewWide, setPreviewWide] = useState(true);
  const [previewDark, setPreviewDark] = useState(false);
  const [previewCandidateId, setPreviewCandidateId] = useState<string | null>(null);
  const [customExtension, setCustomExtension] = useState('Studio');
  const [feedbackPick, setFeedbackPick] = useState<string[]>([]);
  const [draft, setDraft] = useState<Record<string, {
    firstImpression: string;
    rememberedSpelling: string;
    perceivedPurpose: string;
    easyToSay: number;
    memorable: number;
    fitsProduct: number;
    concern: string;
  }>>({});

  const load = useCallback(async () => {
    if (!orgId || !projectId || !sessionId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await fetchProjectNameSession(orgId, projectId, sessionId);
      setSession(data);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setForbidden(true);
      } else {
        setError('Failed to load name session.');
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const desc: ProductDescription = session?.productDescription ?? {};
  const activeLane = session?.lanes?.[session.lanes.length - 1] ?? null;
  const profile = goalProfile(session?.namingGoal);

  const visibleCandidates = useMemo(() => {
    if (!session) return [];
    return session.candidates.filter((candidate) => {
      if (filterFamily && candidate.family !== filterFamily) return false;
      if (filterSource && !(candidate.sources ?? []).includes(filterSource as never)) {
        return false;
      }
      if (filterLane && candidate.laneId !== filterLane) return false;
      return true;
    });
  }, [session, filterFamily, filterSource, filterLane]);

  async function patch(input: Parameters<typeof updateProjectNameSession>[3]) {
    if (!orgId || !projectId || !sessionId) return null;
    const updated = await updateProjectNameSession(orgId, projectId, sessionId, input);
    setSession(updated);
    return updated;
  }

  async function saveCanvas(next: ProductDescription) {
    setBusy('canvas');
    setNotice(null);
    try {
      await patch({ productDescription: next });
    } catch {
      setError('Failed to save description.');
    } finally {
      setBusy(null);
    }
  }

  function setDesc(field: keyof ProductDescription, value: string) {
    if (!session) return;
    setSession({
      ...session,
      productDescription: { ...session.productDescription, [field]: value },
    });
  }

  async function handleBuildDescription() {
    if (!orgId || !projectId || !session) return;
    if (!canvasHasProduct(desc)) {
      setNotice('Add What the product is before using Build description.');
      return;
    }
    if ((desc.oneLine || desc.short || desc.full) &&
      !window.confirm('Replace the one-line, short, and full descriptions? Canvas answers stay the same.')) {
      return;
    }
    setBusy('build');
    setNotice(null);
    try {
      const reply = await sendChatMessage({
        messages: [{ role: 'user', content: buildDescriptionPrompt(desc) }],
        organizationId: orgId,
        projectId,
      });
      const parsed = parseJsonBlock(reply.message) as ProductDescription | null;
      const next = {
        ...desc,
        oneLine: parsed?.oneLine ?? desc.oneLine,
        short: parsed?.short ?? desc.short,
        full: parsed?.full ?? desc.full,
      };
      await patch({ productDescription: next });
    } catch (err) {
      setNotice(err instanceof ChatApiError ? err.message : 'Build description failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleCheckName(name = typedName, source: 'human' | 'chatbot' = 'human') {
    if (!orgId || !projectId || !sessionId || !session) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = session.candidates.find(
      (item) => normalizeNameKey(item.name) === normalizeNameKey(trimmed),
    );
    if (existing && source === 'human') {
      setBusy('check');
      try {
        const checked = await checkNameCandidate(orgId, projectId, sessionId, trimmed);
        const merged = session.candidates.map((item) =>
          normalizeNameKey(item.name) === normalizeNameKey(trimmed)
            ? {
                ...item,
                ...checked,
                sources: [
                  ...new Set<CandidateSource>([
                    ...(item.sources ?? []),
                    'human',
                  ]),
                ],
                domainChecks: checked.domainChecks,
              }
            : item,
        );
        const updated = await patch({ candidates: merged });
        if (updated) setTypedName('');
      } catch {
        setError('Check name failed.');
      } finally {
        setBusy(null);
      }
      return;
    }
    setBusy('check');
    try {
      if (!existing) {
        await addNameCandidates(
          orgId,
          projectId,
          sessionId,
          [{ name: trimmed, laneId: activeLane?.id, family: undefined }],
          source,
        );
      }
      const checked = await checkNameCandidate(orgId, projectId, sessionId, trimmed);
      const latest = await fetchProjectNameSession(orgId, projectId, sessionId);
      const merged = latest.candidates.map((item) =>
        item.id === checked.id || normalizeNameKey(item.name) === normalizeNameKey(trimmed)
          ? { ...item, ...checked }
          : item,
      );
      const updated = await updateProjectNameSession(orgId, projectId, sessionId, {
        candidates: merged,
      });
      setSession(updated);
      setTypedName('');
    } catch {
      setError('Check name failed.');
    } finally {
      setBusy(null);
    }
  }

  async function requireProductThen(action: () => Promise<void>) {
    if (!canvasHasProduct(desc)) {
      setNotice('Describe What the product is before suggesting names. You can still save this draft.');
      return;
    }
    await action();
  }

  async function handleSuggestNames() {
    await requireProductThen(async () => {
      if (!orgId || !projectId || !sessionId) return;
      setBusy('suggest');
      setNotice(null);
      try {
        const reply = await sendChatMessage({
          messages: [{ role: 'user', content: suggestNamesPrompt(desc) }],
          organizationId: orgId,
          projectId,
        });
        const names = parseNameLines(reply.message, 8);
        for (const name of names) {
          await addNameCandidates(
            orgId,
            projectId,
            sessionId,
            [{ name, laneId: activeLane?.id }],
            'chatbot',
          );
          await checkNameCandidate(orgId, projectId, sessionId, name);
        }
        await load();
      } catch (err) {
        setNotice(err instanceof ChatApiError ? err.message : 'Suggest names failed.');
      } finally {
        setBusy(null);
      }
    });
  }

  async function handleGenerateFamilies() {
    await requireProductThen(async () => {
      if (!orgId || !projectId || !sessionId || !session) return;
      setBusy('families');
      setNotice(null);
      try {
        const reply = await sendChatMessage({
          messages: [
            {
              role: 'user',
              content: generateFamiliesPrompt(
                desc,
                families.map(
                  (id) => NAME_FAMILIES.find((item) => item.id === id)?.label ?? id,
                ),
                profile.label,
              ),
            },
          ],
          organizationId: orgId,
          projectId,
        });
        const parsed = parseJsonBlock(reply.message) as
          | { name?: string; family?: string; rationale?: string }[]
          | { candidates?: { name?: string; family?: string; rationale?: string }[] }
          | null;
        const rows = Array.isArray(parsed)
          ? parsed
          : parsed?.candidates ?? [];
        const byFamily = new Map<string, typeof rows>();
        for (const row of rows) {
          const family = String(row.family ?? 'invented');
          const list = byFamily.get(family) ?? [];
          if (list.length < 3) list.push(row);
          byFamily.set(family, list);
        }
        const payload = [...byFamily.values()]
          .flat()
          .filter((row) => row.name)
          .map((row) => ({
            name: String(row.name),
            family: String(row.family ?? ''),
            laneId: activeLane?.id,
            rationale: row.rationale,
          }));
        if (payload.length) {
          await addNameCandidates(orgId, projectId, sessionId, payload, 'chatbot');
          await load();
        }
      } catch (err) {
        setNotice(err instanceof ChatApiError ? err.message : 'Generate possibilities failed.');
      } finally {
        setBusy(null);
      }
    });
  }

  async function replaceCandidates(next: NameCandidate[]) {
    await patch({ candidates: next });
  }

  async function updateCandidate(
    id: string,
    updater: (candidate: NameCandidate) => NameCandidate,
  ) {
    if (!session) return;
    await replaceCandidates(
      session.candidates.map((item) => (item.id === id ? updater(item) : item)),
    );
  }

  async function startLane() {
    if (!session) return;
    const lane: NameLane = {
      id: crypto.randomUUID(),
      title: `${profile.label} lane`,
      namingGoal: (session.namingGoal as NamingGoal) ?? null,
      createdAt: new Date().toISOString(),
    };
    await patch({ lanes: [...(session.lanes ?? []), lane] });
  }

  const previewCandidate =
    session?.candidates.find((item) => item.id === previewCandidateId) ??
    session?.candidates[0] ??
    null;

  if (!orgId || !projectId || !sessionId) {
    return <Navigate to="/names" replace />;
  }
  if (forbidden) {
    return (
      <div className="page-shell">
        <h2>Names</h2>
        <p>You do not have access to this session.</p>
      </div>
    );
  }

  const openRound = session?.feedback.find((round) => round.status === 'open');
  const isBlind =
    Boolean(openRound) &&
    !session?.canManageFeedback &&
    openRound?.candidateIds.some(
      (id) => !openRound.mine.some((row) => row.candidateId === id),
    );

  return (
    <div className="page-shell names-session-page">
      <header className="page-header page-header-with-actions">
        <div>
          <h2>{session?.title ?? 'Name session'}</h2>
          <p className="page-subtitle">
            {currentProject?.name ?? 'Project'} · {profile.label}
            {session?.recommendedCandidateId &&
              ` · Recommended: ${session.candidates.find((item) => item.id === session.recommendedCandidateId)?.name ?? ''}`}
          </p>
          <div className="page-links">
            <Link
              to={`/organizations/${orgId}/projects/${projectId}/names`}
              className="text-link"
            >
              ← Names
            </Link>
          </div>
        </div>
      </header>
      {loading && <p className="status-message">Loading session...</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert">{notice}</div>}
      {session && (
        <>
          <nav className="names-section-nav" aria-label="Session sections">
            {SECTIONS.map((id) => (
              <button
                key={id}
                type="button"
                className={section === id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                onClick={() => setSection(id)}
              >
                {id === 'description' && 'Product description'}
                {id === 'goal' && 'Naming goal'}
                {id === 'names' && 'Names'}
                {id === 'preview' && 'Preview in context'}
                {id === 'messaging' && 'Messaging test'}
                {id === 'compare' && 'Compare shortlist'}
                {id === 'feedback' && 'Feedback round'}
              </button>
            ))}
          </nav>

          {section === 'description' && (
            <section className="names-panel">
              <h3>Product description</h3>
              <label className="form-field">
                <span>Product to name</span>
                <input
                  value={session.brief}
                  onChange={(event) =>
                    setSession({ ...session, brief: event.target.value })
                  }
                />
              </label>
              {(
                [
                  ['whatItIs', 'What the product is'],
                  ['problem', 'Problem it solves'],
                  ['audience', 'Primary audience'],
                  ['platform', 'Main platform/channel'],
                  ['benefits', 'Core benefits'],
                  ['personality', 'Brand personality'],
                  ['countries', 'Target countries'],
                  ['languages', 'Languages'],
                  ['competitors', 'Competitors or names to avoid'],
                  ['includeWords', 'Words to include'],
                  ['excludeWords', 'Words to exclude'],
                  ['preferredTlds', 'Preferred domain endings'],
                  ['preferredLength', 'Preferred name length'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="form-field">
                  <span>{label}</span>
                  <textarea
                    rows={key === 'whatItIs' || key === 'benefits' ? 3 : 2}
                    value={desc[key] ?? ''}
                    onChange={(event) => setDesc(key, event.target.value)}
                  />
                </label>
              ))}
              <div className="knowledge-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy === 'canvas'}
                  onClick={() => void saveCanvas(desc).then(() => patch({ brief: session.brief }))}
                >
                  Save description
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy === 'build'}
                  onClick={() => void handleBuildDescription()}
                >
                  Build description
                </button>
              </div>
              <label className="form-field">
                <span>One-line</span>
                <input
                  value={desc.oneLine ?? ''}
                  onChange={(event) => setDesc('oneLine', event.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Short</span>
                <textarea
                  rows={2}
                  value={desc.short ?? ''}
                  onChange={(event) => setDesc('short', event.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Full</span>
                <textarea
                  rows={4}
                  value={desc.full ?? ''}
                  onChange={(event) => setDesc('full', event.target.value)}
                />
              </label>
            </section>
          )}

          {section === 'goal' && (
            <section className="names-panel">
              <h3>Naming goal</h3>
              <div className="names-choice-grid">
                {NAMING_GOAL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      session.namingGoal === option.id
                        ? 'btn btn-primary'
                        : 'btn btn-secondary'
                    }
                    onClick={() => void patch({ namingGoal: option.id })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="page-subtitle">{profile.hint}</p>
              {session.namingGoal === 'internal_codename' && (
                <>
                  <label className="form-field">
                    <span>Codename theme</span>
                    <select
                      value={codenameTheme}
                      onChange={(event) => setCodenameTheme(event.target.value)}
                    >
                      {CODENAME_THEMES.map((theme) => (
                        <option key={theme} value={theme}>
                          {theme}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Forbidden themes/words</span>
                    <input
                      value={forbiddenWords}
                      onChange={(event) => setForbiddenWords(event.target.value)}
                    />
                  </label>
                </>
              )}
              <p>
                Public product/app requires domain and brand checks. Internal
                codename does not require a free address.
              </p>
              <button type="button" className="btn btn-secondary" onClick={() => void startLane()}>
                Start a new lane
              </button>
              <ul>
                {(session.lanes ?? []).map((lane) => (
                  <li key={lane.id}>
                    {lane.title} · {goalProfile(lane.namingGoal).label}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {section === 'names' && (
            <section className="names-panel">
              <h3>Names</h3>
              <div className="names-inline">
                <label className="form-field">
                  <span>Name</span>
                  <input
                    value={typedName}
                    onChange={(event) => setTypedName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleCheckName();
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy === 'check'}
                  onClick={() => void handleCheckName()}
                >
                  Check name
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy === 'suggest'}
                  onClick={() => void handleSuggestNames()}
                >
                  Suggest names
                </button>
              </div>
              <fieldset className="names-families">
                <legend>Name families</legend>
                {NAME_FAMILIES.map((family) => (
                  <label key={family.id}>
                    <input
                      type="checkbox"
                      checked={families.includes(family.id)}
                      onChange={(event) =>
                        setFamilies((prev) =>
                          event.target.checked
                            ? [...prev, family.id]
                            : prev.filter((id) => id !== family.id),
                        )
                      }
                    />{' '}
                    {family.label}
                  </label>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy === 'families'}
                  onClick={() => void handleGenerateFamilies()}
                >
                  Generate possibilities
                </button>
              </fieldset>
              <div className="names-inline">
                <select value={filterLane} onChange={(event) => setFilterLane(event.target.value)}>
                  <option value="">All lanes</option>
                  {(session.lanes ?? []).map((lane) => (
                    <option key={lane.id} value={lane.id}>
                      {lane.title}
                    </option>
                  ))}
                </select>
                <select
                  value={filterFamily}
                  onChange={(event) => setFilterFamily(event.target.value)}
                >
                  <option value="">All families</option>
                  {NAME_FAMILIES.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterSource}
                  onChange={(event) => setFilterSource(event.target.value)}
                >
                  <option value="">All sources</option>
                  <option value="human">human</option>
                  <option value="chatbot">chatbot</option>
                  <option value="mcp">mcp</option>
                </select>
              </div>
              <ul className="names-candidate-list">
                {visibleCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    session={session}
                    orgId={orgId}
                    projectId={projectId}
                    sessionId={sessionId}
                    isBlind={Boolean(isBlind && openRound?.candidateIds.includes(candidate.id))}
                    busy={busy}
                    onBusy={setBusy}
                    onSession={setSession}
                    onCheck={() => void handleCheckName(candidate.name)}
                    onPreview={() => {
                      setPreviewCandidateId(candidate.id);
                      setSection('preview');
                    }}
                    onUpdate={(next) => void updateCandidate(candidate.id, () => next)}
                    onExplore={async () => {
                      const variants = exploreVariations(candidate.name);
                      if (!variants.length) return;
                      const accepted = window.confirm(
                        `Add variation "${variants[0]}" from ${candidate.name}? Checks start empty.`,
                      );
                      if (!accepted) return;
                      await addNameCandidates(
                        orgId,
                        projectId,
                        sessionId,
                        [
                          {
                            name: variants[0],
                            family: candidate.family ?? undefined,
                            laneId: candidate.laneId ?? undefined,
                            rationale: `Variation of ${candidate.name}`,
                          },
                        ],
                        'human',
                      );
                      const latest = await fetchProjectNameSession(orgId, projectId, sessionId);
                      const next = latest.candidates.map((item) =>
                        normalizeNameKey(item.name) === normalizeNameKey(variants[0])
                          ? {
                              ...item,
                              derivedFromCandidateId: candidate.id,
                              domainChecks: [],
                              brandChecks: [],
                              domainHistory: [],
                              googleQueryUrl: googleQueryUrl(item.name),
                            }
                          : item,
                      );
                      await updateProjectNameSession(orgId, projectId, sessionId, {
                        candidates: next,
                      }).then(setSession);
                    }}
                  />
                ))}
              </ul>
            </section>
          )}

          {section === 'preview' && previewCandidate && (
            <PreviewSection
              candidate={previewCandidate}
              wide={previewWide}
              dark={previewDark}
              customExtension={customExtension}
              onWide={setPreviewWide}
              onDark={setPreviewDark}
              onCustom={setCustomExtension}
              onSave={(next) => void updateCandidate(previewCandidate.id, () => next)}
            />
          )}

          {section === 'messaging' && (
            <MessagingSection
              session={session}
              orgId={orgId}
              projectId={projectId}
              onSave={(next) => void replaceCandidates(next)}
              onNotice={setNotice}
            />
          )}

          {section === 'compare' && (
            <CompareSection
              session={session}
              orgId={orgId}
              projectId={projectId}
              sessionId={sessionId}
              onSession={setSession}
              onNotice={setNotice}
            />
          )}

          {section === 'feedback' && (
            <FeedbackSection
              session={session}
              orgId={orgId}
              projectId={projectId}
              sessionId={sessionId}
              userId={user?.id}
              pick={feedbackPick}
              setPick={setFeedbackPick}
              draft={draft}
              setDraft={setDraft}
              onSession={setSession}
              onNotice={setNotice}
            />
          )}
        </>
      )}
    </div>
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
  const speechOk = typeof window !== 'undefined' && 'speechSynthesis' in window;

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
        <div className="names-inline">
          <button type="button" className="btn btn-secondary btn-sm" onClick={props.onCheck}>
            Check name
          </button>
          <a
            className="btn btn-secondary btn-sm"
            href={candidate.googleQueryUrl || googleQueryUrl(candidate.name)}
            target="_blank"
            rel="noreferrer"
          >
            View all on Google
          </a>
          <a
            className="btn btn-secondary btn-sm"
            href={googleAppQueryUrl(candidate.name)}
            target="_blank"
            rel="noreferrer"
          >
            {candidate.name} app
          </a>
          <a
            className="btn btn-secondary btn-sm"
            href={googleImagesQueryUrl(candidate.name)}
            target="_blank"
            rel="noreferrer"
          >
            Images
          </a>
          <button type="button" className="btn btn-secondary btn-sm" onClick={props.onExplore}>
            Explore variations
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={props.onPreview}>
            Preview in context
          </button>
        </div>
      </header>
      <p className="diagram-card-meta">
        {quality.charCount} chars · ~{quality.syllablesApprox} syllables
        {quality.hyphen ? ' · hyphen' : ''}
        {quality.digit ? ' · digit' : ''}
        {quality.ambiguous ? ' · ambiguous letters' : ''}
      </p>
      <div className="names-tlds">
        {(candidate.domainChecks ?? []).map((check) => (
          <span key={check.host} className={`names-pill names-pill-${check.availability}`}>
            .{check.tld} {availabilityLabel(check.availability)}
          </span>
        ))}
        {!candidate.domainChecks?.length && <span className="names-pill">Unchecked</span>}
      </div>
      <details>
        <summary>Brand footprint / Open checks</summary>
        <p className="page-subtitle">
          Preliminary check only — legal review may still be needed.
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
      </details>
      <details>
        <summary>Domain history</summary>
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
          Recheck
        </button>
      </details>
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
      <details>
        <summary>Check language</summary>
        <p className="page-subtitle">AI-assisted — verify with a native speaker</p>
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
      </details>
      <label className="form-field">
        <span>Notes</span>
        <textarea
          rows={2}
          value={candidate.notes ?? ''}
          onChange={(event) => props.onUpdate({ ...candidate, notes: event.target.value })}
        />
      </label>
      <div className="names-inline">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() =>
            props.onUpdate({ ...candidate, status: 'rejected', notes: candidate.notes })
          }
        >
          Reject
        </button>
      </div>
    </li>
  );
}

function PreviewSection(props: {
  candidate: NameCandidate;
  wide: boolean;
  dark: boolean;
  customExtension: string;
  onWide: (value: boolean) => void;
  onDark: (value: boolean) => void;
  onCustom: (value: string) => void;
  onSave: (candidate: NameCandidate) => void;
}) {
  const { candidate } = props;
  const slug = slugifyName(candidate.name) || 'name';
  const flags = candidate.visualConcerns?.flags ?? [];
  const note = candidate.visualConcerns?.note ?? '';
  const themeClass = `names-preview ${props.dark ? 'is-dark' : 'is-light'} ${props.wide ? 'is-wide' : 'is-compact'}`;
  return (
    <section className="names-panel">
      <h3>Preview in context</h3>
      <div className="names-inline">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => props.onWide(false)}>
          compact
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => props.onWide(true)}>
          wide
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => props.onDark(false)}>
          light
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => props.onDark(true)}>
          dark
        </button>
      </div>
      <div className={themeClass}>
        <div className="names-preview-tab">
          <span className="names-favicon">{initialsFor(candidate.name)}</span>
          <span className="names-truncate">{candidate.name}</span>
        </div>
        <div className="names-preview-icon">
          <span className="names-monogram">{initialsFor(candidate.name)}</span>
          <span className="names-icon-label">{candidate.name}</span>
        </div>
        <div className="names-preview-card">
          <strong className="names-truncate">{candidate.name}</strong>
          <p className="names-truncate">Project planning for small teams</p>
        </div>
        <div className="names-preview-header names-truncate">{candidate.name}</div>
        <div className="names-preview-social">
          <span className="names-monogram">{initialsFor(candidate.name)}</span>
          <span>@{slug} · {candidate.name}</span>
        </div>
        <p>
          {candidate.name} &lt;hello@{slug}.com&gt;
        </p>
        <p>Open {candidate.name}. Made with {candidate.name}. {candidate.name} API. {candidate.name} for Teams.</p>
        <div className="names-extensions">
          <span>{candidate.name} Cloud</span>
          <span>{candidate.name} Mobile</span>
          <span>{candidate.name} API</span>
          <span>{candidate.name} Studio</span>
          <span>
            {candidate.name} {props.customExtension}
          </span>
        </div>
      </div>
      <label className="form-field">
        <span>Custom extension</span>
        <input
          value={props.customExtension}
          onChange={(event) => props.onCustom(event.target.value)}
        />
      </label>
      <div className="names-inline">
        {VISUAL_FLAGS.map((flag) => (
          <label key={flag.id}>
            <input
              type="checkbox"
              checked={flags.includes(flag.id)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...flags, flag.id]
                  : flags.filter((id) => id !== flag.id);
                props.onSave({
                  ...candidate,
                  visualConcerns: { flags: next, note },
                });
              }}
            />{' '}
            {flag.label}
          </label>
        ))}
      </div>
      <label className="form-field">
        <span>Visual note</span>
        <input
          value={note}
          onChange={(event) =>
            props.onSave({
              ...candidate,
              visualConcerns: { flags, note: event.target.value },
            })
          }
        />
      </label>
    </section>
  );
}

function MessagingSection(props: {
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  onSave: (candidates: NameCandidate[]) => void;
  onNotice: (value: string | null) => void;
}) {
  const finalists = props.session.candidates.filter(
    (item) =>
      props.session.shortlistIds.includes(item.id) ||
      item.status === 'recommended' ||
      props.session.candidates.length <= 5,
  );
  const [activeId, setActiveId] = useState(finalists[0]?.id ?? '');
  const candidate = props.session.candidates.find((item) => item.id === activeId) ?? finalists[0];
  if (!candidate) {
    return <p>Add candidates first.</p>;
  }
  const msg = candidate.messaging ?? {};
  const titleLen = (msg.searchTitle ?? '').length;
  const descLen = (msg.searchDescription ?? '').length;

  function write(partial: Partial<NonNullable<NameCandidate['messaging']>>) {
    props.onSave(
      props.session.candidates.map((item) =>
        item.id === candidate.id
          ? { ...item, messaging: { ...item.messaging, ...partial } }
          : item,
      ),
    );
  }

  return (
    <section className="names-panel">
      <h3>Messaging test</h3>
      <p className="page-subtitle">
        A distinctive name reduces exact-name competition; descriptors and content
        explain the category. This does not promise a Google ranking.
      </p>
      <select value={candidate.id} onChange={(event) => setActiveId(event.target.value)}>
        {props.session.candidates.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <label className="form-field">
        <span>Category descriptor</span>
        <input
          value={msg.categoryDescriptor ?? ''}
          onChange={(event) => write({ categoryDescriptor: event.target.value })}
        />
      </label>
      <label className="form-field">
        <span>Positioning statement</span>
        <textarea
          rows={2}
          value={msg.positioning ?? ''}
          onChange={(event) => write({ positioning: event.target.value })}
        />
      </label>
      {(msg.taglines ?? ['', '', '']).slice(0, 3).map((line, index) => (
        <label key={index} className="form-field">
          <span>Tagline {index + 1}</span>
          <input
            value={line}
            onChange={(event) => {
              const taglines = [...(msg.taglines ?? ['', '', ''])];
              taglines[index] = event.target.value;
              write({ taglines });
            }}
          />
        </label>
      ))}
      <label className="form-field">
        <span>App-store subtitle</span>
        <input
          value={msg.appStoreSubtitle ?? ''}
          onChange={(event) => write({ appStoreSubtitle: event.target.value })}
        />
      </label>
      <label className="form-field">
        <span>Search title ({titleLen}/60)</span>
        <input
          value={msg.searchTitle ?? ''}
          onChange={(event) => write({ searchTitle: event.target.value })}
        />
        {titleLen > 60 && <small>Title will clip at 60 characters.</small>}
      </label>
      <label className="form-field">
        <span>Search description ({descLen}/155)</span>
        <textarea
          rows={3}
          value={msg.searchDescription ?? ''}
          onChange={(event) => write({ searchDescription: event.target.value })}
        />
        {descLen > 155 && <small>Description will clip at 155 characters.</small>}
      </label>
      <div className="names-preview-card">
        <strong>{(msg.searchTitle ?? candidate.name).slice(0, 60)}</strong>
        <p>{(msg.searchDescription ?? '').slice(0, 155)}</p>
      </div>
      <label className="form-field">
        <span>What is {candidate.name}?</span>
        <textarea
          rows={2}
          value={msg.whatIs ?? ''}
          onChange={(event) => write({ whatIs: event.target.value })}
        />
      </label>
      <div className="knowledge-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={async () => {
            try {
              const reply = await sendChatMessage({
                messages: [
                  {
                    role: 'user',
                    content: messagingPrompt(candidate.name, props.session.productDescription),
                  },
                ],
                organizationId: props.orgId,
                projectId: props.projectId,
              });
              const parsed = parseJsonBlock(reply.message) as Record<string, unknown> | null;
              if (parsed) {
                write({
                  categoryDescriptor: String(parsed.categoryDescriptor ?? ''),
                  positioning: String(parsed.positioning ?? ''),
                  taglines: Array.isArray(parsed.taglines)
                    ? parsed.taglines.map(String)
                    : msg.taglines,
                  appStoreSubtitle: String(parsed.appStoreSubtitle ?? ''),
                  searchTitle: String(parsed.searchTitle ?? ''),
                  searchDescription: String(parsed.searchDescription ?? ''),
                  whatIs: String(parsed.whatIs ?? ''),
                });
              }
            } catch (err) {
              props.onNotice(err instanceof ChatApiError ? err.message : 'Suggest messaging failed.');
            }
          }}
        >
          Suggest messaging
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => props.onSave(props.session.candidates)}
        >
          Save messaging
        </button>
      </div>
    </section>
  );
}

function CompareSection(props: {
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  onSession: (session: ProjectNameSession) => void;
  onNotice: (value: string | null) => void;
}) {
  const [showFormula, setShowFormula] = useState(false);
  const [winnerNote, setWinnerNote] = useState(props.session.decisionNote ?? '');
  const [runnerId, setRunnerId] = useState(props.session.runnerUpCandidateId ?? '');
  const shortlist = props.session.candidates.filter((item) =>
    props.session.shortlistIds.includes(item.id),
  );
  const scores = shortlist.map((item) => ({
    item,
    score: candidateScore(item, props.session.namingGoal),
  }));
  const top = Math.max(0, ...scores.map((row) => row.score.total));

  async function toggle(id: string) {
    const ids = props.session.shortlistIds.includes(id)
      ? props.session.shortlistIds.filter((item) => item !== id)
      : [...props.session.shortlistIds, id].slice(0, 5);
    const updated = await updateProjectNameSession(
      props.orgId,
      props.projectId,
      props.sessionId,
      { shortlistIds: ids },
    );
    props.onSession(updated);
  }

  return (
    <section className="names-panel">
      <h3>Compare shortlist</h3>
      <div className="names-inline">
        {props.session.candidates.map((item) => (
          <label key={item.id}>
            <input
              type="checkbox"
              checked={props.session.shortlistIds.includes(item.id)}
              onChange={() => void toggle(item.id)}
            />{' '}
            {item.name}
          </label>
        ))}
      </div>
      <div className="names-compare-grid">
        {scores.map(({ item, score }) => (
          <article key={item.id} className="names-card">
            <h4>{item.name}</h4>
            <p>Score {score.total}</p>
            {(['brandFit', 'easyToSay', 'memorable'] as const).map((key) => (
              <label key={key} className="form-field">
                <span>
                  {key === 'brandFit'
                    ? 'Brand fit'
                    : key === 'easyToSay'
                      ? 'Easy to say/type'
                      : 'Memorable'}
                </span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={item.ratings?.[key] ?? ''}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    void updateProjectNameSession(
                      props.orgId,
                      props.projectId,
                      props.sessionId,
                      {
                        candidates: props.session.candidates.map((candidate) =>
                          candidate.id === item.id
                            ? {
                                ...candidate,
                                ratings: { ...candidate.ratings, [key]: value },
                              }
                            : candidate,
                        ),
                      },
                    ).then(props.onSession);
                  }}
                />
              </label>
            ))}
            <p>Domain: {(item.domainChecks ?? []).map((check) => `${check.tld}=${availabilityLabel(check.availability)}`).join(', ') || '—'}</p>
            <p>
              Unknown:{' '}
              {[
                ...(item.domainChecks ?? [])
                  .filter((check) => check.availability === 'unknown')
                  .map((check) => check.host),
                ...(item.brandChecks ?? [])
                  .filter((check) => check.result === 'unknown')
                  .map((check) => check.source),
              ].join(', ') || 'none'}
            </p>
            <p>
              Visual: {item.visualConcerns?.flags?.join(', ') || 'none'}
              {item.visualConcerns?.note ? ` (${item.visualConcerns.note})` : ''}
            </p>
            <p>
              Human:{' '}
              {props.session.feedback
                .map((round) => round.aggregate?.byCandidate[item.id])
                .filter(Boolean)
                .map((agg) => `n=${agg?.responses}`)
                .join(', ') || 'none'}
            </p>
          </article>
        ))}
      </div>
      <button type="button" className="btn btn-secondary" onClick={() => setShowFormula((v) => !v)}>
        How this score works
      </button>
      {showFormula && (
        <p>
          Total = Brand fit + Easy to say/type + Memorable (1–5 each) plus documented
          evidence adjustments. Unknown checks are not a pass. AI does not invent the
          number. A lower-scoring name can still win with a decision note.
        </p>
      )}
      <label className="form-field">
        <span>Winner</span>
        <select
          value={props.session.recommendedCandidateId ?? ''}
          onChange={(event) => {
            const id = event.target.value;
            const selected = scores.find((row) => row.item.id === id);
            if (selected && selected.score.total < top && !winnerNote.trim()) {
              props.onNotice('Write a reason to recommend a name that is not the highest score.');
              return;
            }
            void recommendNameCandidate(
              props.orgId,
              props.projectId,
              props.sessionId,
              id,
              winnerNote,
            ).then(props.onSession);
          }}
        >
          <option value="">Select</option>
          {props.session.candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Runner-up</span>
        <select
          value={runnerId}
          onChange={(event) => {
            setRunnerId(event.target.value);
            void updateProjectNameSession(props.orgId, props.projectId, props.sessionId, {
              runnerUpCandidateId: event.target.value || null,
            }).then(props.onSession);
          }}
        >
          <option value="">Select</option>
          {props.session.candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Decision note</span>
        <textarea
          rows={3}
          value={winnerNote}
          onChange={(event) => setWinnerNote(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="btn btn-primary"
        onClick={async () => {
          await updateProjectNameSession(props.orgId, props.projectId, props.sessionId, {
            decisionNote: winnerNote,
            runnerUpCandidateId: runnerId || null,
          }).then(props.onSession);
          await navigator.clipboard.writeText(buildDecisionReport(props.session));
          props.onNotice('Decision report copied.');
        }}
      >
        Copy decision report
      </button>
    </section>
  );
}

function FeedbackSection(props: {
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  userId?: string;
  pick: string[];
  setPick: (ids: string[]) => void;
  draft: Record<string, {
    firstImpression: string;
    rememberedSpelling: string;
    perceivedPurpose: string;
    easyToSay: number;
    memorable: number;
    fitsProduct: number;
    concern: string;
  }>;
  setDraft: Dispatch<
    SetStateAction<
      Record<
        string,
        {
          firstImpression: string;
          rememberedSpelling: string;
          perceivedPurpose: string;
          easyToSay: number;
          memorable: number;
          fitsProduct: number;
          concern: string;
        }
      >
    >
  >;
  onSession: (session: ProjectNameSession) => void;
  onNotice: (value: string | null) => void;
}) {
  const open = props.session.feedback.find((round) => round.status === 'open');
  const closed = props.session.feedback.filter((round) => round.status === 'closed');

  return (
    <section className="names-panel">
      <h3>Feedback round</h3>
      {props.session.canManageFeedback && !open && (
        <>
          <p>Select 2 to 5 names.</p>
          <div className="names-inline">
            {props.session.candidates.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={props.pick.includes(item.id)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...props.pick, item.id].slice(0, 5)
                      : props.pick.filter((id) => id !== item.id);
                    props.setPick(next);
                  }}
                />{' '}
                {item.name}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              if (props.pick.length < 2) {
                props.onNotice('Pick at least two names.');
                return;
              }
              const updated = await startNameFeedbackRound(
                props.orgId,
                props.projectId,
                props.sessionId,
                props.pick,
              );
              props.onSession(updated);
            }}
          >
            Start Feedback round
          </button>
        </>
      )}
      {open && (
        <>
          {(open.order.length ? open.order : open.candidateIds).map((id) => {
            const candidate = props.session.candidates.find((item) => item.id === id);
            const mine = open.mine.find((row) => row.candidateId === id);
            const draft = props.draft[id] ?? {
              firstImpression: mine?.firstImpression ?? '',
              rememberedSpelling: mine?.rememberedSpelling ?? '',
              perceivedPurpose: mine?.perceivedPurpose ?? '',
              easyToSay: mine?.ratings?.easyToSay ?? 3,
              memorable: mine?.ratings?.memorable ?? 3,
              fitsProduct: mine?.ratings?.fitsProduct ?? 3,
              concern: mine?.concern ?? '',
            };
            return (
              <article key={id} className="names-card">
                <h4>{candidate?.name ?? 'Name'}</h4>
                <label className="form-field">
                  <span>First impression</span>
                  <input
                    value={draft.firstImpression}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, firstImpression: event.target.value },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>What do you think it does?</span>
                  <input
                    value={draft.perceivedPurpose}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, perceivedPurpose: event.target.value },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Spelling you remember</span>
                  <input
                    value={draft.rememberedSpelling}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, rememberedSpelling: event.target.value },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Easy to say/type</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={draft.easyToSay}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, easyToSay: Number(event.target.value) },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Memorable</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={draft.memorable}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, memorable: Number(event.target.value) },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Fits the product</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={draft.fitsProduct}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, fitsProduct: Number(event.target.value) },
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Optional concern</span>
                  <input
                    value={draft.concern}
                    onChange={(event) =>
                      props.setDraft((prev) => ({
                        ...prev,
                        [id]: { ...draft, concern: event.target.value },
                      }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    const updated = await upsertNameFeedback(
                      props.orgId,
                      props.projectId,
                      props.sessionId,
                      open.id,
                      {
                        candidateId: id,
                        firstImpression: draft.firstImpression,
                        rememberedSpelling: draft.rememberedSpelling,
                        perceivedPurpose: draft.perceivedPurpose,
                        ratings: {
                          easyToSay: draft.easyToSay,
                          memorable: draft.memorable,
                          fitsProduct: draft.fitsProduct,
                        },
                        concern: draft.concern,
                      },
                    );
                    props.onSession(updated);
                  }}
                >
                  Save response
                </button>
              </article>
            );
          })}
          {props.session.canManageFeedback && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                const updated = await closeNameFeedbackRound(
                  props.orgId,
                  props.projectId,
                  props.sessionId,
                  open.id,
                );
                props.onSession(updated);
              }}
            >
              Close Feedback round
            </button>
          )}
        </>
      )}
      {closed.map((round) => (
        <div key={round.id}>
          <h4>Results</h4>
          <p>Participants: {round.aggregate?.participantCount ?? 0}</p>
          {Object.entries(round.aggregate?.byCandidate ?? {}).map(([id, agg]) => {
            const candidate = props.session.candidates.find((item) => item.id === id);
            return (
              <p key={id}>
                {candidate?.name}: easy {agg.easyToSay ?? '—'}, memorable {agg.memorable ?? '—'},
                fit {agg.fitsProduct ?? '—'}; concerns: {agg.repeatedConcerns.join(', ') || 'none'}
              </p>
            );
          })}
        </div>
      ))}
    </section>
  );
}
