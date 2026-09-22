import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  copyTasksBatchSmartToClipboard,
  type TaskBatchSmartCopyItem,
  type TaskSmartCopyContext,
} from '../lib/taskCopy';
import type { Task } from '../types/todo';

export interface SmartCopyBasketEntry extends TaskBatchSmartCopyItem {
  addedAt: number;
}

type AddResult = 'added' | 'removed';

interface SmartCopyBasketContextValue {
  items: SmartCopyBasketEntry[];
  isInBasket: (taskId: string) => boolean;
  /** Toggle: add if absent, remove if present. */
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

  const isInBasket = useCallback(
    (taskId: string) => items.some((item) => item.task.id === taskId),
    [items],
  );

  const removeTask = useCallback((taskId: string) => {
    setItems((current) => current.filter((item) => item.task.id !== taskId));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const toggleTask = useCallback(
    (task: Task, context: TaskSmartCopyContext): AddResult => {
      const existing = items.find((item) => item.task.id === task.id);
      if (existing) {
        setItems((current) => current.filter((item) => item.task.id !== task.id));
        return 'removed';
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
      return 'added';
    },
    [items],
  );

  const copyBatch = useCallback(async () => {
    if (items.length === 0) return;
    await copyTasksBatchSmartToClipboard(items);
    setItems([]);
  }, [items]);

  const value = useMemo<SmartCopyBasketContextValue>(
    () => ({
      items,
      isInBasket,
      toggleTask,
      removeTask,
      clear,
      copyBatch,
    }),
    [items, isInBasket, toggleTask, removeTask, clear, copyBatch],
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
