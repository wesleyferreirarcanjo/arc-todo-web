import { useEffect, useRef, useState } from 'react';
import { ChatApiError, sendChatMessage } from '../../lib/api/chat';
import { messagingPrompt, parseJsonBlock } from '../../lib/names/prompts';
import type { NameCandidate, NameMessaging, ProjectNameSession } from '../../types/name-session';

const SEARCH_TITLE_LIMIT = 60;
const SEARCH_DESCRIPTION_LIMIT = 155;

function emptyMessaging(): NameMessaging {
  return {};
}

function LimitHint({
  id,
  used,
  limit,
}: {
  id: string;
  used: number;
  limit: number;
}) {
  const over = used > limit;
  const near = !over && used >= Math.floor(limit * 0.8);
  return (
    <small
      id={id}
      className={over ? 'names-limit-over' : near ? 'names-limit-warn' : undefined}
    >
      {over
        ? `Limit ${limit} characters · ${used} used, will clip`
        : `Limit ${limit} characters${used > 0 ? ` · ${used} used` : ''}`}
    </small>
  );
}

export function MessagingSection(props: {
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
  const [msg, setMsg] = useState<NameMessaging>(candidate?.messaging ?? emptyMessaging());
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const msgRef = useRef(msg);
  const persistRef = useRef<(next?: NameMessaging) => void>(() => {});

  dirtyRef.current = dirty;
  msgRef.current = msg;

  useEffect(() => {
    setMsg(candidate?.messaging ?? emptyMessaging());
    setDirty(false);
    dirtyRef.current = false;
  }, [candidate?.id]);

  function persist(next = msg) {
    if (!candidate) return;
    props.onSave(
      props.session.candidates.map((item) =>
        item.id === candidate.id ? { ...item, messaging: { ...item.messaging, ...next } } : item,
      ),
    );
    setDirty(false);
    dirtyRef.current = false;
  }

  persistRef.current = persist;

  useEffect(() => {
    return () => {
      if (dirtyRef.current) persistRef.current(msgRef.current);
    };
  }, [candidate?.id]);

  if (!candidate) {
    return <p>Add candidates first.</p>;
  }

  const titleLen = (msg.searchTitle ?? '').length;
  const descLen = (msg.searchDescription ?? '').length;
  const searchTitle = (msg.searchTitle ?? candidate.name).slice(0, SEARCH_TITLE_LIMIT);
  const searchDescription = (msg.searchDescription ?? '').slice(0, SEARCH_DESCRIPTION_LIMIT);

  function write(partial: Partial<NameMessaging>) {
    setMsg((prev) => {
      const next = { ...prev, ...partial };
      msgRef.current = next;
      return next;
    });
    setDirty(true);
    dirtyRef.current = true;
  }

  function blurSave() {
    if (dirtyRef.current) persist(msgRef.current);
  }

  function selectCandidate(id: string) {
    if (dirtyRef.current) persist(msgRef.current);
    setActiveId(id);
  }

  return (
    <section className="names-panel">
      <h3>Messaging test</h3>
      <p className="names-disclaimer">
        A distinctive name reduces exact-name competition; descriptors and content
        explain the category. This does not promise a Google ranking.
      </p>
      <label className="form-field">
        <span>Name</span>
        <select value={candidate.id} onChange={(event) => selectCandidate(event.target.value)}>
          {props.session.candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="names-description-context-group">
        <h4>Positioning and descriptor</h4>
        <label className="form-field">
          <span>Category descriptor</span>
          <input
            value={msg.categoryDescriptor ?? ''}
            onChange={(event) => write({ categoryDescriptor: event.target.value })}
            onBlur={blurSave}
          />
        </label>
        <label className="form-field">
          <span>Positioning statement</span>
          <textarea
            rows={2}
            value={msg.positioning ?? ''}
            onChange={(event) => write({ positioning: event.target.value })}
            onBlur={blurSave}
          />
        </label>
      </div>

      <div className="names-description-context-group">
        <h4>Taglines</h4>
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
              onBlur={blurSave}
            />
          </label>
        ))}
      </div>

      <div className="names-description-context-group">
        <h4>Store copy</h4>
        <label className="form-field">
          <span>App-store subtitle</span>
          <input
            value={msg.appStoreSubtitle ?? ''}
            onChange={(event) => write({ appStoreSubtitle: event.target.value })}
            onBlur={blurSave}
          />
        </label>
      </div>

      <div className="names-description-context-group">
        <h4>Search copy</h4>
        <label className="form-field">
          <span>Search title</span>
          <input
            value={msg.searchTitle ?? ''}
            onChange={(event) => write({ searchTitle: event.target.value })}
            onBlur={blurSave}
            aria-describedby="names-search-title-limit"
          />
          <LimitHint id="names-search-title-limit" used={titleLen} limit={SEARCH_TITLE_LIMIT} />
        </label>
        <label className="form-field">
          <span>Search description</span>
          <textarea
            rows={3}
            value={msg.searchDescription ?? ''}
            onChange={(event) => write({ searchDescription: event.target.value })}
            onBlur={blurSave}
            aria-describedby="names-search-description-limit"
          />
          <LimitHint
            id="names-search-description-limit"
            used={descLen}
            limit={SEARCH_DESCRIPTION_LIMIT}
          />
        </label>
        <div className="names-search-result" aria-label="Search result preview">
          <p className="names-search-result-url">www.example.com/{candidate.name.toLowerCase()}</p>
          <strong className="names-search-result-title">{searchTitle}</strong>
          <p className="names-search-result-snippet">{searchDescription}</p>
        </div>
      </div>

      <div className="names-description-context-group">
        <h4>Plain-language explanation</h4>
        <label className="form-field">
          <span>What is {candidate.name}?</span>
          <textarea
            rows={2}
            value={msg.whatIs ?? ''}
            onChange={(event) => write({ whatIs: event.target.value })}
            onBlur={blurSave}
          />
        </label>
      </div>

      <div className="names-actions">
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
                const next = {
                  categoryDescriptor: String(parsed.categoryDescriptor ?? ''),
                  positioning: String(parsed.positioning ?? ''),
                  taglines: Array.isArray(parsed.taglines)
                    ? parsed.taglines.map(String)
                    : msg.taglines,
                  appStoreSubtitle: String(parsed.appStoreSubtitle ?? ''),
                  searchTitle: String(parsed.searchTitle ?? ''),
                  searchDescription: String(parsed.searchDescription ?? ''),
                  whatIs: String(parsed.whatIs ?? ''),
                };
                write(next);
                persist(next);
              }
            } catch (err) {
              props.onNotice(err instanceof ChatApiError ? err.message : 'Suggest messaging failed.');
            }
          }}
        >
          Suggest messaging
        </button>
        {dirty ? (
          <span className="names-unsaved" role="status">
            Unsaved
          </span>
        ) : null}
        <button
          type="button"
          className="btn btn-primary"
          disabled={!dirty}
          onClick={() => persist()}
        >
          Save messaging
        </button>
      </div>
    </section>
  );
}
