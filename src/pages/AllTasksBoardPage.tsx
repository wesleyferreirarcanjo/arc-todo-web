import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { advanceBoardCycle, fetchBoardCycleHistory, fetchCurrentBoardCycle } from '../lib/api/boardCycles';
import {
  createProjectTask,
  deleteProjectTask,
  fetchAllTasks,
  resolveTaskByIdentifier,
  updateProjectTask,
} from '../lib/api/todos';
import { TaskDetailsModal } from '../components/TaskDetailsModal';
import { collectDescendantIds } from '../lib/tasks/taskTree';
import { filterTasksByCriticity, filterTasksBySearch, getTaskSearchRank, normalizeTaskSearchQuery } from '../lib/tasks/taskSearch';
import {
  filterTasksByQuickFilter,
  type BoardQuickFilter,
} from '../lib/tasks/taskQuickFilter';
import {
  sortTasks,
  type TaskSortDirection,
  type TaskSortField,
} from '../lib/tasks/taskSort';
import { canHideColumn } from '../lib/tasks/taskStatus';
import {
  getBoardQuickFilter,
  getBoardTaskSort,
  getBoardViewMode,
  getHiddenBoardColumns,
  setBoardQuickFilter,
  setBoardTaskSort,
  setBoardViewMode,
  setHiddenBoardColumns,
  setLastOrganizationId,
  setLastProjectId,
} from '../lib/storage/appStorage';
import { getProjectColor } from '../lib/color/entityColor';
import { BoardCycleHeader } from '../components/BoardCycleHeader';
import { BoardCycleHistoryPanel } from '../components/BoardCycleHistory';
import { BoardFiltersControls } from '../components/BoardFiltersControls';
import { BoardQuickFilterChips } from '../components/BoardQuickFilterChips';
import { QaQueueBulkBar } from '../components/QaQueueBulkBar';
import { QaQueueCountChip } from '../components/QaQueueCountChip';
import { MobileBoardFiltersOverlay } from '../components/MobileBoardFiltersOverlay';
import { TaskListView } from '../components/TaskListView';
import { TaskBoard } from '../components/TaskBoard';
import { UnifiedTaskBoard } from '../components/UnifiedTaskBoard';
import { TaskQaMultiChecklistModal } from '../components/TaskQaMultiChecklistModal';
import { TasksIcon } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { useRegisterBoardMobileActions } from '../context/BoardMobileShellContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { SHELL_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useQaQueueBoard } from '../hooks/useQaQueueBoard';
import { selectedTasksFromIds } from '../lib/qaQueue/selection';
import { parseQaChecklistItems } from '../lib/tasks/taskQaChecklist';
import type { BoardCycle, BoardCycleHistoryResponse } from '../types/boardCycle';
import type {
  CreateTaskInput,
  ListTasksQuery,
  Task,
  TaskCriticity,
  TaskStatus,
  TaskWithContext,
  UpdateTaskInput,
} from '../types/todo';

function addMovingTaskId(current: Set<string>, taskId: string): Set<string> {
  return new Set(current).add(taskId);
}

function removeMovingTaskId(current: Set<string>, taskId: string): Set<string> {
  const next = new Set(current);
  next.delete(taskId);
  return next;
}

type BoardChromePanel = 'filters' | 'cycle' | 'history' | null;

function toggleBoardChrome(
  current: BoardChromePanel,
  next: Exclude<BoardChromePanel, null>,
): BoardChromePanel {
  return current === next ? null : next;
}

