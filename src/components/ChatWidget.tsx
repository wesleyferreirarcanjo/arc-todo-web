import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sendChatMessage } from '../lib/api/chat';
import type { ChatMessage } from '../lib/api/chat';
import { useChat } from '../context/ChatContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useMotionTransition } from '../lib/motion/useMotionTransition';
import {
  chatMessageVariants,
  chatPanelSpringTransition,
  chatPanelVariants,
  chatWidgetFabVariants,
} from '../lib/motion/variants';

function AssistantIcon() {
  return (
    <svg
      className="chat-widget-fab-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3c-4.4 0-8 2.9-8 6.5 0 2.1 1.2 4 3.1 5.2L6.5 19l3.4-1.8c.7.1 1.4.2 2.1.2 4.4 0 8-2.9 8-6.5S16.4 3 12 3z" />
      <circle cx="9" cy="9.5" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="12" cy="9.5" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9.5" r="0.85" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="chat-widget-close-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="chat-widget-tab-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-widget-typing" aria-label="Assistant is typing">
      <span />
      <span />
      <span />
    </div>
  );
}

function formatTaskChipLabel(title: string, taskId: string) {
  const shortId = taskId.slice(0, 8);
  return title.length > 28 ? `${title.slice(0, 25)}...` : title || shortId;
}

function isLocalWelcomeMessage(message: ChatMessage) {
  return (
    message.role === 'assistant' &&
    message.content.startsWith('Hi! I can help you manage Arc Todo tasks.')
  );
}

