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
import type { MobileQuickCreateScope } from '../components/MobileQuickCreateSheet';

export interface BoardMobileShellActions {
  onCreated: () => Promise<void>;
  scope?: MobileQuickCreateScope;
  openFilters: () => void;
}

interface BoardMobileShellContextValue {
  actions: BoardMobileShellActions | null;
  registerActions: (actions: BoardMobileShellActions | null) => void;
}

const BoardMobileShellContext = createContext<BoardMobileShellContextValue | null>(
  null,
);

export function BoardMobileShellProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<BoardMobileShellActions | null>(null);

  const registerActions = useCallback((next: BoardMobileShellActions | null) => {
    setActions(next);
  }, []);

  const value = useMemo(
    () => ({ actions, registerActions }),
    [actions, registerActions],
  );

  return (
    <BoardMobileShellContext.Provider value={value}>
      {children}
    </BoardMobileShellContext.Provider>
  );
}

export function useBoardMobileShell() {
  const ctx = useContext(BoardMobileShellContext);
  if (!ctx) {
    throw new Error('useBoardMobileShell must be used within BoardMobileShellProvider');
  }
  return ctx;
}

/** Board page registers create/filter hooks for the shell FAB. */
export function useRegisterBoardMobileActions(
  actions: BoardMobileShellActions | null,
) {
  const { registerActions } = useBoardMobileShell();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const onCreated = actions?.onCreated;
  const openFilters = actions?.openFilters;
  const scopeOrg = actions?.scope?.organizationId;
  const scopeProject = actions?.scope?.projectId;

  useEffect(() => {
    if (!onCreated || !openFilters) {
      registerActions(null);
      return () => registerActions(null);
    }

    registerActions({
      onCreated: () => actionsRef.current!.onCreated(),
      openFilters: () => actionsRef.current!.openFilters(),
      scope:
        scopeOrg && scopeProject
          ? { organizationId: scopeOrg, projectId: scopeProject }
          : undefined,
    });

    return () => registerActions(null);
  }, [onCreated, openFilters, scopeOrg, scopeProject, registerActions]);
}
