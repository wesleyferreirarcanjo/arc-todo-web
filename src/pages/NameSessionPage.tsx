import { useAuth } from '../context/AuthContext';
import { useRegisterMobileShellModeTabs } from '../context/BoardMobileShellContext';
import { CompareSection } from '../components/names/CompareSection';
import { DecisionMode } from '../components/names/DecisionMode';
import { ExploreMode } from '../components/names/ExploreMode';
import { FeedbackSection } from '../components/names/FeedbackSection';
import { NamesComposer } from '../components/names/NamesSection';
import { ShortlistMode, yourShortlist } from '../components/names/ShortlistMode';
import { TeamViewsMode } from '../components/names/TeamViewsMode';
import { CandidateCard } from '../components/names/CandidateCard';
import { ErrorAlert } from '../components/ErrorAlert';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { CandidateReviewDialog, NamesPasteDialog } from '../components/names/CandidateReviewDialog';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ApiError } from '../lib/api/client';
import { ChatApiError, generateNameSuggestions } from '../lib/api/chat';
import {
  addNameCandidates,
  checkNameCandidate,
  checkNameCandidatesBatch,
  checkNameHandles,
  fetchProjectNameSession,
  recommendNameCandidate,
  updateProjectNameSession,
  upsertNameCandidateRating,
} from '../lib/api/names';
import { mergeCheckedCandidate } from '../lib/names/funnel';
import {
  mergeCheckedCandidates,
  runNameWave,
  sessionAvoidList,
} from '../lib/names/wave';
import {
  DEFAULT_NAMING_GOAL,
  NAMING_GOAL_OPTIONS,
  goalProfile,
  normalizeNameKey,
} from '../lib/names/catalog';
import { canvasHasProduct } from '../lib/names/prompts';
import {
  GENERATE_DEFAULT,
  buildNamesDecisionSummary,
  buildNamesSmartCopyPrompt,
  looksLikeAiNameResponse,
  looksLikeNamesPacket,
  previewNamingResponse,
  selectedReviewNames,
  type NamingReviewRow,
} from '../lib/names/smartCopy';
import {
  BELOW_TOP_REASON_MESSAGE,
  ERR_ARC_NAME_24,
  needsWinnerReason,
  reactionPointsForSession,
  winnerScopeIds,
} from '../lib/names/winnerReason';
import type {
  NameCandidate,
  NamingGoal,
  ProductDescription,
  ProjectNameSession,
  CandidateSource,
} from '../types/name-session';

const PRODUCT_GATE =
  'Add one sentence about what it does, then generate or copy a prompt. You can still check a name.';
const BRIEF_SAVED_MS = 2000;
const BRIEF_EXTRA_FIELDS: Array<{ key: keyof ProductDescription; label: string }> = [
  { key: 'problem', label: 'Problem it solves' },
  { key: 'audience', label: 'Primary audience' },
  { key: 'platform', label: 'Platform' },
  { key: 'benefits', label: 'Core benefits' },
  { key: 'personality', label: 'Brand personality' },
  { key: 'countries', label: 'Markets / countries' },
  { key: 'languages', label: 'Languages' },
  { key: 'competitors', label: 'Competitors to avoid' },
  { key: 'includeWords', label: 'Words to include' },
  { key: 'excludeWords', label: 'Words to avoid' },
  { key: 'preferredLength', label: 'Preferred length' },
];

type InspectorView = 'checks' | 'compare' | 'feedback';
type NamesSessionMode = 'explore' | 'shortlist' | 'decision' | 'team';

const SESSION_MODES: { id: NamesSessionMode; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'shortlist', label: 'Shortlist' },
  { id: 'decision', label: 'Decision' },
  { id: 'team', label: 'Team views' },
];

function isSessionMode(id: string): id is NamesSessionMode {
  return SESSION_MODES.some((item) => item.id === id);
}

