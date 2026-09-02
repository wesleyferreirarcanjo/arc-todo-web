import { useEffect, useState } from 'react';
import { ChatApiError, sendChatMessage } from '../../lib/api/chat';
import { messagingPrompt, parseJsonBlock } from '../../lib/names/prompts';
import type { NameCandidate, ProjectNameSession } from '../../types/name-session';

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
  const [msg, setMsg] = useState<NonNullable<NameCandidate['messaging']>>(
    candidate?.messaging ?? {},
  );

  useEffect(() => {
    setMsg(candidate?.messaging ?? {});
  }, [candidate?.id]);

  if (!candidate) {
    return <p>Add candidates first.</p>;
  }
  const titleLen = (msg.searchTitle ?? '').length;
  const descLen = (msg.searchDescription ?? '').length;

  function write(partial: Partial<NonNullable<NameCandidate['messaging']>>) {
    setMsg((prev) => ({ ...prev, ...partial }));
  }

  function persist(next = msg) {
    props.onSave(
      props.session.candidates.map((item) =>
        item.id === candidate.id ? { ...item, messaging: { ...item.messaging, ...next } } : item,
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
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => persist()}
        >
          Save messaging
        </button>
      </div>
    </section>
  );
}
