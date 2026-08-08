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
import type { StatusColumn } from '../lib/tasks/taskStatus';
import type { TaskStatus } from '../types/todo';

export interface BoardMobileShellActions {
  onCreated: () => Promise<void>;
  scope?: MobileQuickCreateScope;
  openFilters: () => void;
}

/** Status tabs hosted in the Bottom App Bar (mobile tabbed board only). */
export interface BoardMobileStatusTabs {
  columns: StatusColumn[];
  activeStatus: TaskStatus;
  counts: Partial<Record<TaskStatus, number>>;
  onChange: (status: TaskStatus) => void;
}

interface BoardMobileShellContextValue {
  actions: BoardMobileShellActions | null;
  registerActions: (actions: BoardMobileShellActions | null) => void;
  statusTabs: BoardMobileStatusTabs | null;
  registerStatusTabs: (tabs: BoardMobileStatusTabs | null) => void;
}

const BoardMobileShellContext = createContext<BoardMobileShellContextValue | null>(
  null,
);

export function BoardMobileShellProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<BoardMobileShellActions | null>(null);
  const [statusTabs, setStatusTabs] = useState<BoardMobileStatusTabs | null>(null);

  const registerActions = useCallback((next: BoardMobileShellActions | null) => {
    setActions(next);
  }, []);

  const registerStatusTabs = useCallback((next: BoardMobileStatusTabs | null) => {
    setStatusTabs(next);
  }, []);

  const value = useMemo(
    () => ({ actions, registerActions, statusTabs, registerStatusTabs }),
    [actions, registerActions, statusTabs, registerStatusTabs],
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

/** Tabbed board registers status steps for the Bottom App Bar toolbar. */
export function useRegisterBoardMobileStatusTabs(
  tabs: BoardMobileStatusTabs | null,
) {
  const { registerStatusTabs } = useBoardMobileShell();
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const activeStatus = tabs?.activeStatus;
  const columnsKey = tabs?.columns.map((c) => c.status).join(',') ?? '';
  const countsKey = tabs
    ? tabs.columns.map((c) => `${c.status}:${tabs.counts[c.status] ?? 0}`).join(',')
    : '';

  useEffect(() => {
    if (!tabs || !activeStatus) {
      registerStatusTabs(null);
      return () => registerStatusTabs(null);
    }

    registerStatusTabs({
      columns: tabsRef.current!.columns,
      activeStatus,
      counts: tabsRef.current!.counts,
      onChange: (status) => tabsRef.current!.onChange(status),
    });

    return () => registerStatusTabs(null);
    // tabs object identity changes every render; use stable keys above.
  }, [activeStatus, columnsKey, countsKey, registerStatusTabs, tabs]);
}
