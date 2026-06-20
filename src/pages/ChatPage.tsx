import { useCallback, useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '../lib/api/chat';
import type { ChatMessage } from '../lib/api/chat';
import { useWorkspace } from '../context/WorkspaceContext';

export function ChatPage() {
  const { currentOrgId, currentProjectId } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! I can help you manage Arc Todo tasks. Ask me to list, create, or update tasks.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage({
        messages: nextMessages,
        organizationId: currentOrgId ?? undefined,
        projectId: currentProjectId ?? undefined,
      });
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: response.message },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-section chat-page">
      <div className="page-header">
        <div>
          <h2>Chat</h2>
          <p className="subtitle">
            Ask the assistant to manage tasks using your current workspace
            context.
          </p>
        </div>
      </div>

      <div className="chat-panel">
        <div className="chat-messages" aria-live="polite">
          {messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={
                message.role === 'user'
                  ? 'chat-message chat-message-user'
                  : 'chat-message chat-message-assistant'
              }
            >
              <span className="chat-message-role">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </span>
              <p>{message.content}</p>
            </article>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <form className="chat-composer" onSubmit={(event) => void handleSubmit(event)}>
          <textarea
            className="chat-input"
            rows={3}
            value={input}
            placeholder="Ask about your tasks..."
            disabled={loading}
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="chat-composer-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
