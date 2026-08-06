import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  addConversationMessage,
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  updateConversation,
  type ConversationDetail,
  type ConversationSummary,
  type TaskRef,
} from '../lib/api/conversations';
import type { ChatMessage } from '../lib/api/chat';
import type { Task, TaskWithContext } from '../types/todo';
import {
  messageHasTaskRefTokens,
  titleFromTaskRefs,
} from '../lib/chat/taskRefTokens';

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Hi! I can help you manage Arc Todo tasks. Ctrl+click a task card to insert a task reference in your message.',
};

export const MAX_VISIBLE_TABS = 3;
export const MAX_OPEN_CONVERSATIONS = 10;

interface ChatContextValue {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  conversations: ConversationSummary[];
  visibleConversations: ConversationSummary[];
  overflowConversations: ConversationSummary[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  pendingTaskInsert: TaskRef | null;
  clearPendingTaskInsert: () => void;
  createNewConversation: (options?: {
    clearMessages?: boolean;
  }) => Promise<string>;
  selectConversation: (conversationId: string) => Promise<void>;
  selectOverflowConversation: (conversationId: string) => Promise<void>;
  removeConversation: (conversationId: string) => Promise<void>;
  renameActiveConversation: (title: string) => Promise<void>;
  requestTaskInsert: (task: TaskContextInput) => Promise<void>;
  requestTaskRemove: (taskId: string) => void;
  isTaskReferenced: (taskId: string) => boolean;
  registerComposer: (composer: ComposerRegistration | null) => void;
  ensureActiveConversation: () => Promise<string>;
  persistMessage: (
    role: ChatMessage['role'],
    content: string,
    usedTools?: string[],
  ) => Promise<void>;
  appendLocalMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (
    content: string,
    usedTools?: string[],
  ) => void;
  refreshConversations: () => Promise<void>;
}

export type CreateConversationOptions = {
  /** When true (default), reset the message pane to the welcome bubble. */
  clearMessages?: boolean;
};

type TaskContextInput = TaskWithContext | (Task & {
  organization: { id: string };
  project: { id: string };
});

type ComposerRegistration = {
  insertRef: (ref: TaskRef) => void;
  removeRef: (taskId: string) => void;
  containsRef: (taskId: string) => boolean;
  getContent: () => { text: string; taskRefs: TaskRef[] };
};

const ChatContext = createContext<ChatContextValue | null>(null);

function toChatMessages(detail: ConversationDetail): ChatMessage[] {
  if (detail.messages.length === 0) {
    return [WELCOME_MESSAGE];
  }

  return detail.messages.map((message) => ({
    role: message.role,
    content: message.content,
    usedTools: message.usedTools,
  }));
}

function toTaskRef(task: TaskContextInput): TaskRef {
  return {
    taskId: task.id,
    organizationId: task.organization.id,
    projectId: task.project.id,
    title: task.title,
    displayId: task.displayId,
  };
}

function sortByRecent(conversations: ConversationSummary[]) {
  return [...conversations].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function buildInitialVisibleTabIds(conversations: ConversationSummary[]) {
  return sortByRecent(conversations)
    .slice(0, MAX_VISIBLE_TABS)
    .reverse()
    .map((conversation) => conversation.id);
}

function pruneVisibleTabIds(
  tabIds: string[],
  conversations: ConversationSummary[],
) {
  const validIds = new Set(conversations.map((conversation) => conversation.id));
  return tabIds.filter((id) => validIds.has(id)).slice(0, MAX_VISIBLE_TABS);
}

/** Merge server list with local tabs so a stale bootstrap list cannot drop a just-created conversation. */
export function mergeConversationLists(
  server: ConversationSummary[],
  local: ConversationSummary[],
): ConversationSummary[] {
  const byId = new Map<string, ConversationSummary>();
  for (const conversation of server) {
    byId.set(conversation.id, conversation);
  }
  for (const conversation of local) {
    if (!byId.has(conversation.id)) {
      byId.set(conversation.id, conversation);
    }
  }
  return sortByRecent([...byId.values()]);
}

/** Drop stale getConversation results after the user already mutated local messages. */
export function shouldApplyLoadedMessages(options: {
  loadGeneration: number;
  currentGeneration: number;
  loadedConversationId: string;
  activeConversationId: string | null;
}): boolean {
  return (
    options.loadGeneration === options.currentGeneration &&
    options.activeConversationId === options.loadedConversationId
  );
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [visibleTabIds, setVisibleTabIds] = useState<string[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pendingTaskInsert, setPendingTaskInsert] = useState<TaskRef | null>(
    null,
  );

  const activeConversationIdRef = useRef<string | null>(null);
  const composerRef = useRef<ComposerRegistration | null>(null);
  const referencedTaskIdsRef = useRef<Set<string>>(new Set());
  const messagesLoadGenerationRef = useRef(0);
  const conversationsRef = useRef<ConversationSummary[]>([]);
  const loadingMessagesRef = useRef(false);
  const messageLoadWaitersRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const setLoadingMessagesState = useCallback((loading: boolean) => {
    loadingMessagesRef.current = loading;
    setLoadingMessages(loading);
    if (!loading) {
      const waiters = messageLoadWaitersRef.current;
      messageLoadWaitersRef.current = [];
      for (const resolve of waiters) {
        resolve();
      }
    }
  }, []);

  const waitForMessageLoad = useCallback(async () => {
    if (!loadingMessagesRef.current) {
      return;
    }
    await new Promise<void>((resolve) => {
      messageLoadWaitersRef.current.push(resolve);
    });
  }, []);

  const invalidatePendingMessageLoads = useCallback(() => {
    messagesLoadGenerationRef.current += 1;
    setLoadingMessagesState(false);
  }, [setLoadingMessagesState]);

  const visibleConversations = useMemo(
    () =>
      visibleTabIds
        .map((id) => conversations.find((conversation) => conversation.id === id))
        .filter((conversation): conversation is ConversationSummary =>
          Boolean(conversation),
        ),
    [conversations, visibleTabIds],
  );

  const overflowConversations = useMemo(
    () =>
      sortByRecent(
        conversations.filter(
          (conversation) => !visibleTabIds.includes(conversation.id),
        ),
      ),
    [conversations, visibleTabIds],
  );

  const refreshConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const next = sortByRecent(await listConversations());
      setConversations(next);
      setVisibleTabIds((current) => {
        const pruned = pruneVisibleTabIds(current, next);
        if (pruned.length > 0) {
          return pruned;
        }
        return buildInitialVisibleTabIds(next);
      });
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadConversationDetail = useCallback(
    async (
      conversationId: string,
      options?: {
        /** When false, do not take over a conversation the user already claimed. */
        steal?: boolean;
      },
    ) => {
      const steal = options?.steal !== false;
      const currentId = activeConversationIdRef.current;
      if (!steal && currentId && currentId !== conversationId) {
        return;
      }

      // Claim the tab immediately so a fast first send does not create a duplicate conversation.
      setActiveConversationId(conversationId);
      activeConversationIdRef.current = conversationId;

      const loadGeneration = ++messagesLoadGenerationRef.current;
      setLoadingMessagesState(true);
      try {
        const detail = await getConversation(conversationId);
        if (
          !shouldApplyLoadedMessages({
            loadGeneration,
            currentGeneration: messagesLoadGenerationRef.current,
            loadedConversationId: conversationId,
            activeConversationId: activeConversationIdRef.current,
          })
        ) {
          return;
        }
        setMessages(toChatMessages(detail));
      } finally {
        if (loadGeneration === messagesLoadGenerationRef.current) {
          setLoadingMessagesState(false);
        }
      }
    },
    [setLoadingMessagesState],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoadingConversations(true);
      try {
        const serverList = sortByRecent(await listConversations());
        if (cancelled) return;

        const alreadyActiveId = activeConversationIdRef.current;
        const next = mergeConversationLists(
          serverList,
          conversationsRef.current,
        );
        setConversations(next);
        setVisibleTabIds((current) => {
          const pruned = pruneVisibleTabIds(current, next);
          if (pruned.length > 0) {
            return pruned;
          }
          return buildInitialVisibleTabIds(next);
        });

        // User already opened/sent in a conversation while listConversations was in flight.
        if (alreadyActiveId) {
          return;
        }

        if (next.length > 0) {
          const initialId = next[0].id;

          try {
            await loadConversationDetail(initialId, { steal: false });
          } catch {
            if (activeConversationIdRef.current) {
              return;
            }
            const fallbackId = next.find(
              (conversation) => conversation.id !== initialId,
            )?.id;
            if (fallbackId) {
              await loadConversationDetail(fallbackId, { steal: false });
            } else if (!activeConversationIdRef.current) {
              setActiveConversationId(null);
              activeConversationIdRef.current = null;
              setMessages([WELCOME_MESSAGE]);
            }
          }
        } else if (!activeConversationIdRef.current) {
          setActiveConversationId(null);
          activeConversationIdRef.current = null;
          setMessages([WELCOME_MESSAGE]);
        }
      } finally {
        if (!cancelled) {
          setLoadingConversations(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadConversationDetail]);

  const removeOldestConversationIfNeeded = useCallback(
    async (current: ConversationSummary[]) => {
      if (current.length < MAX_OPEN_CONVERSATIONS) {
        return current;
      }

      const oldest = [...current].sort(
        (left, right) =>
          new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime(),
      )[0];

      await deleteConversation(oldest.id);
      setVisibleTabIds((tabIds) => tabIds.filter((id) => id !== oldest.id));

      if (activeConversationIdRef.current === oldest.id) {
        setActiveConversationId(null);
        activeConversationIdRef.current = null;
        setMessages([WELCOME_MESSAGE]);
      }

      return current.filter((conversation) => conversation.id !== oldest.id);
    },
    [],
  );

  const createNewConversation = useCallback(
    async (options?: CreateConversationOptions) => {
      const clearMessages = options?.clearMessages !== false;
      const pruned = await removeOldestConversationIfNeeded(
        conversationsRef.current,
      );
      const created = await createConversation({});
      const nextConversations = sortByRecent([created, ...pruned]);

      // Drop in-flight history loads for the previous tab before claiming the new one.
      invalidatePendingMessageLoads();
      setConversations(nextConversations);
      setVisibleTabIds((current) =>
        [created.id, ...current.filter((id) => id !== created.id)].slice(
          0,
          MAX_VISIBLE_TABS,
        ),
      );
      setActiveConversationId(created.id);
      activeConversationIdRef.current = created.id;
      if (clearMessages) {
        setMessages([WELCOME_MESSAGE]);
      }
      return created.id;
    },
    [invalidatePendingMessageLoads, removeOldestConversationIfNeeded],
  );

  const ensureActiveConversation = useCallback(async () => {
    await waitForMessageLoad();
    const currentId = activeConversationIdRef.current;
    if (currentId) {
      return currentId;
    }
    // Preserve optimistic bubbles already appended by the send path.
    return createNewConversation({ clearMessages: false });
  }, [createNewConversation, waitForMessageLoad]);

  const promoteOverflowConversation = useCallback((conversationId: string) => {
    setVisibleTabIds((current) => {
      if (current.includes(conversationId)) {
        return current;
      }

      if (current.length < MAX_VISIBLE_TABS) {
        return [...current, conversationId];
      }

      const next = [...current];
      next[MAX_VISIBLE_TABS - 1] = conversationId;
      return next;
    });
  }, []);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (conversationId === activeConversationIdRef.current) {
        return;
      }
      await loadConversationDetail(conversationId);
    },
    [loadConversationDetail],
  );

  const selectOverflowConversation = useCallback(
    async (conversationId: string) => {
      promoteOverflowConversation(conversationId);
      await loadConversationDetail(conversationId);
    },
    [loadConversationDetail, promoteOverflowConversation],
  );

  const removeConversation = useCallback(
    async (conversationId: string) => {
      await deleteConversation(conversationId);

      const wasActive = activeConversationIdRef.current === conversationId;
      const nextVisible = visibleTabIds.filter((id) => id !== conversationId);
      const remaining = sortByRecent(
        conversations.filter((conversation) => conversation.id !== conversationId),
      );

      setVisibleTabIds(nextVisible);
      setConversations(remaining);

      if (!wasActive) {
        return;
      }

      const nextActiveId =
        nextVisible.find((id) => remaining.some((item) => item.id === id)) ??
        remaining[0]?.id ??
        null;

      if (nextActiveId) {
        await loadConversationDetail(nextActiveId);
        return;
      }

      setActiveConversationId(null);
      activeConversationIdRef.current = null;
      setMessages([WELCOME_MESSAGE]);
    },
    [conversations, loadConversationDetail, visibleTabIds],
  );

  const renameActiveConversation = useCallback(
    async (title: string) => {
      const conversationId = activeConversationIdRef.current;
      if (!conversationId) {
        return;
      }

      const updated = await updateConversation(conversationId, {
        title: title.trim() || 'New conversation',
      });
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === updated.id
            ? {
                ...conversation,
                title: updated.title,
                updatedAt: updated.updatedAt,
              }
            : conversation,
        ),
      );
    },
    [],
  );

