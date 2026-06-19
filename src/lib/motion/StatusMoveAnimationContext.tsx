import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DURATION_BASE } from './variants';

interface StatusMoveAnimationContextValue {
  markStatusMove: (taskId: string) => void;
  shouldAnimateStatusMove: (taskId: string) => boolean;
}

const StatusMoveAnimationContext = createContext<StatusMoveAnimationContextValue | null>(
  null,
);

export function StatusMoveAnimationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [animatingTaskIds, setAnimatingTaskIds] = useState<Set<string>>(
    () => new Set(),
  );

  const markStatusMove = useCallback((taskId: string) => {
    setAnimatingTaskIds((current) => new Set(current).add(taskId));

    window.setTimeout(() => {
      setAnimatingTaskIds((current) => {
        if (!current.has(taskId)) return current;
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }, DURATION_BASE * 1000 + 50);
  }, []);

  const shouldAnimateStatusMove = useCallback(
    (taskId: string) => animatingTaskIds.has(taskId),
    [animatingTaskIds],
  );

  const value = useMemo(
    () => ({ markStatusMove, shouldAnimateStatusMove }),
    [markStatusMove, shouldAnimateStatusMove],
  );

  return (
    <StatusMoveAnimationContext.Provider value={value}>
      {children}
    </StatusMoveAnimationContext.Provider>
  );
}

export function useStatusMoveAnimation() {
  const context = useContext(StatusMoveAnimationContext);
  if (!context) {
    throw new Error('useStatusMoveAnimation must be used within StatusMoveAnimationProvider');
  }
  return context;
}
