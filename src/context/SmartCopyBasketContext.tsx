import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  BATCH_SMART_COPY_MAX,
  copyTasksBatchSmartToClipboard,
  type TaskBatchSmartCopyItem,
  type TaskSmartCopyContext,
} from '../lib/taskCopy';
import type { Task } from '../types/todo';

export interface SmartCopyBasketEntry extends TaskBatchSmartCopyItem {
  addedAt: number;
}

type AddResult = 'added' | 'removed' | 'at_limit';

interface SmartCopyBasketContextValue {
  items: SmartCopyBasketEntry[];
  capMessage: string | null;
  isInBasket: (taskId: string) => boolean;
  /** Toggle: add if absent, remove if present. Blocks 6th with at_limit. */
  toggleTask: (task: Task, context: TaskSmartCopyContext) => AddResult;
  removeTask: (taskId: string) => void;
  clear: () => void;
  copyBatch: () => Promise<void>;
}

const SmartCopyBasketContext = createContext<SmartCopyBasketContextValue | null>(
  null,
);

export function SmartCopyBasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SmartCopyBasketEntry[]>([]);
  const [capMessage, setCapMessage] = useState<string | null>(null);
  const capTimerRef = useRef<number | null>(null);

  const showCapMessage = useCallback((message: string) => {
    setCapMessage(message);
    if (capTimerRef.current != null) {
      window.clearTimeout(capTimerRef.current);
    }
    capTimerRef.current = window.setTimeout(() => {
      setCapMessage(null);
      capTimerRef.current = null;
    }, 2500);
  }, []);

  const isInBasket = useCallback(
    (taskId: string) => items.some((item) => item.task.id === taskId),
    [items],
  );

  const removeTask = useCallback((taskId: string) => {
    setItems((current) => current.filter((item) => item.task.id !== taskId));
    setCapMessage(null);
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setCapMessage(null);
  }, []);

  const toggleTask = useCallback(
    (task: Task, context: TaskSmartCopyContext): AddResult => {
      const existing = items.find((item) => item.task.id === task.id);
      if (existing) {
        setItems((current) => current.filter((item) => item.task.id !== task.id));
        setCapMessage(null);
        return 'removed';
      }
      if (items.length >= BATCH_SMART_COPY_MAX) {
        showCapMessage(
          `Smart Copy batch is limited to ${BATCH_SMART_COPY_MAX} tasks`,
        );
        return 'at_limit';
      }
      setItems((current) => [
        ...current,
        {
          task,
          context: {
            ...context,
            subtasks: context.subtasks ? [...context.subtasks] : undefined,
          },
          addedAt: Date.now(),
        },
      ]);
      setCapMessage(null);
      return 'added';
    },
    [items, showCapMessage],
  );

  const copyBatch = useCallback(async () => {
    if (items.length === 0) return;
    await copyTasksBatchSmartToClipboard(items);
    setItems([]);
    setCapMessage(null);
  }, [items]);

  const value = useMemo<SmartCopyBasketContextValue>(
    () => ({
      items,
      capMessage,
      isInBasket,
      toggleTask,
      removeTask,
      clear,
      copyBatch,
    }),
    [items, capMessage, isInBasket, toggleTask, removeTask, clear, copyBatch],
  );

  return (
    <SmartCopyBasketContext.Provider value={value}>
      {children}
    </SmartCopyBasketContext.Provider>
  );
}

export function useSmartCopyBasket(): SmartCopyBasketContextValue {
  const context = useContext(SmartCopyBasketContext);
  if (!context) {
    throw new Error('useSmartCopyBasket must be used within SmartCopyBasketProvider');
  }
  return context;
}