  const registerComposer = useCallback((composer: ComposerRegistration | null) => {
    composerRef.current = composer;
  }, []);

  const clearPendingTaskInsert = useCallback(() => {
    setPendingTaskInsert(null);
  }, []);

  const syncConversationTaskContext = useCallback(
    async (taskRefs: TaskRef[], preferredTitle?: string) => {
      const conversationId = activeConversationIdRef.current;
      if (!conversationId) {
        return;
      }

      const current = conversations.find(
        (conversation) => conversation.id === conversationId,
      );
      const refTitle = titleFromTaskRefs(taskRefs);
      const shouldReplaceTitle =
        !current ||
        current.title === 'New conversation' ||
        messageHasTaskRefTokens(current.title);

      const title = shouldReplaceTitle
        ? preferredTitle?.trim() || refTitle
        : current.title;

      const updated = await updateConversation(conversationId, {
        title,
        taskRefs,
      });

      setConversations((list) =>
        list.map((conversation) =>
          conversation.id === updated.id
            ? {
                ...conversation,
                title: updated.title,
                updatedAt: updated.updatedAt,
              }
            : conversation,
        ),
      );
    },
    [conversations],
  );

  const requestTaskInsert = useCallback(
    async (task: TaskContextInput) => {
      const nextRef = toTaskRef(task);
      setChatOpen(true);

      if (!activeConversationIdRef.current) {
        await createNewConversation();
      }

      if (composerRef.current) {
        composerRef.current.insertRef(nextRef);
        referencedTaskIdsRef.current.add(nextRef.taskId);
        const { taskRefs } = composerRef.current.getContent();
        await syncConversationTaskContext(taskRefs, nextRef.title);
      } else {
        setPendingTaskInsert(nextRef);
        referencedTaskIdsRef.current.add(nextRef.taskId);
        await syncConversationTaskContext([nextRef], nextRef.title);
      }
    },
    [createNewConversation, syncConversationTaskContext],
  );

