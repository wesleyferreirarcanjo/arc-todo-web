import { ErrorAlert } from '../components/ErrorAlert';
import { CompareSection } from '../components/names/CompareSection';
import { DetailsSection } from '../components/names/DetailsSection';
import { FeedbackSection } from '../components/names/FeedbackSection';
import { MessagingSection } from '../components/names/MessagingSection';
import { NamesSection } from '../components/names/NamesSection';
import { PreviewSection } from '../components/names/PreviewSection';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError } from '../lib/api/client';
import { ChatApiError, sendChatMessage } from '../lib/api/chat';
import {
  addNameCandidates,
  checkNameCandidate,
  fetchProjectNameSession,
  updateProjectNameSession,
} from '../lib/api/names';
import {
  CODENAME_THEMES,
  DEFAULT_NAMING_GOAL,
  NAMING_GOAL_OPTIONS,
  NAME_FAMILIES,
  goalProfile,
  googleQueryUrl,
  normalizeNameKey,
} from '../lib/names/catalog';
import {
  buildDescriptionPrompt,
  canvasHasProduct,
  generateFamiliesPrompt,
  hasAdditionalCanvasContext,
  hasGeneratedCanvasCopy,
  parseJsonBlock,
  parseNameLines,
  suggestNamesPrompt,
} from '../lib/names/prompts';
import { exploreVariations } from '../lib/names/variations';
import type {
  NameCandidate,
  NameLane,
  NamingGoal,
  ProductDescription,
  ProjectNameSession,
  CandidateSource,
} from '../types/name-session';

const SECTIONS = [
  'names',
  'preview',
  'messaging',
  'compare',
  'feedback',
  'details',
] as const;

const SECTION_LABELS: Record<(typeof SECTIONS)[number], string> = {
  names: 'Names',
  preview: 'Preview',
  messaging: 'Messaging',
  compare: 'Compare',
  feedback: 'Feedback',
  details: 'Details',
};

export function NameSessionPage() {
  const { orgId, projectId, sessionId } = useParams();
  const { currentProject } = useWorkspace();
  const { user } = useAuth();
  const [session, setSession] = useState<ProjectNameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [section, setSection] = useState<(typeof SECTIONS)[number]>('names');
  const productFieldRef = useRef<HTMLTextAreaElement>(null);
  const [moreContextOpen, setMoreContextOpen] = useState(false);
  const [generatedCopyOpen, setGeneratedCopyOpen] = useState(false);
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
      setMoreContextOpen(hasAdditionalCanvasContext(data.productDescription));
      setGeneratedCopyOpen(hasGeneratedCanvasCopy(data.productDescription));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setForbidden(true);
      } else {
        setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'this naming session' }));
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

  async function saveBrief(): Promise<boolean> {
    if (!session) return false;
    setBusy('canvas');
    setNotice(null);
    try {
      await patch({ productDescription: desc, brief: session.brief });
      return true;
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'the description' }));
      return false;
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
      setNotice('Add one sentence about what it does before using Build description.');
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
      setGeneratedCopyOpen(true);
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
      } catch (err) {
        setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this name check' }));
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
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this name check' }));
    } finally {
      setBusy(null);
    }
  }

  async function requireProductThen(action: () => Promise<void>) {
    if (!canvasHasProduct(desc)) {
      setNotice('Add one sentence about what it does, then Suggest names. You can still check a name.');
      productFieldRef.current?.focus();
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

  async function handleExplore(candidate: NameCandidate) {
    if (!orgId || !projectId || !sessionId) return;
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
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {notice && <div className="alert">{notice}</div>}
      {session && (
        <>
          <section className="names-quick-brief">
            <div className="names-quick-brief-row">
              <label className="form-field">
                <span>What does it do?</span>
                <textarea
                  ref={productFieldRef}
                  rows={2}
                  value={desc.whatItIs ?? ''}
                  placeholder="A private task board for a small team."
                  onChange={(event) => setDesc('whatItIs', event.target.value)}
                  onBlur={() => void saveBrief()}
                />
              </label>
              <label className="form-field">
                <span>Kind of name</span>
                <select
                  value={
                    (session.namingGoal as NamingGoal) || DEFAULT_NAMING_GOAL
                  }
                  onChange={(event) =>
                    void patch({ namingGoal: event.target.value })
                  }
                >
                  {NAMING_GOAL_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {session.namingGoal === 'internal_codename' && (
              <div className="names-brief-codename">
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
              </div>
            )}
            <div className="names-quick-brief-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSection('details')}
              >
                Add more details
              </button>
              {!canvasHasProduct(desc) && (
                <small>Needed for Suggest names. Checking a name does not require it.</small>
              )}
            </div>
          </section>

          <nav className="names-stepper" aria-label="Session sections">
            {SECTIONS.map((id) => (
              <button
                key={id}
                type="button"
                className={section === id ? 'is-current' : undefined}
                aria-current={section === id ? 'true' : undefined}
                onClick={() => setSection(id)}
              >
                {SECTION_LABELS[id]}
              </button>
            ))}
          </nav>

          {section === 'names' && (
            <NamesSection
              session={session}
              orgId={orgId}
              projectId={projectId}
              sessionId={sessionId}
              typedName={typedName}
              onTypedName={setTypedName}
              busy={busy}
              families={families}
              onFamilies={setFamilies}
              filterLane={filterLane}
              onFilterLane={setFilterLane}
              filterFamily={filterFamily}
              onFilterFamily={setFilterFamily}
              filterSource={filterSource}
              onFilterSource={setFilterSource}
              visibleCandidates={visibleCandidates}
              isBlind={Boolean(isBlind)}
              openRound={openRound}
              onCheckName={(name) => void handleCheckName(name)}
              onSuggestNames={() => void handleSuggestNames()}
              onGenerateFamilies={() => void handleGenerateFamilies()}
              onPreview={(candidateId) => {
                setPreviewCandidateId(candidateId);
                setSection('preview');
              }}
              onUpdateCandidate={(next) => void updateCandidate(next.id, () => next)}
              onExplore={(candidate) => void handleExplore(candidate)}
              onBusy={setBusy}
              onSession={setSession}
            />
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
          {section === 'preview' && !previewCandidate && (
            <p className="names-empty">Check a name first, then preview it here.</p>
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

          {section === 'details' && (
            <DetailsSection
              session={session}
              desc={desc}
              busy={busy}
              moreContextOpen={moreContextOpen}
              generatedCopyOpen={generatedCopyOpen}
              onMoreContextOpen={setMoreContextOpen}
              onGeneratedCopyOpen={setGeneratedCopyOpen}
              onBuildDescription={() => void handleBuildDescription()}
              onBriefChange={(value) => setSession({ ...session, brief: value })}
              onSaveBrief={() => void saveBrief()}
              onDesc={setDesc}
              onStartLane={() => void startLane()}
            />
          )}
        </>
      )}
    </div>
  );
}
