import { useAuth } from '../context/AuthContext';
import { CompareSection } from '../components/names/CompareSection';
import { FeedbackSection } from '../components/names/FeedbackSection';
import { NamesSection } from '../components/names/NamesSection';
import { CandidateCard } from '../components/names/CandidateCard';
import { ErrorAlert } from '../components/ErrorAlert';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ApiError } from '../lib/api/client';
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
} from '../lib/names/wave';
import {
  DEFAULT_NAMING_GOAL,
  NAMING_GOAL_OPTIONS,
  goalProfile,
  normalizeNameKey,
} from '../lib/names/catalog';
import { canvasHasProduct } from '../lib/names/prompts';
import {
  buildNamesSmartCopyPrompt,
  looksLikeNamesPacket,
  parseNamesSmartCopy,
} from '../lib/names/smartCopy';
import type {
  NameCandidate,
  NamingGoal,
  ProductDescription,
  ProjectNameSession,
  CandidateSource,
} from '../types/name-session';

const NEEDS_AI_COPY =
  'Needs AI. Copy the brief with Smart copy, paste suggestions, or type a name.';
const SMART_COPY_GATE =
  'Add one sentence about what it does, then use Smart copy. You can still check a name.';
const PASTE_GATE =
  'Add one sentence about what it does, then paste suggestions. You can still check a name.';
const BRIEF_SAVED_MS = 2000;

type InspectorView = 'checks' | 'compare' | 'feedback';

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

  const load = useCallback(async () => {
    if (!orgId || !projectId || !sessionId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setSession(await fetchProjectNameSession(orgId, projectId, sessionId));
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

  async function runWaveChecks(names: string[]) {
    if (!orgId || !projectId || !sessionId || !names.length) return;
    const keys = names.map((name) => normalizeNameKey(name));
    setResolvingKeys((prev) => [...new Set([...prev, ...keys])]);
    setBusy('check');
    try {
      await runNameWave({
        names,
        add: async (waveNames) => {
          await addNameCandidates(
            orgId,
            projectId,
            sessionId,
            waveNames.map((name) => ({ name })),
            'human',
          );
          setSession(await fetchProjectNameSession(orgId, projectId, sessionId));
        },
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
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'these name checks' }));
    } finally {
      setResolvingKeys((prev) => prev.filter((item) => !keys.includes(item)));
      setBusy(null);
    }
  }

  async function handlePastePacket(text: string) {
    if (!session) return;
    if (!canvasHasProduct(desc)) {
      setNotice(PASTE_GATE);
      return;
    }
    const parsed = parseNamesSmartCopy(text);
    if (!parsed.ok) {
      setNotice(parsed.error);
      return;
    }
    setNotice(null);
    await runWaveChecks(parsed.names);
  }

  async function handleAddField() {
    const text = typedName;
    if (!text.trim()) return;
    if (looksLikeNamesPacket(text) || text.includes('\n')) {
      await handlePastePacket(text);
      return;
    }
    await handleCheckName(text);
  }

  async function handleSmartCopy() {
    if (!session) return;
    if (!canvasHasProduct(desc)) {
      setNotice(SMART_COPY_GATE);
      return;
    }
    setBusy('copy');
    try {
      await navigator.clipboard.writeText(
        buildNamesSmartCopyPrompt({
          title: session.title,
          whatItIs: desc.whatItIs,
          namingGoal: session.namingGoal,
          candidates: session.candidates,
        }),
      );
      setNotice('Smart copy is on the clipboard.');
    } catch {
      setNotice('Could not copy the brief.');
    } finally {
      setBusy(null);
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

  async function handlePick(id: string) {
    if (!orgId || !projectId || !sessionId) return;
    setBusy('pick');
    try {
      const updated = await recommendNameCandidate(orgId, projectId, sessionId, id);
      setSession(updated);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this pick' }));
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
  const keptCount = session?.shortlistIds.length ?? 0;
  const feedbackReady =
    (session?.feedback.length ?? 0) > 0 || keptCount >= 2;

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
      {session && (
        <NamesSection
          session={session}
          typedName={typedName}
          onTypedName={setTypedName}
          busy={busy}
          resolvingKeys={resolvingKeys}
          isBlind={Boolean(isBlind)}
          openRound={openRound}
          emptyCopy={NEEDS_AI_COPY}
          raterName={user?.username ?? 'you'}
          onCheckName={() => void handleAddField()}
          onSmartCopy={() => void handleSmartCopy()}
          onPastePacket={(text) => void handlePastePacket(text)}
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