  const requestTaskRemove = useCallback((taskId: string) => {
    composerRef.current?.removeRef(taskId);
    referencedTaskIdsRef.current.delete(taskId);
  }, []);

  const isTaskReferenced = useCallback((taskId: string) => {
    if (composerRef.current?.containsRef(taskId)) {
      return true;
    }
    return referencedTaskIdsRef.current.has(taskId);
  }, []);

  const persistMessage = useCallback(
    async (
      role: ChatMessage['role'],
      content: string,
      usedTools: string[] = [],
    ) => {
      const conversationId = await ensureActiveConversation();
      await addConversationMessage(conversationId, {
        role,
        content,
        usedTools,
      });
      await refreshConversations();
    },
    [ensureActiveConversation, refreshConversations],
  );

  const appendLocalMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  const updateLastAssistantMessage = useCallback(
    (content: string, usedTools: string[] = []) => {
      setMessages((current) => {
        if (current.length === 0) {
          return [{ role: 'assistant', content, usedTools }];
        }
        const next = [...current];
        const lastIndex = next.length - 1;
        const last = next[lastIndex];
        if (last?.role !== 'assistant') {
          next.push({ role: 'assistant', content, usedTools });
          return next;
        }
        next[lastIndex] = {
          ...last,
          content,
          usedTools: usedTools.length ? usedTools : last.usedTools,
        };
        return next;
      });
    },
    [],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
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
      renameActiveConversation,
      requestTaskInsert,
      requestTaskRemove,
      isTaskReferenced,
      registerComposer,
      ensureActiveConversation,
      persistMessage,
      appendLocalMessage,
      updateLastAssistantMessage,
      refreshConversations,
    }),
    [
      chatOpen,
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
      renameActiveConversation,
      requestTaskInsert,
      requestTaskRemove,
      isTaskReferenced,
      registerComposer,
      ensureActiveConversation,
      persistMessage,
      appendLocalMessage,
      updateLastAssistantMessage,
      refreshConversations,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}

export { WELCOME_MESSAGE };
