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

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Hi! I can help you manage Arc Todo tasks. Ctrl+click a task card to insert a task reference in your message.',
};

interface ChatContextValue {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  pendingTaskInsert: TaskRef | null;
  clearPendingTaskInsert: () => void;
  createNewConversation: () => Promise<string>;
  selectConversation: (conversationId: string) => Promise<void>;
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
  refreshConversations: () => Promise<void>;
}

type TaskContextInput = TaskWithContext | (Task & {
  organization: { id: string };
  project: { id: string };
});

type ComposerRegistration = {
  insertRef: (ref: TaskRef) => void;
  removeRef: (taskId: string) => void;
  containsRef: (taskId: string) => boolean;
};

const ChatContext = createContext<ChatContextValue | null>(null);

function toChatMessages(detail: ConversationDetail): ChatMessage[] {
  if (detail.messages.length === 0) {
    return [WELCOME_MESSAGE];
  }

  return detail.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function toTaskRef(task: TaskContextInput): TaskRef {
  return {
    taskId: task.id,
    organizationId: task.organization.id,
    projectId: task.project.id,
    title: task.title,
  };
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
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

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const refreshConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const next = await listConversations();
      setConversations(next);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadConversationDetail = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const detail = await getConversation(conversationId);
      setMessages(toChatMessages(detail));
      setActiveConversationId(conversationId);
      activeConversationIdRef.current = conversationId;
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoadingConversations(true);
      try {
        const next = await listConversations();
        if (cancelled) return;

        setConversations(next);
        if (next.length > 0) {
          const preferredId = activeConversationIdRef.current;
          const initialId =
            preferredId && next.some((conversation) => conversation.id === preferredId)
              ? preferredId
              : next[0].id;

          try {
            await loadConversationDetail(initialId);
          } catch {
            const fallbackId = next.find(
              (conversation) => conversation.id !== initialId,
            )?.id;
            if (fallbackId) {
              await loadConversationDetail(fallbackId);
            } else {
              setActiveConversationId(null);
              activeConversationIdRef.current = null;
              setMessages([WELCOME_MESSAGE]);
            }
          }
        } else {
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

  const createNewConversation = useCallback(async () => {
    const created = await createConversation({});
    setConversations((current) => [created, ...current]);
    setActiveConversationId(created.id);
    activeConversationIdRef.current = created.id;
    setMessages([WELCOME_MESSAGE]);
    return created.id;
  }, []);

  const ensureActiveConversation = useCallback(async () => {
    const currentId = activeConversationIdRef.current;
    if (currentId) {
      return currentId;
    }
    return createNewConversation();
  }, [createNewConversation]);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (conversationId === activeConversationIdRef.current) {
        return;
      }
      await loadConversationDetail(conversationId);
    },
    [loadConversationDetail],
  );

  const removeConversation = useCallback(
    async (conversationId: string) => {
      await deleteConversation(conversationId);

      const wasActive = activeConversationIdRef.current === conversationId;
      let nextActiveId: string | null = null;

      setConversations((current) => {
        const remaining = current.filter(
          (conversation) => conversation.id !== conversationId,
        );

        if (wasActive) {
          nextActiveId = remaining.length > 0 ? remaining[0].id : null;
        }

        return remaining;
      });

      if (!wasActive) {
        return;
      }

      if (nextActiveId) {
        await loadConversationDetail(nextActiveId);
        return;
      }

      setActiveConversationId(null);
      activeConversationIdRef.current = null;
      setMessages([WELCOME_MESSAGE]);
    },
    [loadConversationDetail],
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
      } else {
        setPendingTaskInsert(nextRef);
        referencedTaskIdsRef.current.add(nextRef.taskId);
      }
    },
    [createNewConversation],
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

  const value = useMemo<ChatContextValue>(
    () => ({
      chatOpen,
      setChatOpen,
      conversations,
      activeConversationId,
      messages,
      loadingConversations,
      loadingMessages,
      pendingTaskInsert,
      clearPendingTaskInsert,
      createNewConversation,
      selectConversation,
      removeConversation,
      renameActiveConversation,
      requestTaskInsert,
      requestTaskRemove,
      isTaskReferenced,
      registerComposer,
      ensureActiveConversation,
      persistMessage,
      appendLocalMessage,
      refreshConversations,
    }),
    [
      chatOpen,
      conversations,
      activeConversationId,
      messages,
      loadingConversations,
      loadingMessages,
      pendingTaskInsert,
      clearPendingTaskInsert,
      createNewConversation,
      selectConversation,
      removeConversation,
      renameActiveConversation,
      requestTaskInsert,
      requestTaskRemove,
      isTaskReferenced,
      registerComposer,
      ensureActiveConversation,
      persistMessage,
      appendLocalMessage,
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
