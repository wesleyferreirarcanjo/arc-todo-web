import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sendChatMessage } from '../lib/api/chat';
import type { ChatMessage } from '../lib/api/chat';
import type { ConversationSummary } from '../lib/api/conversations';
import { useChat } from '../context/ChatContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useMotionTransition } from '../lib/motion/useMotionTransition';
import {
  formatConversationDisplayTitle,
  formatTaskChipLabel,
  messageHasTaskRefTokens,
  splitMessageWithTaskRefs,
} from '../lib/chat/taskRefTokens';
import {
  chatMessageVariants,
  chatPanelSpringTransition,
  chatPanelVariants,
  chatWidgetFabVariants,
} from '../lib/motion/variants';
import { ChatComposer, type ChatComposerHandle } from './ChatComposer';

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

function MoreIcon() {
  return (
    <svg
      className="chat-widget-tab-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
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

interface ChatLauncherButtonProps {
  chatOpen: boolean;
  panelId: string;
  reducedMotion: boolean | null;
  fast: ReturnType<typeof useMotionTransition>['fast'];
  fabIconTransition: ReturnType<typeof useMotionTransition>['fast'] | object;
  onToggle: () => void;
}

function ChatLauncherButton({
  chatOpen,
  panelId,
  reducedMotion,
  fast,
  fabIconTransition,
  onToggle,
}: ChatLauncherButtonProps) {
  return (
    <motion.button
      type="button"
      layout
      className="chat-widget-fab"
      aria-label={chatOpen ? 'Close assistant' : 'Open assistant'}
      aria-expanded={chatOpen}
      aria-controls={panelId}
      onClick={onToggle}
      variants={chatWidgetFabVariants}
      initial="rest"
      whileHover={chatOpen ? 'openHover' : 'hover'}
      whileTap={chatOpen ? 'openTap' : 'tap'}
      animate={chatOpen ? 'open' : 'rest'}
      transition={{
        layout: reducedMotion ? { duration: 0 } : chatPanelSpringTransition,
        scale: reducedMotion ? { duration: 0 } : chatPanelSpringTransition,
        ...fast,
      }}
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
  );
}

function isLocalWelcomeMessage(message: ChatMessage) {
  return (
    message.role === 'assistant' &&
    message.content.startsWith('Hi! I can help you manage Arc Todo tasks.')
  );
}

function MessageBody({ content }: { content: string }) {
  const parts = splitMessageWithTaskRefs(content);

  if (parts.length === 0 && messageHasTaskRefTokens(content)) {
    return (
      <p className="chat-widget-message-body">
        <span className="chat-message-ref">Task reference</span>
      </p>
    );
  }

  return (
    <p className="chat-widget-message-body">
      {parts.map((part, index) =>
        part.type === 'text' ? (
          part.value ? <span key={`text-${index}`}>{part.value}</span> : null
        ) : (
          <span
            key={`ref-${part.ref.taskId}-${index}`}
            className="chat-message-ref"
            title={`${part.ref.title} (${part.ref.taskId})`}
          >
            {formatTaskChipLabel(part.ref.title, part.ref.taskId)}
          </span>
        ),
      )}
    </p>
  );
}

export function ChatWidget() {
  const { currentOrgId, currentProjectId } = useWorkspace();
  const {
    chatOpen,
    setChatOpen,
    conversations,
    visibleConversations,
    overflowConversations,
    activeConversationId,
    messages,
    loadingConversations,
    loadingMessages,
    pendingTaskInsert,
    clearPendingTaskInsert,
    createNewConversation,
    selectConversation,
    selectOverflowConversation,
    removeConversation,
    registerComposer,
    ensureActiveConversation,
    persistMessage,
    appendLocalMessage,
  } = useChat();
  const { base, fast, reducedMotion } = useMotionTransition();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closingConversationId, setClosingConversationId] = useState<string | null>(
    null,
  );
  const [overflowOpen, setOverflowOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ChatComposerHandle>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const panelId = 'chat-widget-panel';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    registerComposer({
      insertRef: (ref) => composerRef.current?.insertRef(ref),
      removeRef: (taskId) => composerRef.current?.removeRef(taskId),
      containsRef: (taskId) => composerRef.current?.containsRef(taskId) ?? false,
      getContent: () =>
        composerRef.current?.getContent() ?? { text: '', taskRefs: [] },
    });
    return () => registerComposer(null);
  }, [registerComposer]);

  useEffect(() => {
    if (pendingTaskInsert && composerRef.current) {
      composerRef.current.insertRef(pendingTaskInsert);
      clearPendingTaskInsert();
      composerRef.current.focus();
    }
  }, [clearPendingTaskInsert, pendingTaskInsert]);

  useEffect(() => {
    composerRef.current?.clear();
  }, [activeConversationId]);

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
      composerRef.current?.focus();
    }
  }, [chatOpen, activeConversationId]);

  useEffect(() => {
    if (!overflowOpen) {
      return;
    }

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (
        overflowRef.current &&
        !overflowRef.current.contains(event.target as Node)
      ) {
        setOverflowOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [overflowOpen]);

  async function handleSubmit() {
    const { text, taskRefs } = composerRef.current?.getContent() ?? {
      text: '',
      taskRefs: [],
    };

    if (!text || loading) {
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: text };
    const conversationMessages = messages.filter(
      (message) => !isLocalWelcomeMessage(message),
    );
    const nextMessages: ChatMessage[] = [...conversationMessages, userMessage];
    appendLocalMessage(userMessage);
    composerRef.current?.clear();
    setLoading(true);
    setError(null);

    try {
      const conversationId = await ensureActiveConversation();
      await persistMessage('user', text);

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

  function renderConversationTab(conversation: ConversationSummary) {
    return (
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
          {formatConversationDisplayTitle(conversation.title)}
        </button>
        <button
          type="button"
          className="chat-widget-tab-close"
          aria-label={`Close ${formatConversationDisplayTitle(conversation.title)}`}
          disabled={closingConversationId === conversation.id}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => void handleCloseConversation(event, conversation.id)}
        >
          <CloseIcon />
        </button>
      </div>
    );
  }

  return (
    <div className={`chat-widget-root${chatOpen ? ' is-open' : ''}`}>
      <ChatLauncherButton
        chatOpen={chatOpen}
        panelId={panelId}
        reducedMotion={reducedMotion}
        fast={fast}
        fabIconTransition={fabIconTransition}
        onToggle={() => setChatOpen(!chatOpen)}
      />

      <AnimatePresence>
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
                  visibleConversations.map((conversation) =>
                    renderConversationTab(conversation),
                  )
                )}
              </div>

              {overflowConversations.length > 0 ? (
                <div className="chat-widget-tab-overflow" ref={overflowRef}>
                  <button
                    type="button"
                    className="chat-widget-tab-overflow-trigger"
                    aria-label="More conversations"
                    aria-expanded={overflowOpen}
                    onClick={() => setOverflowOpen((open) => !open)}
                  >
                    <MoreIcon />
                  </button>

                  {overflowOpen ? (
                    <div className="chat-widget-tab-overflow-menu" role="menu">
                      {overflowConversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          type="button"
                          role="menuitem"
                          className={
                            conversation.id === activeConversationId
                              ? 'chat-widget-tab-overflow-item is-active'
                              : 'chat-widget-tab-overflow-item'
                          }
                          onClick={() => {
                            setOverflowOpen(false);
                            void selectOverflowConversation(conversation.id);
                          }}
                        >
                          {formatConversationDisplayTitle(conversation.title)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

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
                    <MessageBody content={message.content} />
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

            {error ? <p className="chat-widget-error">{error}</p> : null}

            <form
              className="chat-widget-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <ChatComposer
                ref={composerRef}
                placeholder={
                  activeConversation
                    ? `Message in ${formatConversationDisplayTitle(activeConversation.title)}...`
                    : 'Ask about your tasks...'
                }
                disabled={loading || loadingMessages}
                onSubmit={() => void handleSubmit()}
              />
              <div className="chat-widget-composer-actions">
                <button
                  type="submit"
                  className="btn btn-primary chat-widget-send"
                  disabled={loading || loadingMessages}
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
