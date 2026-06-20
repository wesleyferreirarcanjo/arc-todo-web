import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import { useWorkspace } from './WorkspaceContext';
import type { Task, TaskWithContext } from '../types/todo';

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Hi! I can help you manage Arc Todo tasks. Ctrl+click a task card to add it as context, Shift+click to remove it.',
};

interface ChatContextValue {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  taskRefs: TaskRef[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  createNewConversation: () => Promise<string>;
  selectConversation: (conversationId: string) => Promise<void>;
  removeConversation: (conversationId: string) => Promise<void>;
  renameActiveConversation: (title: string) => Promise<void>;
  addTaskContext: (task: TaskContextInput) => Promise<void>;
  removeTaskContext: (taskId: string) => Promise<void>;
  isTaskInContext: (taskId: string) => boolean;
  ensureActiveConversation: () => Promise<string>;
  persistMessage: (
    role: ChatMessage['role'],
    content: string,
    usedTools?: string[],
  ) => Promise<void>;
  appendLocalMessage: (message: ChatMessage) => void;
  refreshConversations: () => Promise<void>;
  syncTaskRefs: (nextTaskRefs: TaskRef[]) => Promise<void>;
}

type TaskContextInput = TaskWithContext | (Task & {
  organization: { id: string };
  project: { id: string };
});

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
  const { currentOrgId, currentProjectId } = useWorkspace();
  const [chatOpen, setChatOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [taskRefs, setTaskRefs] = useState<TaskRef[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const refreshConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const next = await listConversations({
        organizationId: currentOrgId ?? undefined,
        projectId: currentProjectId ?? undefined,
      });
      setConversations(next);
    } finally {
      setLoadingConversations(false);
    }
  }, [currentOrgId, currentProjectId]);

  const loadConversationDetail = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const detail = await getConversation(conversationId);
      setMessages(toChatMessages(detail));
      setTaskRefs(detail.taskRefs);
      setActiveConversationId(conversationId);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoadingConversations(true);
      try {
        const next = await listConversations({
          organizationId: currentOrgId ?? undefined,
          projectId: currentProjectId ?? undefined,
        });
        if (cancelled) return;

        setConversations(next);
        if (next.length > 0) {
          await loadConversationDetail(next[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([WELCOME_MESSAGE]);
          setTaskRefs([]);
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
  }, [currentOrgId, currentProjectId, loadConversationDetail]);

  const createNewConversation = useCallback(async () => {
    const created = await createConversation({
      organizationId: currentOrgId ?? undefined,
      projectId: currentProjectId ?? undefined,
    });
    setConversations((current) => [created, ...current]);
    setActiveConversationId(created.id);
    setMessages([WELCOME_MESSAGE]);
    setTaskRefs([]);
    return created.id;
  }, [currentOrgId, currentProjectId]);

  const ensureActiveConversation = useCallback(async () => {
    if (activeConversationId) {
      return activeConversationId;
    }
    return createNewConversation();
  }, [activeConversationId, createNewConversation]);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (conversationId === activeConversationId) {
        return;
      }
      await loadConversationDetail(conversationId);
    },
    [activeConversationId, loadConversationDetail],
  );

  const removeConversation = useCallback(
    async (conversationId: string) => {
      await deleteConversation(conversationId);

      let nextConversationId: string | null = null;

      setConversations((current) => {
        const remaining = current.filter(
          (conversation) => conversation.id !== conversationId,
        );

        setActiveConversationId((activeId) => {
          if (activeId !== conversationId) {
            return activeId;
          }

          if (remaining.length > 0) {
            nextConversationId = remaining[0].id;
            return remaining[0].id;
          }

          setMessages([WELCOME_MESSAGE]);
          setTaskRefs([]);
          return null;
        });

        return remaining;
      });

      if (nextConversationId) {
        await loadConversationDetail(nextConversationId);
      }
    },
    [loadConversationDetail],
  );

  const renameActiveConversation = useCallback(
    async (title: string) => {
      if (!activeConversationId) {
        return;
      }

      const updated = await updateConversation(activeConversationId, {
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
    [activeConversationId],
  );

  const syncTaskRefs = useCallback(
    async (nextTaskRefs: TaskRef[]) => {
      const conversationId = await ensureActiveConversation();
      const updated = await updateConversation(conversationId, {
        taskRefs: nextTaskRefs,
      });
      setTaskRefs(updated.taskRefs);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === updated.id
            ? { ...conversation, updatedAt: updated.updatedAt }
            : conversation,
        ),
      );
    },
    [ensureActiveConversation],
  );

  const addTaskContext = useCallback(
    async (task: TaskContextInput) => {
      const nextRef = toTaskRef(task);
      const conversationId = await ensureActiveConversation();
      const detail = await getConversation(conversationId);

      if (detail.taskRefs.some((ref) => ref.taskId === nextRef.taskId)) {
        setActiveConversationId(conversationId);
        setTaskRefs(detail.taskRefs);
        setChatOpen(true);
        return;
      }

      const nextTaskRefs = [...detail.taskRefs, nextRef];
      await syncTaskRefs(nextTaskRefs);
      setChatOpen(true);
    },
    [ensureActiveConversation, syncTaskRefs],
  );

  const removeTaskContext = useCallback(
    async (taskId: string) => {
      if (!activeConversationId) {
        return;
      }

      const nextTaskRefs = taskRefs.filter((ref) => ref.taskId !== taskId);
      await syncTaskRefs(nextTaskRefs);
    },
    [activeConversationId, syncTaskRefs, taskRefs],
  );

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

  const isTaskInContext = useCallback(
    (taskId: string) => taskRefs.some((ref) => ref.taskId === taskId),
    [taskRefs],
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
      taskRefs,
      loadingConversations,
      loadingMessages,
      createNewConversation,
      selectConversation,
      removeConversation,
      renameActiveConversation,
      addTaskContext,
      removeTaskContext,
      isTaskInContext,
      ensureActiveConversation,
      persistMessage,
      appendLocalMessage,
      refreshConversations,
      syncTaskRefs,
    }),
    [
      chatOpen,
      conversations,
      activeConversationId,
      messages,
      taskRefs,
      loadingConversations,
      loadingMessages,
      createNewConversation,
      selectConversation,
      removeConversation,
      renameActiveConversation,
      addTaskContext,
      removeTaskContext,
      isTaskInContext,
      ensureActiveConversation,
      persistMessage,
      appendLocalMessage,
      refreshConversations,
      syncTaskRefs,
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
