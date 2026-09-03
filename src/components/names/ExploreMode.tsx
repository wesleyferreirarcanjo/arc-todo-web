import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorAlert } from '../ErrorAlert';
import { userMessage, WEB_ERROR } from '../../lib/errors/messages';
import {
  addNameCandidates,
  setNameCandidateReaction,
  startNameBatch,
  updateProjectNameSession,
} from '../../lib/api/names';
import { normalizeNameKey } from '../../lib/names/catalog';
import { emptyCandidate, exploreVariations } from '../../lib/names/variations';
import type {
  CandidateReaction,
  NameCandidate,
  ProjectNameSession,
} from '../../types/name-session';
import { BatchProgress } from './BatchProgress';
import { CandidateDeck } from './CandidateDeck';
import { CandidateDeckCard } from './CandidateDeckCard';
import { ReactionControls } from './ReactionControls';
import { VariationPicker } from './VariationPicker';

const NEEDS_AI_COPY =
  'Needs AI. Copy the brief with Smart copy, paste suggestions, or type a name.';

type UndoEntry = {
  id: string;
  previous: CandidateReaction | undefined;
  index: number;
};

function isBatched(candidate: NameCandidate): boolean {
  return (
    typeof candidate.batchNumber === 'number' &&
    Number.isInteger(candidate.batchNumber)
  );
}

export function exploreDeck(session: ProjectNameSession): NameCandidate[] {
  const active = session.candidates.filter((item) => item.status !== 'rejected');
  const open = (session.batches ?? []).find((batch) => batch.status === 'open');
  if (open) {
    return open.candidateIds
      .map((id) => active.find((item) => item.id === id))
      .filter((item): item is NameCandidate => Boolean(item));
  }
  return active.filter((item) => !isBatched(item));
}

export function unbatchedActive(session: ProjectNameSession): NameCandidate[] {
  return session.candidates.filter(
    (item) => item.status !== 'rejected' && !isBatched(item),
  );
}

function firstOpenIndex(cards: NameCandidate[]): number {
  const first = cards.findIndex((item) => !item.reaction);
  return first >= 0 ? first : cards.length;
}

function speakName(name: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  const Utterance = window.SpeechSynthesisUtterance;
  if (typeof Utterance !== 'function') return false;
  window.speechSynthesis.speak(new Utterance(name));
  return true;
}

function typingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function ExploreMode(props: {
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  onSession: (session: ProjectNameSession) => void;
  onGoToShortlist: () => void;
}) {
  const { session } = props;
  const deck = exploreDeck(session);
  const waiting = unbatchedActive(session);
  const [index, setIndex] = useState(() => firstOpenIndex(deck));
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [speechUnsupported, setSpeechUnsupported] = useState(false);
  const [variationOpen, setVariationOpen] = useState(false);
  const [variationBusy, setVariationBusy] = useState(false);
  const [startingBatch, setStartingBatch] = useState(false);
  const writeChain = useRef(Promise.resolve());
  const indexRef = useRef(index);
  const deckKey = (session.batches ?? []).find((batch) => batch.status === 'open')
    ?.number ?? 'waiting';
  const [seenDeckKey, setSeenDeckKey] = useState(deckKey);
  if (seenDeckKey !== deckKey) {
    setSeenDeckKey(deckKey);
    const nextIndex = firstOpenIndex(deck);
    setIndex(nextIndex);
    indexRef.current = nextIndex;
    setUndoStack([]);
    setError(null);
  }
  indexRef.current = index;

  const current = index < deck.length ? deck[index] : undefined;
  const exhausted = deck.length > 0 && index >= deck.length;
  const survivors = deck.filter(
    (item) => item.reaction === 'liked' || item.reaction === 'loved',
  );
  const champion = session.recommendedCandidateId
    ? session.candidates.find((item) => item.id === session.recommendedCandidateId)
        ?.name ?? null
    : null;

  function patchLocal(
    id: string,
    reaction: CandidateReaction | undefined,
  ) {
    props.onSession({
      ...session,
      candidates: session.candidates.map((item) => {
        if (item.id !== id) return item;
        if (reaction) {
          return {
            ...item,
            reaction,
            reactedAt: new Date().toISOString(),
          };
        }
        const { reaction: _ignored, reactedAt: _at, ...rest } = item;
        return rest;
      }),
    });
  }

  function enqueue(work: () => Promise<void>) {
    writeChain.current = writeChain.current.then(work, work);
    return writeChain.current;
  }

  const persistReaction = useCallback(
    (id: string, reaction: CandidateReaction | null) =>
      setNameCandidateReaction(
        props.orgId,
        props.projectId,
        props.sessionId,
        id,
        { reaction },
      ),
    [props.orgId, props.projectId, props.sessionId],
  );

  function react(reaction: CandidateReaction) {
    const fromIndex = indexRef.current;
    const card = deck[fromIndex];
    if (!card || fromIndex >= deck.length) return;
    const id = card.id;
    const previous = card.reaction;
    setError(null);
    patchLocal(id, reaction);
    setUndoStack((stack) => [...stack, { id, previous, index: fromIndex }]);
    indexRef.current = fromIndex + 1;
    setIndex(fromIndex + 1);
    void enqueue(async () => {
      try {
        const updated = await persistReaction(id, reaction);
        props.onSession(updated);
      } catch (err) {
        patchLocal(id, previous);
        indexRef.current = fromIndex;
        setIndex(fromIndex);
        setUndoStack((stack) =>
          stack[stack.length - 1]?.id === id ? stack.slice(0, -1) : stack,
        );
        setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this reaction' }));
      }
    });
  }

  function undo() {
    const entry = undoStack[undoStack.length - 1];
    if (!entry) return;
    setError(null);
    setUndoStack((stack) => stack.slice(0, -1));
    indexRef.current = entry.index;
    setIndex(entry.index);
    patchLocal(entry.id, undefined);
    void enqueue(async () => {
      try {
        const updated = await persistReaction(entry.id, null);
        props.onSession(updated);
      } catch (err) {
        patchLocal(entry.id, entry.previous);
        setUndoStack((stack) => [...stack, entry]);
        setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this undo' }));
      }
    });
  }

  function hear(name: string) {
    if (!speakName(name)) setSpeechUnsupported(true);
  }

  async function addVariation(name: string) {
    if (!current) return;
    const originId = current.id;
    const originIndex = index;
    setVariationBusy(true);
    setError(null);
    try {
      const { candidates: added } = await addNameCandidates(
        props.orgId,
        props.projectId,
        props.sessionId,
        [
          {
            name,
            family: current.family ?? undefined,
            rationale: `Variation of ${current.name}`,
          },
        ],
        'human',
      );
      const created = added[0];
      if (!created) return;
      const others = session.candidates.filter(
        (item) => normalizeNameKey(item.name) !== normalizeNameKey(created.name),
      );
      const linked: NameCandidate = {
        ...created,
        ...emptyCandidate(created.name),
        id: created.id,
        name: created.name,
        derivedFromCandidateId: originId,
        family: current.family ?? created.family,
        rationale: created.rationale || `Variation of ${current.name}`,
      };
      const updated = await updateProjectNameSession(
        props.orgId,
        props.projectId,
        props.sessionId,
        { candidates: [...others, linked] },
      );
      props.onSession(updated);
      const nextDeck = exploreDeck(updated);
      const kept = nextDeck.findIndex((item) => item.id === originId);
      setIndex(kept >= 0 ? kept : originIndex);
      setVariationOpen(false);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this variation' }));
    } finally {
      setVariationBusy(false);
    }
  }

  async function startBatch() {
    const ids = waiting.slice(0, 20).map((item) => item.id);
    if (ids.length < 10) return;
    setStartingBatch(true);
    setError(null);
    try {
      const updated = await startNameBatch(
        props.orgId,
        props.projectId,
        props.sessionId,
        { candidateIds: ids },
      );
      props.onSession(updated);
      setUndoStack([]);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'this batch' }));
    } finally {
      setStartingBatch(false);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (variationOpen) return;
      if (typingTarget(event.target)) return;
      if (event.key === ' ' || event.code === 'Space') return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        react('passed');
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        react('liked');
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        react('loved');
        return;
      }
      if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        const card = deck[indexRef.current];
        if (card) hear(card.name);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (session.candidates.filter((item) => item.status !== 'rejected').length === 0) {
    return <p className="names-empty">{NEEDS_AI_COPY}</p>;
  }

  const remaining = Math.max(0, deck.length - Math.min(index, deck.length));
  const variations = current
    ? exploreVariations(current.name).filter(
        (name) =>
          !session.candidates.some(
            (item) => normalizeNameKey(item.name) === normalizeNameKey(name),
          ),
      )
    : [];

  return (
    <div className="names-explore-layout">
      <div className="names-explore-main">
        {error ? <ErrorAlert>{error}</ErrorAlert> : null}
        {exhausted ? (
          <div className="names-explore-exhausted">
            <p>You have gone through this batch.</p>
            {survivors.length > 0 ? (
              <ul className="names-explore-survivors">
                {survivors.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            ) : (
              <p>Nothing kept from this batch.</p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={props.onGoToShortlist}
            >
              Open Shortlist
            </button>
          </div>
        ) : current ? (
          <>
            <CandidateDeck stacked={index < deck.length - 1}>
              <CandidateDeckCard
                candidate={current}
                position={index + 1}
                total={deck.length}
                speechUnsupported={speechUnsupported}
                onHear={() => hear(current.name)}
                onMoreLikeThis={() => setVariationOpen(true)}
              />
            </CandidateDeck>
            <ReactionControls
              canUndo={undoStack.length > 0}
              onUndo={undo}
              onPass={() => react('passed')}
              onLike={() => react('liked')}
              onLove={() => react('loved')}
            />
          </>
        ) : (
          <p className="names-empty">No names in this batch yet.</p>
        )}
      </div>
      <aside className="names-explore-aside">
        <BatchProgress
          position={deck.length === 0 ? 0 : Math.min(index + 1, deck.length)}
          total={deck.length}
          remaining={remaining}
          championName={champion}
          canManage={session.canManageFeedback}
          unbatchedCount={waiting.length}
          starting={startingBatch}
          onStartBatch={() => void startBatch()}
        />
        <section className="names-quick-keys" aria-label="Quick keys">
          <h3>Quick keys</h3>
          <ul>
            <li>← Pass</li>
            <li>↑ Like</li>
            <li>→ Love</li>
            <li>H Hear it</li>
          </ul>
        </section>
      </aside>
      <VariationPicker
        open={variationOpen}
        sourceName={current?.name ?? ''}
        variations={variations}
        busy={variationBusy}
        onPick={(name) => void addVariation(name)}
        onClose={() => setVariationOpen(false)}
      />
    </div>
  );
}
