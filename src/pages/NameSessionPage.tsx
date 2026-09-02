import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorAlert } from '../components/ErrorAlert';
import { InfoPopover } from '../components/InfoPopover';
import { CompareSection } from '../components/names/CompareSection';
import { DecisionRail } from '../components/names/DecisionRail';
import { DetailsSection } from '../components/names/DetailsSection';
import { FeedbackSection } from '../components/names/FeedbackSection';
import { MessagingSection } from '../components/names/MessagingSection';
import { NamesSection } from '../components/names/NamesSection';
import { PreviewSection } from '../components/names/PreviewSection';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { ApiError } from '../lib/api/client';
import { ChatApiError, sendChatMessage } from '../lib/api/chat';
import {
  addNameCandidates,
  checkNameCandidate,
  checkNameCandidatesBatch,
  checkNameHandles,
  fetchProjectNameSession,
  updateProjectNameSession,
} from '../lib/api/names';
import { mergeCheckedCandidate } from '../lib/names/funnel';
import {
  capFamilyWave,
  dropAvoidedNames,
  mergeCheckedCandidates,
  runNameWave,
  sessionAvoidList,
  WAVE_SIZE,
} from '../lib/names/wave';
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

const PRODUCT_SENTENCE_EXAMPLE = 'A private task board for a small team.';
const PRODUCT_SENTENCE_HELP =
  'Example: A private task board for a small team. Suggest names reads this sentence.';
const SUGGEST_READINESS_HINT =
  'Suggest names needs this sentence first. You can still check a name.';
const SUGGEST_REQUIRED_NOTICE =
  'Add one sentence about what it does, then Suggest names. You can still check a name.';
const NAMES_EMPTY_COPY =
  'Suggest names will offer about twelve names, with checks streaming in. Keep or Reject each row. You can also type a name to check it.';
const PREVIEW_EMPTY_COPY =
  'Check a name on Names, then preview it here.';
const COMPARE_EMPTY_COPY =
  'Keep a name on Names, then compare it here.';
const FEEDBACK_EMPTY_COPY =
  'Keep at least two names on Names, then start a round here.';
const BRIEF_SAVED_MS = 2000;