export function AllTasksBoardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { organizations, projects, refreshProjects } = useWorkspace();
  const isMobileShell = useMediaQuery(SHELL_MOBILE_QUERY);
  const [tasks, setTasks] = useState<TaskWithContext[]>([]);
  const [cycleTasks, setCycleTasks] = useState<Task[]>([]);
  const [activeCycle, setActiveCycle] = useState<BoardCycle | null>(null);
  const [autoClosesOn, setAutoClosesOn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(getBoardViewMode);
  const [hiddenColumns, setHiddenColumns] = useState<TaskStatus[]>(getHiddenBoardColumns);
  const [movingTaskIds, setMovingTaskIds] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskCriticity | ''>('');
  const [sortField, setSortField] = useState<TaskSortField>(() => getBoardTaskSort().field);
  const [sortDirection, setSortDirection] = useState<TaskSortDirection>(
    () => getBoardTaskSort().direction,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [chromePanel, setChromePanel] = useState<BoardChromePanel>(null);
  const [cycleHistory, setCycleHistory] = useState<BoardCycleHistoryResponse>({
    cycles: [],
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [quickFilter, setQuickFilter] = useState<BoardQuickFilter>(() => {
    const stored = getBoardQuickFilter();
    if (stored !== 'all') return stored;
    // Migrate legacy URL ?createdByMe=true into the My Tasks chip once.
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('createdByMe') === 'true') return 'mine';
    }
    return 'all';
  });
  const [deepLinkTask, setDeepLinkTask] = useState<{
    task: Task;
    organizationId: string;
    projectId: string;
    organizationName?: string;
    projectName?: string;
    subtasks: Task[];
  } | null>(null);
  const [checklistsOpen, setChecklistsOpen] = useState(false);

  const organizationId = searchParams.get('organizationId') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;
  const taskParam = searchParams.get('task') ?? undefined;
  const projectFocus = Boolean(organizationId && projectId);

  const query = useMemo<ListTasksQuery>(
    () => ({
      organizationId,
      projectId,
    }),
    [organizationId, projectId],
  );

  const hasFilters = Boolean(organizationId || projectId);
  const focusedProject = projects.find((project) => project.id === projectId);

  const loadTasks = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchAllTasks(query);
      setTasks(data);
      if (silent) setError(null);
    } catch (err) {
      if (!silent) setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'tasks' }));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [query]);

  const loadProjectCycle = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!organizationId || !projectId) {
        return;
      }

      const silent = options?.silent ?? false;
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const current = await fetchCurrentBoardCycle(organizationId, projectId);
        setActiveCycle(current.cycle);
        setAutoClosesOn(current.autoClosesOn);
        setCycleTasks(current.tasks);
        if (!silent) setHistoryLoading(true);
        try {
          setCycleHistory(await fetchBoardCycleHistory(organizationId, projectId));
        } catch {
          if (!silent) setCycleHistory({ cycles: [] });
        } finally {
          if (!silent) setHistoryLoading(false);
        }
        if (silent) setError(null);
      } catch (err) {
        if (!silent) setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'the weekly cycle' }));
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [organizationId, projectId],
  );

  useEffect(() => {
    if (projectFocus) {
      void loadProjectCycle();
      return;
    }
    setActiveCycle(null);
    setAutoClosesOn(null);
    setCycleTasks([]);
    setCycleHistory({ cycles: [] });
    setChromePanel((current) =>
      current === 'cycle' || current === 'history' ? null : current,
    );
    void loadTasks();
  }, [projectFocus, loadProjectCycle, loadTasks]);

  useEffect(() => {
    const refresh = projectFocus
      ? () => loadProjectCycle({ silent: true })
      : () => loadTasks({ silent: true });
    const id = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(id);
  }, [projectFocus, loadProjectCycle, loadTasks]);

  useEffect(() => {
    if (organizationId) {
      void refreshProjects(organizationId);
    }
  }, [organizationId, refreshProjects]);

  useEffect(() => {
    // Drop legacy createdByMe query once chips own My Tasks.
    if (searchParams.get('createdByMe') === 'true') {
      const params = new URLSearchParams(searchParams);
      params.delete('createdByMe');
      setSearchParams(params, { replace: true });
      if (quickFilter === 'all') {
        setQuickFilter('mine');
        setBoardQuickFilter('mine');
      }
    }
  }, [searchParams, setSearchParams, quickFilter]);

  useEffect(() => {
    if (!taskParam) {
      setDeepLinkTask(null);
      return;
    }
    if (loading) {
      return;
    }

    let cancelled = false;

    async function openDeepLinkedTask() {
      const source = projectFocus ? cycleTasks : tasks;
      const found = source.find((task) => task.id === taskParam);
      if (found) {
        const subtasks = source.filter((task) => task.parentTaskId === found.id);
        if (!projectFocus && 'organization' in found && 'project' in found) {
          const withContext = found as TaskWithContext;
          if (!cancelled) {
            setDeepLinkTask({
              task: withContext,
              organizationId: withContext.organization.id,
              projectId: withContext.project.id,
              organizationName: withContext.organization.name,
              projectName: withContext.project.name,
              subtasks,
            });
          }
          return;
        }
        if (projectFocus && organizationId && projectId) {
          if (!cancelled) {
            setDeepLinkTask({
              task: found,
              organizationId,
              projectId,
              organizationName: organizations.find((org) => org.id === organizationId)
                ?.name,
              projectName: focusedProject?.name,
              subtasks,
            });
          }
          return;
        }
      }

      try {
        const resolved = await resolveTaskByIdentifier(taskParam!);
        if (cancelled) return;
        setDeepLinkTask({
          task: resolved.task,
          organizationId: resolved.organizationId,
          projectId: resolved.projectId,
          subtasks: [],
        });
      } catch {
        if (!cancelled) {
          setDeepLinkTask(null);
        }
      }
    }

    void openDeepLinkedTask();
    return () => {
      cancelled = true;
    };
  }, [
    taskParam,
    loading,
    tasks,
    cycleTasks,
    projectFocus,
    organizationId,
    projectId,
    organizations,
    focusedProject?.name,
  ]);

  function closeDeepLinkedTask() {
    setDeepLinkTask(null);
    const params = new URLSearchParams(searchParams);
    params.delete('task');
    setSearchParams(params, { replace: true });
  }

  function updateFilters(nextOrgId?: string, nextProjectId?: string) {
    const params = new URLSearchParams();
    if (nextOrgId) {
      params.set('organizationId', nextOrgId);
      setLastOrganizationId(nextOrgId);
    }
    if (nextProjectId) {
      params.set('projectId', nextProjectId);
      setLastProjectId(nextProjectId);
    }
    setSearchParams(params);
  }

  function handleOrganizationChange(nextOrgId: string) {
    if (nextOrgId) {
      updateFilters(nextOrgId, undefined);
    } else {
      setSearchParams(new URLSearchParams());
    }
  }

  function handleProjectChange(nextProjectId: string) {
    if (nextProjectId && organizationId) {
      updateFilters(organizationId, nextProjectId);
    } else if (organizationId) {
      updateFilters(organizationId);
    }
  }

  function handleQuickFilterChange(next: BoardQuickFilter) {
    setQuickFilter(next);
    setBoardQuickFilter(next);
  }

  const refreshBoard = useCallback(async () => {
    if (projectFocus) {
      await loadProjectCycle({ silent: true });
    } else {
      await loadTasks({ silent: true });
    }
  }, [projectFocus, loadProjectCycle, loadTasks]);

  useEffect(() => {
    if (isMobileShell && chromePanel === 'filters') {
      setChromePanel(null);
    }
  }, [isMobileShell, chromePanel]);

  const openFilters = useCallback(() => {
    setFiltersOpen(true);
  }, []);

  useRegisterBoardMobileActions({
    onCreated: refreshBoard,
    openFilters,
    scope:
      projectFocus && organizationId && projectId
        ? { organizationId, projectId }
        : undefined,
  });

  async function handleAdvanceCycle() {
    if (!organizationId || !projectId) return;
    setAdvancing(true);
    setError(null);
    try {
      await advanceBoardCycle(organizationId, projectId);
      await loadProjectCycle({ silent: true });
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'the weekly cycle' }));
    } finally {
      setAdvancing(false);
    }
  }

  async function handleUpdate(
    task: TaskWithContext,
    input: Partial<UpdateTaskInput>,
    replaced?: TaskWithContext,
  ) {
    if (replaced) {
      await loadTasks({ silent: true });
      return;
    }

    if (input.status !== undefined && input.status !== task.status) {
      const previousStatus = task.status;
      setMovingTaskIds((current) => addMovingTaskId(current, task.id));
      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id ? { ...item, status: input.status! } : item,
        ),
      );
      try {
        await updateProjectTask(
          task.organization.id,
          task.project.id,
          task.id,
          input,
        );
        await loadTasks({ silent: true });
      } catch (err) {
        setTasks((prev) =>
          prev.map((item) =>
            item.id === task.id ? { ...item, status: previousStatus } : item,
          ),
        );
        setError(userMessage(err, WEB_ERROR.MOVE, { thing: 'this task' }));
      } finally {
        setMovingTaskIds((current) => removeMovingTaskId(current, task.id));
      }
      return;
    }

    const updated = await updateProjectTask(
      task.organization.id,
      task.project.id,
      task.id,
      input,
    );
    if (input.parentTaskId !== undefined || input.isBug !== undefined) {
      await loadTasks({ silent: true });
      return;
    }
    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? {
              ...item,
              ...updated,
              project: item.project,
              organization: item.organization,
            }
          : item,
      ),
    );
  }

  async function handleCycleUpdate(
    taskId: string,
    input: Partial<UpdateTaskInput>,
  ) {
    if (!organizationId || !projectId) return;

    if (input.status !== undefined) {
      const task = cycleTasks.find((item) => item.id === taskId);
      if (!task || task.status === input.status) return;

      const previousStatus = task.status;
      setMovingTaskIds((current) => addMovingTaskId(current, taskId));
      setCycleTasks((prev) =>
        prev.map((item) =>
          item.id === taskId ? { ...item, status: input.status! } : item,
        ),
      );
      try {
        await updateProjectTask(organizationId, projectId, taskId, input);
        await loadProjectCycle({ silent: true });
      } catch (err) {
        setCycleTasks((prev) =>
          prev.map((item) =>
            item.id === taskId ? { ...item, status: previousStatus } : item,
          ),
        );
        setError(userMessage(err, WEB_ERROR.MOVE, { thing: 'this task' }));
      } finally {
        setMovingTaskIds((current) => removeMovingTaskId(current, taskId));
      }
      return;
    }

    await updateProjectTask(organizationId, projectId, taskId, input);
    await loadProjectCycle({ silent: true });
  }

  function handleMoveError(err?: unknown) {
    setError(userMessage(err, WEB_ERROR.MOVE, { thing: 'this task' }));
  }

  function handleViewModeChange(mode: 'board' | 'list') {
    setViewMode(mode);
    setBoardViewMode(mode);
    if (isMobileShell) {
      setFiltersOpen(false);
    }
  }

  function handleHiddenColumnsChange(nextHidden: TaskStatus[]) {
    setHiddenColumns(nextHidden);
    setHiddenBoardColumns(nextHidden);
  }

  function handleToggleColumnVisibility(status: TaskStatus) {
    const hiddenSet = new Set(hiddenColumns);
    if (hiddenSet.has(status)) {
      handleHiddenColumnsChange(hiddenColumns.filter((item) => item !== status));
      return;
    }
    if (!canHideColumn(status, hiddenColumns)) return;
    handleHiddenColumnsChange([...hiddenColumns, status]);
  }

  async function handleListStatusUpdate(
    task: Task | TaskWithContext,
    status: TaskStatus,
  ) {
    if (projectFocus && organizationId && projectId) {
      await handleCycleUpdate(task.id, { status });
      return;
    }
    if (isTaskWithContext(task)) {
      await handleUpdate(task, { status });
    }
  }

  function isTaskWithContext(task: Task | TaskWithContext): task is TaskWithContext {
    return 'organization' in task && 'project' in task;
  }

  async function handleSetParent(
    task: TaskWithContext,
    parentId: string | null,
  ) {
    await updateProjectTask(task.organization.id, task.project.id, task.id, {
      parentTaskId: parentId,
    });
    await loadTasks({ silent: true });
  }

  async function handleCycleSetParent(taskId: string, parentId: string | null) {
    if (!organizationId || !projectId) return;
    await updateProjectTask(organizationId, projectId, taskId, {
      parentTaskId: parentId,
    });
    await loadProjectCycle({ silent: true });
  }

  async function handleCreateSubtask(
    task: TaskWithContext,
    input: CreateTaskInput,
  ) {
    await createProjectTask(task.organization.id, task.project.id, {
      ...input,
      parentTaskId: task.id,
    });
    await loadTasks({ silent: true });
  }

  async function handleCycleCreateSubtask(
    parentId: string,
    input: CreateTaskInput,
  ) {
    if (!organizationId || !projectId) return;
    await createProjectTask(organizationId, projectId, {
      ...input,
      parentTaskId: parentId,
    });
    await loadProjectCycle({ silent: true });
  }

  async function handleDelete(task: TaskWithContext) {
    await deleteProjectTask(task.organization.id, task.project.id, task.id);
    const removeIds = new Set(collectDescendantIds(tasks, task.id));
    setTasks((prev) => prev.filter((item) => !removeIds.has(item.id)));
  }

  async function handleCycleDelete(taskId: string) {
    if (!organizationId || !projectId) return;
    await deleteProjectTask(organizationId, projectId, taskId);
    await loadProjectCycle({ silent: true });
  }

  const searchActive = normalizeTaskSearchQuery(searchQuery).length > 0;
  const priorityActive = priorityFilter !== '';
  const quickFilterActive = quickFilter !== 'all';
  const listFiltersActive = searchActive || priorityActive || quickFilterActive;

  const filteredTasks = useMemo(() => {
    const byPriority = filterTasksByCriticity(tasks, priorityFilter);
    const bySearch = filterTasksBySearch(byPriority, searchQuery, (task) => ({
      orgName: task.organization.name,
      projectName: task.project.name,
    }));
    return filterTasksByQuickFilter(bySearch, quickFilter, user?.id);
  }, [tasks, searchQuery, priorityFilter, quickFilter, user?.id]);

  const filteredCycleTasks = useMemo(() => {
    const byPriority = filterTasksByCriticity(cycleTasks, priorityFilter);
    const bySearch = filterTasksBySearch(byPriority, searchQuery);
    return filterTasksByQuickFilter(bySearch, quickFilter, user?.id);
  }, [cycleTasks, searchQuery, priorityFilter, quickFilter, user?.id]);

  const sortedTasks = useMemo(
    () =>
      sortTasks(filteredTasks, sortField, sortDirection, (task) => ({
        projectName: task.project.name,
      })),
    [filteredTasks, sortField, sortDirection],
  );

  const sortedCycleTasks = useMemo(() => {
    const projectName = focusedProject?.name;
    return sortTasks(filteredCycleTasks, sortField, sortDirection, () =>
      projectName ? { projectName } : undefined,
    );
  }, [filteredCycleTasks, sortField, sortDirection, focusedProject?.name]);

  const visibleTasks = projectFocus ? sortedCycleTasks : sortedTasks;
  const sourceTaskCount = projectFocus ? cycleTasks.length : tasks.length;
  const qaQueueTasks = projectFocus ? cycleTasks : tasks;
  const {
    queueCount,
    selectedTaskIds,
    selectedCount,
    selectableCount,
    allSelected,
    mixedProjects,
    sending,
    sendError,
    replaceOpen,
    toggleSelect,
    selectAll,
    clearSelection,
    sendSelected,
    sendOne,
    confirmReplace,
    cancelReplace,
  } = useQaQueueBoard(qaQueueTasks);
  const selectedTasks = selectedTasksFromIds(qaQueueTasks, selectedTaskIds);
  const selectedHaveChecklists = selectedTasks.some(
    (task) => parseQaChecklistItems(task.testDescription).length > 0,
  );

  function handleSortFieldChange(value: string) {
    const field = value as TaskSortField;
    setSortField(field);
    setBoardTaskSort({ field, direction: sortDirection });
  }

  function handleSortDirectionChange(value: string) {
    const direction = value as TaskSortDirection;
    setSortDirection(direction);
    setBoardTaskSort({ field: sortField, direction });
  }

  const extraFilterCount =
    Number(searchActive) +
    Number(priorityActive) +
    Number(Boolean(organizationId)) +
    Number(Boolean(projectId));

  const showFiltersButton = !isMobileShell;
  const showCycleButton = Boolean(projectFocus && activeCycle && autoClosesOn);
  const showHistoryButton = projectFocus;
  const showChromeActions = showFiltersButton || showCycleButton || showHistoryButton;

  const topLevelCount = visibleTasks.filter((task) => !task.parentTaskId).length;

  function renderFilterControls(showQuickCreate: boolean) {
    return (
      <BoardFiltersControls
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        sortField={sortField}
        onSortFieldChange={handleSortFieldChange}
        sortDirection={sortDirection}
        onSortDirectionChange={handleSortDirectionChange}
        organizationId={organizationId ?? null}
        projectId={projectId ?? null}
        organizations={organizations}
        projects={projects}
        onOrganizationChange={handleOrganizationChange}
        onProjectChange={handleProjectChange}
        quickFilter={quickFilter}
        onQuickFilterChange={handleQuickFilterChange}
        hasFilters={hasFilters}
        onClearFocus={() => {
          setSearchParams(new URLSearchParams());
        }}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={handleHiddenColumnsChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        tasks={tasks}
        query={query}
        onImported={projectFocus ? loadProjectCycle : loadTasks}
        onCreated={projectFocus ? loadProjectCycle : loadTasks}
        showQuickCreate={showQuickCreate}
        showQuickFilters={false}
      />
    );
  }

  const matchingTaskCount = useMemo(() => {
    if (!listFiltersActive) return visibleTasks.length;
    const source = projectFocus ? cycleTasks : tasks;
    return source.filter((task) => {
      if (priorityActive && task.criticity !== priorityFilter) return false;
      if (!searchActive) return true;
      const context =
        !projectFocus && 'organization' in task
          ? {
              orgName: (task as TaskWithContext).organization.name,
              projectName: (task as TaskWithContext).project.name,
            }
          : undefined;
      return getTaskSearchRank(task, searchQuery, context) !== null;
    }).length;
  }, [
    listFiltersActive,
    searchActive,
    priorityActive,
    priorityFilter,
    projectFocus,
    cycleTasks,
    tasks,
    searchQuery,
    visibleTasks.length,
  ]);

  return (
    <div className="tasks-page">
      <header className="page-header">
        <h2>All tasks</h2>
      </header>
      <div className="board-chrome-toolbar">
        {showChromeActions ? (
          <div className="board-chrome-actions">
            {showFiltersButton ? (
              <button
                type="button"
                className={`btn btn-secondary board-chrome-toggle${chromePanel === 'filters' ? ' is-open' : ''}`}
                aria-expanded={chromePanel === 'filters'}
                aria-controls={chromePanel === 'filters' ? 'board-chrome-panel' : undefined}
                onClick={() => setChromePanel((current) => toggleBoardChrome(current, 'filters'))}
              >
                Filters
                {extraFilterCount > 0 ? (
                  <span className="board-chrome-count" aria-hidden="true">
                    {extraFilterCount}
                  </span>
                ) : null}
              </button>
            ) : null}
            {showCycleButton ? (
              <button
                type="button"
                className={`btn btn-secondary board-chrome-toggle${chromePanel === 'cycle' ? ' is-open' : ''}`}
                aria-expanded={chromePanel === 'cycle'}
                aria-controls={chromePanel === 'cycle' ? 'board-chrome-panel' : undefined}
                onClick={() => setChromePanel((current) => toggleBoardChrome(current, 'cycle'))}
              >
                Weekly cycle
              </button>
            ) : null}
            {showHistoryButton ? (
              <button
                type="button"
                className={`btn btn-secondary board-chrome-toggle${chromePanel === 'history' ? ' is-open' : ''}`}
                aria-expanded={chromePanel === 'history'}
                aria-controls={chromePanel === 'history' ? 'board-chrome-panel' : undefined}
                onClick={() => setChromePanel((current) => toggleBoardChrome(current, 'history'))}
              >
                Sprint history
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="board-chrome-filters-cluster">
          <BoardQuickFilterChips
            value={quickFilter}
            onChange={handleQuickFilterChange}
          />
          <QaQueueCountChip count={queueCount} />
        </div>
      </div>
      {chromePanel === 'filters' && !isMobileShell ? (
        <div
          id="board-chrome-panel"
          className="board-filters board-filters-inline"
          role="region"
          aria-label="Filters"
        >
          {renderFilterControls(true)}
        </div>
      ) : null}
      {chromePanel === 'cycle' && projectFocus && activeCycle && autoClosesOn ? (
        <div
          id="board-chrome-panel"
          className="board-chrome-panel"
          role="region"
          aria-label="Weekly cycle"
        >
          <BoardCycleHeader
            cycle={activeCycle}
            autoClosesOn={autoClosesOn}
            advancing={advancing}
            onAdvance={() => void handleAdvanceCycle()}
            embedded
          />
        </div>
      ) : null}
      {chromePanel === 'history' && projectFocus ? (
        <div
          id="board-chrome-panel"
          className="board-chrome-panel"
          role="region"
          aria-label="Sprint history"
        >
          <BoardCycleHistoryPanel
            history={cycleHistory}
            loading={historyLoading}
            embedded
          />
        </div>
      ) : null}

      <MobileBoardFiltersOverlay
        open={isMobileShell && filtersOpen}
        onClose={() => setFiltersOpen(false)}
      >
        {renderFilterControls(false)}
      </MobileBoardFiltersOverlay>

      <QaQueueBulkBar
        selectedCount={selectedCount}
        selectableCount={selectableCount}
        allSelected={allSelected}
        mixedProjects={mixedProjects}
        sending={sending}
        sendError={sendError}
        replaceOpen={replaceOpen}
        checklistDisabled={!selectedHaveChecklists}
        onSelectAll={selectAll}
        onSend={sendSelected}
        onOpenChecklists={() => setChecklistsOpen(true)}
        onClear={clearSelection}
        onConfirmReplace={confirmReplace}
        onCancelReplace={cancelReplace}
      />

      {hiddenColumns.length > 0 && !loading && (
        <p className="status-message board-columns-hidden-hint" role="status">
          {hiddenColumns.length} column{hiddenColumns.length === 1 ? '' : 's'} hidden
          — use Columns to show them again. List view still shows all tasks.
        </p>
      )}

      {listFiltersActive && !loading && !error && (
        <p className="status-message board-search-status" role="status">
          {matchingTaskCount === 0
            ? 'No tasks match your filters.'
            : `${matchingTaskCount} matching task${matchingTaskCount === 1 ? '' : 's'}${sourceTaskCount !== matchingTaskCount ? ` in ${sourceTaskCount} loaded` : ''}.`}
        </p>
      )}

      {loading && <p className="status-message">Loading tasks...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && topLevelCount === 0 && !listFiltersActive && (
        <div className="diagrams-empty">
          {!projectFocus && !hasFilters && (
            <span className="hub-empty-glyph" aria-hidden="true">
              <TasksIcon className="arc-icon-empty" />
            </span>
          )}
          <p className="status-message">
            {projectFocus
              ? 'No active board work in this weekly cycle.'
              : hasFilters
                ? 'No tasks match this focus.'
                : 'No tasks yet. Use New task in the filters to create one.'}
          </p>
        </div>
      )}

      {!loading && !error && topLevelCount > 0 && projectFocus && (
        viewMode === 'board' ? (
          <TaskBoard
            tasks={sortedCycleTasks}
            hiddenColumns={hiddenColumns}
            movingTaskIds={movingTaskIds}
            selectedTaskIds={selectedTaskIds}
            onToggleSelect={toggleSelect}
            onAddToQaQueue={sendOne}
            onToggleColumnVisibility={handleToggleColumnVisibility}
            accentColor={
              focusedProject
                ? getProjectColor(focusedProject)
                : getProjectColor({ id: projectId! })
            }
            organizationId={organizationId}
            projectId={projectId}
            organizationName={organizations.find((org) => org.id === organizationId)?.name}
            projectName={focusedProject?.name}
            onUpdate={handleCycleUpdate}
            onDelete={handleCycleDelete}
            onCreateSubtask={handleCycleCreateSubtask}
            onSetParent={handleCycleSetParent}
            onMoveError={handleMoveError}
          />
        ) : (
          <TaskListView
            tasks={sortedCycleTasks}
            movingTaskIds={movingTaskIds}
            selectedTaskIds={selectedTaskIds}
            onToggleSelect={toggleSelect}
            onUpdateStatus={handleListStatusUpdate}
            resolveContext={
              organizationId && projectId
                ? () => ({
                    organizationId,
                    projectId,
                    organizationName: organizations.find((org) => org.id === organizationId)?.name,
                    projectName: focusedProject?.name,
                  })
                : undefined
            }
            accentColor={
              focusedProject
                ? getProjectColor(focusedProject)
                : getProjectColor({ id: projectId! })
            }
          />
        )
      )}

      {!loading && !error && topLevelCount > 0 && !projectFocus && (
        viewMode === 'board' ? (
          <UnifiedTaskBoard
            tasks={sortedTasks}
            hiddenColumns={hiddenColumns}
            movingTaskIds={movingTaskIds}
            selectedTaskIds={selectedTaskIds}
            onToggleSelect={toggleSelect}
            onAddToQaQueue={sendOne}
            onToggleColumnVisibility={handleToggleColumnVisibility}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onCreateSubtask={handleCreateSubtask}
            onSetParent={handleSetParent}
            onMoveError={handleMoveError}
          />
        ) : (
          <TaskListView
            tasks={sortedTasks}
            movingTaskIds={movingTaskIds}
            selectedTaskIds={selectedTaskIds}
            onToggleSelect={toggleSelect}
            onUpdateStatus={handleListStatusUpdate}
          />
        )
      )}

      <TaskQaMultiChecklistModal
        open={checklistsOpen}
        onClose={() => setChecklistsOpen(false)}
        tasks={selectedTasks}
        organizationId={organizationId ?? ''}
        projectId={projectId ?? ''}
        accentColor={
          focusedProject
            ? getProjectColor(focusedProject)
            : undefined
        }
        onTaskChange={() => {
          if (projectFocus) {
            void loadProjectCycle({ silent: true });
            return;
          }
          void loadTasks({ silent: true });
        }}
      />

      {deepLinkTask ? (
        <TaskDetailsModal
          open
          onClose={closeDeepLinkedTask}
          task={deepLinkTask.task}
          organizationId={deepLinkTask.organizationId}
          projectId={deepLinkTask.projectId}
          organizationName={
            deepLinkTask.organizationName
            ?? organizations.find((org) => org.id === deepLinkTask.organizationId)?.name
          }
          projectName={
            deepLinkTask.projectName
            ?? projects.find((project) => project.id === deepLinkTask.projectId)?.name
          }
          accentColor={
            isTaskWithContext(deepLinkTask.task)
              ? getProjectColor(deepLinkTask.task.project)
              : focusedProject
                ? getProjectColor(focusedProject)
                : getProjectColor(
                    projects.find((project) => project.id === deepLinkTask.projectId)
                      ?? { id: deepLinkTask.projectId },
                  )
          }
          subtasks={deepLinkTask.subtasks}
        />
      ) : null}
    </div>
  );
}