export function ChatWidget() {
  const { currentOrgId, currentProjectId } = useWorkspace();
  const {
    chatOpen,
    setChatOpen,
    conversations,
    activeConversationId,
    messages,
    taskRefs,
    loadingConversations,
    loadingMessages,
    createNewConversation,
    selectConversation,
    removeConversation,
    removeTaskContext,
    ensureActiveConversation,
    persistMessage,
    appendLocalMessage,
  } = useChat();
  const { base, fast, reducedMotion } = useMotionTransition();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closingConversationId, setClosingConversationId] = useState<string | null>(
    null,
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelId = 'chat-widget-panel';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
    }
  }, [messages, loading, chatOpen, scrollToBottom]);

  useEffect(() => {
    if (!chatOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setChatOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [chatOpen, setChatOpen]);

  useEffect(() => {
    if (chatOpen) {
      inputRef.current?.focus();
    }
  }, [chatOpen, activeConversationId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const conversationMessages = messages.filter(
      (message) => !isLocalWelcomeMessage(message),
    );
    const nextMessages: ChatMessage[] = [...conversationMessages, userMessage];
    appendLocalMessage(userMessage);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const conversationId = await ensureActiveConversation();
      await persistMessage('user', trimmed);

      const response = await sendChatMessage({
        messages: nextMessages,
        organizationId: currentOrgId ?? undefined,
        projectId: currentProjectId ?? undefined,
        conversationId,
        taskRefs,
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
      };
      appendLocalMessage(assistantMessage);
      await persistMessage('assistant', response.message, response.usedTools ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat request failed');
    } finally {
      setLoading(false);
    }
  }

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  const panelTransition = reducedMotion ? base : chatPanelSpringTransition;
  const fabIconTransition = reducedMotion
    ? fast
    : { type: 'spring' as const, stiffness: 520, damping: 28, mass: 0.7 };

  async function handleCloseConversation(
    event: MouseEvent<HTMLButtonElement>,
    conversationId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (closingConversationId) {
      return;
    }

    setClosingConversationId(conversationId);
    setError(null);

    try {
      await removeConversation(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close conversation');
    } finally {
      setClosingConversationId(null);
    }
  }

  return (
    <div className="chat-widget-root">
      <AnimatePresence mode="wait">
        {chatOpen ? (
          <motion.section
            key="chat-panel"
            id={panelId}
            className="chat-widget-panel"
            role="dialog"
            aria-modal="false"
            aria-label="Arc Todo assistant"
            variants={chatPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
          >
            <div className="chat-widget-tabs" role="tablist" aria-label="Conversations">
              <div className="chat-widget-tab-list">
                {loadingConversations ? (
                  <span className="chat-widget-tab-placeholder">Loading...</span>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={
                        conversation.id === activeConversationId
                          ? 'chat-widget-tab is-active'
                          : 'chat-widget-tab'
                      }
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={conversation.id === activeConversationId}
                        className="chat-widget-tab-button"
                        onClick={() => void selectConversation(conversation.id)}
                      >
                        {conversation.title}
                      </button>
                      <button
                        type="button"
                        className="chat-widget-tab-close"
                        aria-label={`Close ${conversation.title}`}
                        disabled={closingConversationId === conversation.id}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) =>
                          void handleCloseConversation(event, conversation.id)
                        }
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                type="button"
                className="chat-widget-tab-new"
                aria-label="New conversation"
                onClick={() => void createNewConversation()}
              >
                <PlusIcon />
              </button>
            </div>

            <div className="chat-widget-messages" aria-live="polite">
              {loadingMessages ? (
                <p className="chat-widget-loading">Loading conversation...</p>
              ) : (
                messages.map((message, index) => (
                  <motion.article
                    key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
                    className={
                      message.role === 'user'
                        ? 'chat-widget-message chat-widget-message-user'
                        : 'chat-widget-message chat-widget-message-assistant'
                    }
                    variants={chatMessageVariants}
                    initial="hidden"
                    animate="visible"
                    transition={fast}
                  >
                    <span className="chat-widget-message-role">
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <p>{message.content}</p>
                  </motion.article>
                ))
              )}

              {loading ? (
                <motion.article
                  className="chat-widget-message chat-widget-message-assistant chat-widget-message-loading"
                  variants={chatMessageVariants}
                  initial="hidden"
                  animate="visible"
                  transition={fast}
                  aria-live="assertive"
                >
                  <span className="chat-widget-message-role">Assistant</span>
                  <TypingIndicator />
                </motion.article>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            {taskRefs.length > 0 ? (
              <div className="chat-widget-context-chips" aria-label="Selected task context">
                {taskRefs.map((ref) => (
                  <button
                    key={ref.taskId}
                    type="button"
                    className="chat-widget-context-chip"
                    title={`${ref.title} (${ref.taskId})`}
                    onClick={() => void removeTaskContext(ref.taskId)}
                  >
                    <span className="chat-widget-context-chip-label">
                      {formatTaskChipLabel(ref.title, ref.taskId)}
                    </span>
                    <span className="chat-widget-context-chip-remove" aria-hidden="true">
                      ×
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {error ? <p className="chat-widget-error">{error}</p> : null}

            <form
              className="chat-widget-composer"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <textarea
                ref={inputRef}
                className="chat-widget-input"
                rows={2}
                value={input}
                placeholder={
                  activeConversation
                    ? `Message in ${activeConversation.title}...`
                    : 'Ask about your tasks...'
                }
                disabled={loading || loadingMessages}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit(event);
                  }
                }}
              />
              <div className="chat-widget-composer-actions">
                <button
                  type="submit"
                  className="btn btn-primary chat-widget-send"
                  disabled={loading || loadingMessages || !input.trim()}
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        className="chat-widget-fab"
        aria-label={chatOpen ? 'Close assistant' : 'Open assistant'}
        aria-expanded={chatOpen}
        aria-controls={panelId}
        onClick={() => setChatOpen(!chatOpen)}
        variants={chatWidgetFabVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        animate={chatOpen ? 'open' : 'rest'}
        transition={fast}
      >
        <AnimatePresence mode="wait" initial={false}>
          {chatOpen ? (
            <motion.span
              key="close"
              className="chat-widget-fab-content"
              initial={{ opacity: 0, rotate: -120, scale: 0.65 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 120, scale: 0.65 }}
              transition={fabIconTransition}
            >
              <CloseIcon />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              className="chat-widget-fab-content"
              initial={{ opacity: 0, rotate: 120, scale: 0.65 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -120, scale: 0.65 }}
              transition={fabIconTransition}
            >
              <AssistantIcon />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