export function NameSessionPage() {
  const { orgId, projectId, sessionId } = useParams();
  const { user } = useAuth();
  const [session, setSession] = useState<ProjectNameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [briefSaved, setBriefSaved] = useState(false);
  const briefSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [briefEditing, setBriefEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [resolvingKeys, setResolvingKeys] = useState<string[]>([]);
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const [inspectorView, setInspectorView] = useState<InspectorView>('checks');
  const [mode, setMode] = useState<NamesSessionMode>('explore');
  const [pendingPickId, setPendingPickId] = useState<string | null>(null);
  const [pickNote, setPickNote] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRows, setReviewRows] = useState<NamingReviewRow[]>([]);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSource, setReviewSource] = useState<CandidateSource>('chatbot');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [copyFallback, setCopyFallback] = useState<string | null>(null);
  const [retryNames, setRetryNames] = useState<string[]>([]);
  const whatItIsRef = useRef<HTMLTextAreaElement | null>(null);
  const generateSeq = useRef(0);
  const savedBriefRef = useRef('');

  const favoriteCount = session ? yourShortlist(session).length : 0;
  const showTeamTab = session?.participationMode === 'team';
  const sessionModes = SESSION_MODES.filter(
    (item) => item.id !== 'team' || showTeamTab,
  ).map((item) =>
    item.id === 'shortlist'
      ? { ...item, label: `Shortlist-${favoriteCount}` }
      : item,
  );

  useRegisterMobileShellModeTabs(
    forbidden
      ? null
      : {
          items: sessionModes,
          activeId: mode,
          onChange: (id) => {
            if (isSessionMode(id) && (id !== 'team' || showTeamTab)) setMode(id);
          },
          ariaLabel: 'Name session modes',
        },
  );

  const load = useCallback(async () => {
    if (!orgId || !projectId || !sessionId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const loaded = await fetchProjectNameSession(orgId, projectId, sessionId);
      setSession(loaded);
      savedBriefRef.current = JSON.stringify({
        title: loaded.title,
        namingGoal: loaded.namingGoal,
        productDescription: loaded.productDescription,
      });
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

  useEffect(() => {
    const dirty =
      Boolean(session) &&
      JSON.stringify({
        title: session?.title,
        namingGoal: session?.namingGoal,
        productDescription: session?.productDescription,
      }) !== savedBriefRef.current;
    if (!dirty && !reviewOpen && !pasteOpen) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [session, reviewOpen, pasteOpen]);

  const desc: ProductDescription = session?.productDescription ?? {};
  const pickName = session?.recommendedCandidateId
    ? session.candidates.find((item) => item.id === session.recommendedCandidateId)
        ?.name
    : null;

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
      await patch({
        title: session.title,
        namingGoal: session.namingGoal,
        productDescription: desc,
        brief: session.brief,
      });
      setError(null);
      setErrorCode(undefined);
      setBriefSaved(true);
      setBriefEditing(false);
      if (briefSavedTimerRef.current) clearTimeout(briefSavedTimerRef.current);
      briefSavedTimerRef.current = setTimeout(() => {
        setBriefSaved(false);
        briefSavedTimerRef.current = null;
      }, BRIEF_SAVED_MS);
      savedBriefRef.current = JSON.stringify({
        title: session.title,
        namingGoal: session.namingGoal,
        productDescription: desc,
      });
      return true;
    } catch (err) {
      setBriefSaved(false);
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'the brief' }));
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

  async function handleCheckName(name = typedName, source: 'human' | 'chatbot' = 'human') {
    if (!orgId || !projectId || !sessionId || !session) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = normalizeNameKey(trimmed);
    const existing = session.candidates.find(
      (item) => normalizeNameKey(item.name) === key,
    );
    setResolvingKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setBusy('check');
    try {
      if (existing && source === 'human') {
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
        return;
      }
      if (!existing) {
        await addNameCandidates(
          orgId,
          projectId,
          sessionId,
          [{ name: trimmed }],
          source,
        );
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

  function focusProductField() {
    setBriefEditing(true);
    window.setTimeout(() => whatItIsRef.current?.focus(), 0);
  }

  function currentPrompt() {
    if (!session) return '';
    return buildNamesSmartCopyPrompt({
      title: session.title,
      namingGoal: session.namingGoal,
      productDescription: desc,
      candidates: session.candidates,
      count: GENERATE_DEFAULT,
    });
  }

  async function runWaveChecks(
    names: Array<string | { name: string; rationale?: string; family?: string }>,
    source: CandidateSource,
    opts?: { retry?: boolean },
  ) {
    if (!orgId || !projectId || !sessionId || !names.length) return;
    if (busy === 'check' || busy === 'save') return;
    const payloads = names.map((item) =>
      typeof item === 'string' ? { name: item } : item,
    );
    const keys = payloads.map((item) => normalizeNameKey(item.name));
    setResolvingKeys((prev) => [...new Set([...prev, ...keys])]);
    let added = Boolean(opts?.retry);
    try {
      if (!opts?.retry) {
        setBusy('save');
        await addNameCandidates(orgId, projectId, sessionId, payloads, source);
        added = true;
        setSession(await fetchProjectNameSession(orgId, projectId, sessionId));
      }
      setBusy('check');
      const waveNames = payloads.map((item) => item.name);
      await runNameWave({
        names: waveNames,
        add: async () => undefined,
        checkBatch: async (waveNames) => {
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
        },
      });
      setSession(await fetchProjectNameSession(orgId, projectId, sessionId));
      setTypedName('');
      setRetryNames([]);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'these name checks' }));
      if (added) setRetryNames(payloads.map((item) => item.name));
    } finally {
      setResolvingKeys((prev) => prev.filter((item) => !keys.includes(item)));
      setBusy(null);
    }
  }

  function openReviewFromText(text: string, source: CandidateSource) {
    if (!session) return;
    const review = previewNamingResponse(text, session.candidates);
    setReviewSource(source);
    setReviewRows(review.rows);
    setReviewError(review.error ?? null);
    setReviewOpen(true);
    setPasteOpen(false);
  }

  function handlePastePacket(text: string) {
    if (!session) return;
    openReviewFromText(text, 'chatbot');
  }

  async function handleAddField() {
    const text = typedName;
    if (!text.trim()) return;
    if (looksLikeAiNameResponse(text) || looksLikeNamesPacket(text) || text.includes('\n')) {
      handlePastePacket(text);
      return;
    }
    await handleCheckName(text);
  }

  async function handleCopyPrompt() {
    if (!session) return;
    if (!canvasHasProduct(desc)) {
      setNotice(PRODUCT_GATE);
      focusProductField();
      return;
    }
    setBusy('copy');
    const prompt = currentPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyFallback(null);
      setNotice('The naming prompt is on the clipboard. Paste it into any chatbot.');
    } catch {
      setCopyFallback(prompt);
      setNotice('Clipboard permission was blocked. Select the prompt below and copy it.');
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerate() {
    if (!orgId || !projectId || !sessionId || !session) return;
    if (busy) return;
    if (!canvasHasProduct(desc)) {
      setNotice(PRODUCT_GATE);
      focusProductField();
      return;
    }
    const seq = generateSeq.current + 1;
    generateSeq.current = seq;
    const saved = await saveBrief();
    if (!saved) return;
    setBusy('generate');
    setNotice(null);
    try {
      const result = await generateNameSuggestions({
        organizationId: orgId,
        projectId: projectId,
        sessionId,
        title: session.title,
        namingGoal: session.namingGoal,
        productDescription: Object.fromEntries(
          Object.entries(desc).filter(([, value]) => Boolean(value?.trim())),
        ),
        count: GENERATE_DEFAULT,
        avoid: sessionAvoidList(session.candidates),
      });
      if (seq !== generateSeq.current || sessionId !== session.id) return;
      if (result.usedTools?.length) {
        setError('Name generation used unexpected tools. Nothing was added.');
        return;
      }
      const text = JSON.stringify({ suggestions: result.suggestions });
      openReviewFromText(text, 'chatbot');
    } catch (err) {
      if (seq !== generateSeq.current) return;
      setError(
        userMessage(err instanceof ChatApiError ? err : err, WEB_ERROR.CHAT_REQUEST, {
          thing: 'name suggestions',
        }),
      );
    } finally {
      if (seq === generateSeq.current) setBusy(null);
    }
  }

  async function handleConfirmReview() {
    const selected = selectedReviewNames(reviewRows);
    if (!selected.length) return;
    setReviewOpen(false);
    await runWaveChecks(selected, reviewSource);
  }

  async function handleCopySummary() {
    if (!session) return;
    const pick =
      session.recommendedCandidateId
        ? session.candidates.find((item) => item.id === session.recommendedCandidateId)?.name
        : null;
    const liked = session.candidates
      .filter((item) => item.reaction === 'liked' || item.reaction === 'loved')
      .map((item) => item.name);
    const summary = buildNamesDecisionSummary({
      title: session.title,
      pick,
      favoriteNames: liked,
      finalistNames: session.shortlistIds
        .map((id) => session.candidates.find((item) => item.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    });
    try {
      await navigator.clipboard.writeText(summary);
      setNotice('The shortlist summary is on the clipboard.');
    } catch {
      setCopyFallback(summary);
      setNotice('Clipboard permission was blocked. Select the summary below and copy it.');
    }
  }

  async function updateCandidate(
    id: string,
    updater: (candidate: NameCandidate) => NameCandidate,
  ) {
    if (!session) return;
    await patch({
      candidates: session.candidates.map((item) =>
        item.id === id ? updater(item) : item,
      ),
    });
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
        setSession(await fetchProjectNameSession(orgId, projectId, sessionId));
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
    if (inspectorId === id) setInspectorId(null);
  }

  async function handlePick(id: string, note = pickNote) {
    if (!orgId || !projectId || !sessionId || !session) return;
    const scope = winnerScopeIds(session, id);
    const points = reactionPointsForSession(session, scope);
    if (needsWinnerReason(id, scope, points, note)) {
      setPendingPickId(id);
      setError(BELOW_TOP_REASON_MESSAGE);
      setErrorCode(ERR_ARC_NAME_24);
      return;
    }
    setBusy('pick');
    try {
      const updated = await recommendNameCandidate(
        orgId,
        projectId,
        sessionId,
        id,
        note.trim() || undefined,
      );
      setSession(updated);
      setPendingPickId(null);
      setPickNote('');
      setError(null);
      setErrorCode(undefined);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this pick' }));
      setErrorCode(err instanceof ApiError ? err.code : undefined);
    } finally {
      setBusy(null);
    }
  }

  async function handleRate(
    id: string,
    overall: number | undefined,
    notes: string,
  ) {
    if (!orgId || !projectId || !sessionId) return;
    try {
      const updated = await upsertNameCandidateRating(
        orgId,
        projectId,
        sessionId,
        id,
        { overall, notes },
      );
      setSession(updated);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this score' }));
    }
  }

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
  const inspector = inspectorId
    ? session?.candidates.find((item) => item.id === inspectorId) ?? null
    : null;
  const briefLine = session
    ? [session.title, desc.whatItIs?.trim(), goalProfile(session.namingGoal).label]
        .filter(Boolean)
        .join(' · ')
    : '';
  const promotedCount = session?.shortlistIds.length ?? 0;
  const feedbackReady =
    (session?.feedback.length ?? 0) > 0 || promotedCount >= 2;
  const progressLabel =
    busy === 'generate'
      ? 'Generating names…'
      : busy === 'save'
        ? 'Saving names…'
        : busy === 'check'
          ? 'Checking names…'
          : busy === 'copy'
            ? 'Copying prompt…'
            : null;
  const briefDirty =
    Boolean(session) &&
    JSON.stringify({
      title: session?.title,
      namingGoal: session?.namingGoal,
      productDescription: desc,
    }) !== savedBriefRef.current;

  const composer = (
    <NamesComposer
      typedName={typedName}
      onTypedName={setTypedName}
      busy={busy}
      progress={progressLabel}
      onCheckName={() => void handleAddField()}
      onGenerate={() => void handleGenerate()}
      onCopyPrompt={() => void handleCopyPrompt()}
      onPasteAi={() => {
        setPasteText('');
        setPasteOpen(true);
      }}
      onPastePacket={(text) => handlePastePacket(text)}
    />
  );

  return (
    <div className="page-shell names-session-page">
      <header className="page-header page-header-with-actions">
        <div>
          <div className="page-links names-session-back">
            <Link
              to={`/organizations/${orgId}/projects/${projectId}/names`}
              className="text-link"
            >
              ← Names
            </Link>
          </div>
          <h2>{session?.title ?? 'Name session'}</h2>
          {session && !briefEditing && (
            <div className="names-session-meta">
              {pickName ? (
                <span className="names-session-pick">Your pick: {pickName}</span>
              ) : null}
              <button
                type="button"
                className="names-brief-line"
                aria-label={`Edit brief: ${briefLine || 'Add a one-line brief'}`}
                onClick={() => setBriefEditing(true)}
              >
                {briefLine || 'Add a one-line brief'}
              </button>
            </div>
          )}
          {session && briefEditing && (
            <section className="names-quick-brief">
              <label className="form-field">
                <span>Working name</span>
                <input
                  value={session.title}
                  onChange={(event) =>
                    setSession({ ...session, title: event.target.value })
                  }
                />
              </label>
              <label className="form-field">
                <span>What does it do?</span>
                <textarea
                  ref={whatItIsRef}
                  rows={2}
                  value={desc.whatItIs ?? ''}
                  onChange={(event) => setDesc('whatItIs', event.target.value)}
                />
              </label>
              <div className="form-field">
                <span>Kind of name</span>
                <Select
                  value={(session.namingGoal as NamingGoal) ?? DEFAULT_NAMING_GOAL}
                  onChange={(value) =>
                    setSession({
                      ...session,
                      namingGoal: value as NamingGoal,
                    })
                  }
                  options={NAMING_GOAL_OPTIONS.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                />
              </div>
              <details className="names-brief-extras">
                <summary>More about the product (optional)</summary>
                {BRIEF_EXTRA_FIELDS.map((field) => (
                  <label key={field.key} className="form-field">
                    <span>{field.label}</span>
                    <textarea
                      rows={2}
                      value={desc[field.key] ?? ''}
                      onChange={(event) => setDesc(field.key, event.target.value)}
                    />
                  </label>
                ))}
              </details>
              <div className="names-quick-brief-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy === 'canvas'}
                  onClick={() => void saveBrief()}
                >
                  Save brief
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setBriefEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}
          {briefSaved && (
            <span className="names-brief-saved" role="status">
              Saved
            </span>
          )}
        </div>
      </header>
      {loading && <p className="status-message">Loading session...</p>}
      {error && <ErrorAlert code={errorCode}>{error}</ErrorAlert>}
      {notice && <div className="alert">{notice}</div>}
      {pendingPickId && session && (
        <div className="names-decision-panel">
          <label className="form-field">
            <span>Why this name is not the top result</span>
            <textarea
              rows={3}
              value={pickNote}
              onChange={(event) => setPickNote(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy === 'pick'}
            onClick={() => void handlePick(pendingPickId, pickNote)}
          >
            Confirm pick
          </button>
        </div>
      )}
      {session && (
        <>
          <nav
            className="names-desk-tabs names-session-mode-nav"
            aria-label="Name session modes"
          >
            {sessionModes.map((item) => {
              const current = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={current ? 'is-current is-primary' : 'is-secondary'}
                  aria-current={current ? 'true' : undefined}
                  onClick={() => setMode(item.id)}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
          <section className="names-panel">
            {mode === 'explore' ? composer : null}
            {retryNames.length > 0 && (
              <p className="names-retry" role="status">
                Some checks did not finish.{' '}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => void runWaveChecks(retryNames, 'chatbot', { retry: true })}
                >
                  Retry checks
                </button>
              </p>
            )}
            {copyFallback ? (
              <label className="form-field names-copy-fallback">
                <span>Select this text and copy it</span>
                <textarea readOnly rows={8} value={copyFallback} />
              </label>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void handleCopySummary()}
            >
              Copy shortlist summary
            </button>
            {mode === 'explore' && (
              <ExploreMode
                session={session}
                orgId={orgId}
                projectId={projectId}
                sessionId={sessionId}
                onSession={setSession}
                onGoToShortlist={() => setMode('shortlist')}
              />
            )}
            {mode === 'shortlist' && (
              <ShortlistMode
                session={session}
                orgId={orgId}
                projectId={projectId}
                sessionId={sessionId}
                resolvingKeys={resolvingKeys}
                isBlind={Boolean(isBlind)}
                openRound={openRound}
                raterName={user?.username ?? 'you'}
                onSession={setSession}
                onGoToDecision={() => setMode('decision')}
                onKeep={(id) => void handleKeep(id)}
                onReject={(id) => void handleReject(id)}
                onPick={(id) => void handlePick(id)}
                onOpen={(id) => {
                  setInspectorId(id);
                  setInspectorView('checks');
                }}
                onRate={(id, overall, notes) => void handleRate(id, overall, notes)}
              />
            )}
            {mode === 'decision' && (
              <DecisionMode
                session={session}
                orgId={orgId}
                projectId={projectId}
                sessionId={sessionId}
                onSession={setSession}
                onNotice={setNotice}
                onGoToShortlist={() => setMode('shortlist')}
              />
            )}
            {mode === 'team' && showTeamTab ? (
              <TeamViewsMode session={session} />
            ) : null}
          </section>
        </>
      )}
      {briefDirty && (
        <p className="names-meta" role="status">
          Brief edits are not saved yet. Save brief or they will be lost if you leave.
        </p>
      )}
      <CandidateReviewDialog
        open={reviewOpen}
        rows={reviewRows}
        error={reviewError}
        busy={busy === 'save' || busy === 'check'}
        onRowChange={(id, patch) => {
          setReviewRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
          );
        }}
        onConfirm={() => void handleConfirmReview()}
        onCancel={() => {
          setReviewOpen(false);
          setReviewRows([]);
          setReviewError(null);
        }}
      />
      <NamesPasteDialog
        open={pasteOpen}
        text={pasteText}
        onChange={setPasteText}
        onReview={() => openReviewFromText(pasteText, 'chatbot')}
        onCancel={() => setPasteOpen(false)}
      />
      <Modal
        open={Boolean(inspector)}
        onClose={() => setInspectorId(null)}
        title={inspector?.name ?? 'Name'}
        titleId="names-inspector-title"
        className="names-inspector-modal"
      >
        <nav className="names-desk-tabs" aria-label="Name views">
          {(['checks', 'compare', 'feedback'] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={inspectorView === id ? 'is-current is-primary' : 'is-secondary'}
              aria-current={inspectorView === id ? 'true' : undefined}
              onClick={() => setInspectorView(id)}
            >
              {id === 'checks' ? 'Checks' : id === 'compare' ? 'Compare' : 'Feedback'}
            </button>
          ))}
        </nav>
        {inspectorView === 'checks' && inspector && session && (
          <CandidateCard
            candidate={inspector}
            session={session}
            orgId={orgId}
            projectId={projectId}
            sessionId={sessionId}
            isBlind={Boolean(
              isBlind && openRound?.candidateIds.includes(inspector.id),
            )}
            busy={busy}
            onBusy={setBusy}
            onSession={setSession}
            onUpdate={(next) => void updateCandidate(next.id, () => next)}
            onReject={() => void handleReject(inspector.id)}
          />
        )}
        {inspectorView === 'compare' && session && (
          <CompareSection
            session={session}
            orgId={orgId}
            projectId={projectId}
            sessionId={sessionId}
            onSession={setSession}
            onNotice={setNotice}
          />
        )}
        {inspectorView === 'feedback' && session && (
          feedbackReady ? (
            <FeedbackSection
              session={session}
              orgId={orgId}
              projectId={projectId}
              sessionId={sessionId}
              onSession={setSession}
              onNotice={setNotice}
            />
          ) : (
            <p className="names-empty">
              Score names 1–10 on the shortlist anytime. Keep at least two names
              to start a blind group round here.
            </p>
          )
        )}
      </Modal>
    </div>
  );
}