export function NameSessionPage() {
  const { orgId, projectId, sessionId } = useParams();
  const { currentProject } = useWorkspace();
  const [session, setSession] = useState<ProjectNameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [briefSaved, setBriefSaved] = useState(false);
  const briefSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [section, setSection] = useState<(typeof SECTIONS)[number]>('names');
  const productFieldRef = useRef<HTMLTextAreaElement>(null);
  const [moreContextOpen, setMoreContextOpen] = useState(false);
  const [generatedCopyOpen, setGeneratedCopyOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [resolvingKeys, setResolvingKeys] = useState<string[]>([]);
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
  const [exploreTarget, setExploreTarget] = useState<NameCandidate | null>(null);
  const [exploreBusy, setExploreBusy] = useState(false);

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

  useEffect(() => {
    return () => {
      if (briefSavedTimerRef.current) clearTimeout(briefSavedTimerRef.current);
    };
  }, []);

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
    setBriefSaved(false);
    try {
      await patch({ productDescription: desc, brief: session.brief });
      setError(null);
      setErrorCode(undefined);
      setBriefSaved(true);
      if (briefSavedTimerRef.current) clearTimeout(briefSavedTimerRef.current);
      briefSavedTimerRef.current = setTimeout(() => {
        setBriefSaved(false);
        briefSavedTimerRef.current = null;
      }, BRIEF_SAVED_MS);
      return true;
    } catch (err) {
      setBriefSaved(false);
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'the description' }));
      setErrorCode(WEB_ERROR.SAVE);
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
    const key = normalizeNameKey(trimmed);
    const existing = session.candidates.find(
      (item) => normalizeNameKey(item.name) === key,
    );
    setResolvingKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    if (existing && source === 'human') {
      setBusy('check');
      try {
        const checked = await checkNameCandidate(orgId, projectId, sessionId, trimmed);
        const merged = mergeCheckedCandidate(
          session.candidates.map((item) =>
            normalizeNameKey(item.name) === key
              ? {
                  ...item,
                  sources: [
                    ...new Set<CandidateSource>([...(item.sources ?? []), 'human']),
                  ],
                }
              : item,
          ),
          checked,
        );
        const updated = await patch({ candidates: merged });
        if (updated) setTypedName('');
      } catch (err) {
        setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this name check' }));
      } finally {
        setResolvingKeys((prev) => prev.filter((item) => item !== key));
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
        const latest = await fetchProjectNameSession(orgId, projectId, sessionId);
        setSession(latest);
      }
      const checked = await checkNameCandidate(orgId, projectId, sessionId, trimmed);
      const latest = await fetchProjectNameSession(orgId, projectId, sessionId);
      const merged = mergeCheckedCandidate(latest.candidates, checked);
      const updated = await updateProjectNameSession(orgId, projectId, sessionId, {
        candidates: merged,
      });
      setSession(updated);
      setTypedName('');
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this name check' }));
    } finally {
      setResolvingKeys((prev) => prev.filter((item) => item !== key));
      setBusy(null);
    }
  }

  async function runWaveChecks(
    names: string[],
    rows?: Array<{
      name: string;
      family?: string;
      laneId?: string;
      rationale?: string;
    }>,
  ) {
    if (!orgId || !projectId || !sessionId || !names.length) return;
    const keys = names.map((name) => normalizeNameKey(name));
    setResolvingKeys((prev) => [...new Set([...prev, ...keys])]);
    try {
      await runNameWave({
        names,
        add: async (waveNames) => {
          await addNameCandidates(
            orgId,
            projectId,
            sessionId,
            rows ?? waveNames.map((name) => ({ name, laneId: activeLane?.id })),
            'chatbot',
          );
          const latest = await fetchProjectNameSession(orgId, projectId, sessionId);
          setSession(latest);
        },
        checkBatch: async (waveNames) => {
          try {
            const { candidates } = await checkNameCandidatesBatch(
              orgId,
              projectId,
              sessionId,
              waveNames,
            );
            setSession((prev) =>
              prev
                ? {
                    ...prev,
                    candidates: mergeCheckedCandidates(prev.candidates, candidates),
                  }
                : prev,
            );
            return candidates;
          } catch {
            return [];
          }
        },
      });
      const latest = await fetchProjectNameSession(orgId, projectId, sessionId);
      setSession(latest);
    } finally {
      setResolvingKeys((prev) => prev.filter((item) => !keys.includes(item)));
    }
  }

  async function requireProductThen(action: () => Promise<void>) {
    if (!canvasHasProduct(desc)) {
      setNotice(SUGGEST_REQUIRED_NOTICE);
      productFieldRef.current?.focus();
      return;
    }
    await action();
  }

  async function handleSuggestNames() {
    await requireProductThen(async () => {
      if (!orgId || !projectId || !sessionId || !session) return;
      setBusy('suggest');
      setNotice(null);
      try {
        const avoid = sessionAvoidList(session.candidates);
        const reply = await sendChatMessage({
          messages: [
            { role: 'user', content: suggestNamesPrompt(desc, { avoid }) },
          ],
          organizationId: orgId,
          projectId,
        });
        const names = dropAvoidedNames(
          parseNameLines(reply.message, WAVE_SIZE),
          avoid,
        );
        await runWaveChecks(names);
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
                { avoid: sessionAvoidList(session.candidates) },
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
        const avoid = sessionAvoidList(session.candidates);
        const payload = capFamilyWave(rows)
          .map((row) => ({
            name: String(row.name),
            family: String(row.family ?? ''),
            laneId: activeLane?.id,
            rationale: row.rationale,
          }))
          .filter((row) => dropAvoidedNames([row.name], avoid).length > 0);
        const names = dropAvoidedNames(
          payload.map((row) => row.name),
          avoid,
        );
        await runWaveChecks(
          names,
          payload.filter((row) => names.includes(row.name)),
        );
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

  async function handleKeep(id: string) {
    if (!orgId || !projectId || !sessionId || !session) return;
    const already = session.shortlistIds.includes(id);
    const ids = already
      ? session.shortlistIds.filter((item) => item !== id)
      : [...session.shortlistIds, id];
    const updated = await updateProjectNameSession(orgId, projectId, sessionId, {
      shortlistIds: ids,
    });
    setSession(updated);
    if (!already) {
      const kept = updated.candidates.find((item) => item.id === id);
      if (kept) {
        try {
          await checkNameHandles(orgId, projectId, sessionId, kept.name);
        } catch {
          // Handle probes stay unknown when they fail (BR-NAME-19).
        }
        const latest = await fetchProjectNameSession(orgId, projectId, sessionId);
        setSession(latest);
      }
    }
  }

  async function handleReject(id: string) {
    if (!session) return;
    await patch({
      candidates: session.candidates.map((item) =>
        item.id === id ? { ...item, status: 'rejected' } : item,
      ),
      shortlistIds: session.shortlistIds.filter((item) => item !== id),
    });
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

  function requestExplore(candidate: NameCandidate) {
    if (!exploreVariations(candidate.name).length) return;
    setExploreTarget(candidate);
  }

  async function confirmExplore() {
    if (!orgId || !projectId || !sessionId || !exploreTarget) return;
    const variants = exploreVariations(exploreTarget.name);
    if (!variants.length) {
      setExploreTarget(null);
      return;
    }
    setExploreBusy(true);
    try {
      await addNameCandidates(
        orgId,
        projectId,
        sessionId,
        [
          {
            name: variants[0],
            family: exploreTarget.family ?? undefined,
            laneId: exploreTarget.laneId ?? undefined,
            rationale: `Variation of ${exploreTarget.name}`,
          },
        ],
        'human',
      );
      const latest = await fetchProjectNameSession(orgId, projectId, sessionId);
      const next = latest.candidates.map((item) =>
        normalizeNameKey(item.name) === normalizeNameKey(variants[0])
          ? {
              ...item,
              derivedFromCandidateId: exploreTarget.id,
              domainChecks: [],
              brandChecks: [],
              domainHistory: [],
              organicCompetition: null,
              handleChecks: [],
              googleQueryUrl: googleQueryUrl(item.name),
            }
          : item,
      );
      await updateProjectNameSession(orgId, projectId, sessionId, {
        candidates: next,
      }).then(setSession);
      setExploreTarget(null);
    } finally {
      setExploreBusy(false);
    }
  }

  const checkedCandidates =
    session?.candidates.filter((item) => (item.domainChecks?.length ?? 0) > 0) ??
    [];
  const previewCandidate =
    session?.candidates.find((item) => item.id === previewCandidateId) ??
    checkedCandidates[0] ??
    null;
  const exploreVariants = exploreTarget
    ? exploreVariations(exploreTarget.name)
    : [];
  const keptCount = session?.shortlistIds.length ?? 0;
  const feedbackReady =
    (session?.feedback.length ?? 0) > 0 ||
    (session?.candidates.filter((item) => item.status !== 'rejected').length ?? 0) >=
      2;

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
      {error && <ErrorAlert code={errorCode}>{error}</ErrorAlert>}
      {notice && <div className="alert">{notice}</div>}
      {session && (
        <>
          <section className="names-quick-brief">
            <div className="names-quick-brief-row">
              <div className="form-field">
                <span className="names-brief-label-row">
                  <label htmlFor="names-what-it-does">What does it do?</label>
                  <InfoPopover label="What does it do?">
                    <p>{PRODUCT_SENTENCE_HELP}</p>
                  </InfoPopover>
                </span>
                <textarea
                  id="names-what-it-does"
                  ref={productFieldRef}
                  rows={2}
                  value={desc.whatItIs ?? ''}
                  placeholder={PRODUCT_SENTENCE_EXAMPLE}
                  onChange={(event) => setDesc('whatItIs', event.target.value)}
                  onBlur={() => void saveBrief()}
                />
              </div>
              <div className="form-field">
                <span className="names-brief-label-row">
                  <label htmlFor="names-kind-of-name">Kind of name</label>
                  <InfoPopover label="Kind of name">
                    <p>{profile.hint}</p>
                  </InfoPopover>
                </span>
                <select
                  id="names-kind-of-name"
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
              </div>
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
              {briefSaved && (
                <span className="names-brief-saved" role="status">
                  Saved
                </span>
              )}
            </div>
          </section>

          <div className="names-desk">
            <DecisionRail session={session} />
            <div className="names-desk-main">
          <nav className="names-desk-tabs" aria-label="Session context">
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
              resolvingKeys={resolvingKeys}
              isBlind={Boolean(isBlind)}
              openRound={openRound}
              onCheckName={(name) => void handleCheckName(name)}
              onSuggestNames={() => void handleSuggestNames()}
              onGenerateFamilies={() => void handleGenerateFamilies()}
              readinessHint={
                canvasHasProduct(desc) ? null : SUGGEST_READINESS_HINT
              }
              emptyCopy={NAMES_EMPTY_COPY}
              onPreview={(candidateId) => {
                setPreviewCandidateId(candidateId);
                setSection('preview');
              }}
              onUpdateCandidate={(next) => void updateCandidate(next.id, () => next)}
              onExplore={(candidate) => void requestExplore(candidate)}
              onKeep={(id) => void handleKeep(id)}
              onReject={(id) => void handleReject(id)}
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
              productDescription={desc}
              onWide={setPreviewWide}
              onDark={setPreviewDark}
              onCustom={setCustomExtension}
              onSave={(next) => void updateCandidate(previewCandidate.id, () => next)}
            />
          )}
          {section === 'preview' && !previewCandidate && (
            <p className="names-empty">{PREVIEW_EMPTY_COPY}</p>
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

          {section === 'compare' && keptCount > 0 && (
            <CompareSection
              session={session}
              orgId={orgId}
              projectId={projectId}
              sessionId={sessionId}
              onSession={setSession}
              onNotice={setNotice}
            />
          )}
          {section === 'compare' && keptCount === 0 && (
            <p className="names-empty">{COMPARE_EMPTY_COPY}</p>
          )}

          {section === 'feedback' && feedbackReady && (
            <FeedbackSection
              session={session}
              orgId={orgId}
              projectId={projectId}
              sessionId={sessionId}
              onSession={setSession}
              onNotice={setNotice}
            />
          )}
          {section === 'feedback' && !feedbackReady && (
            <p className="names-empty">{FEEDBACK_EMPTY_COPY}</p>
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
            </div>
          </div>
        </>
      )}
      <ConfirmDialog
        open={Boolean(exploreTarget) && exploreVariants.length > 0}
        title="Explore variations"
        description={`Add variation "${exploreVariants[0] ?? ''}" from ${exploreTarget?.name ?? 'this name'}? Checks start empty.`}
        confirmLabel="Add variation"
        loading={exploreBusy}
        onConfirm={() => void confirmExplore()}
        onCancel={() => {
          if (!exploreBusy) setExploreTarget(null);
        }}
      />
    </div>
  );
}
