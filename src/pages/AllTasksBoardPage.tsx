import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  advanceBoardCycle,
  fetchBoardCycleHistory,
  fetchCurrentBoardCycle,
} from '../lib/api/boardCycles';
import {
  createProjectTask,
  deleteProjectTask,
  fetchAllTasks,
  updateProjectTask,
} from '../lib/api/todos';
import { collectDescendantIds } from '../lib/tasks/taskTree';
import {
  setLastOrganizationId,
  setLastProjectId,
} from '../lib/storage/appStorage';
import { getProjectColor } from '../lib/color/entityColor';
import { BoardCycleHeader } from '../components/BoardCycleHeader';
import { BoardCycleHistoryPanel } from '../components/BoardCycleHistory';
import { TaskBoard } from '../components/TaskBoard';
import { UnifiedTaskBoard } from '../components/UnifiedTaskBoard';
import { QuickTaskCreate } from '../components/QuickTaskCreate';
import { TaskImportExportMenu } from '../components/TaskImportExportMenu';
import { Select } from '../components/Select';
import { useWorkspace } from '../context/WorkspaceContext';
import type {
  BoardCycle,
  BoardCycleHistoryResponse,
} from '../types/boardCycle';
import type {
  CreateTaskInput,
  ListTasksQuery,
  Task,
  TaskCriticity,
  TaskStatus,
  TaskWithContext,
} from '../types/todo';

export function AllTasksBoardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { organizations, projects, refreshProjects } = useWorkspace();
  const [tasks, setTasks] = useState<TaskWithContext[]>([]);
  const [cycleTasks, setCycleTasks] = useState<Task[]>([]);
  const [activeCycle, setActiveCycle] = useState<BoardCycle | null>(null);
  const [cycleHistory, setCycleHistory] = useState<BoardCycleHistoryResponse>({
    cycles: [],
  });
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organizationId = searchParams.get('organizationId') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;
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
    } catch {
      if (!silent) setError('Failed to load tasks.');
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
        setHistoryLoading(true);
        setError(null);
      }

      try {
        const [current, history] = await Promise.all([
          fetchCurrentBoardCycle(organizationId, projectId),
          fetchBoardCycleHistory(organizationId, projectId),
        ]);
        setActiveCycle(current.cycle);
        setCycleTasks(current.tasks);
        setCycleHistory(history);
        if (silent) setError(null);
      } catch {
        if (!silent) setError('Failed to load weekly cycle.');
      } finally {
        if (!silent) {
          setLoading(false);
          setHistoryLoading(false);
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
      updateFilters(nextOrgId);
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

  async function handleAdvanceCycle() {
    if (!organizationId || !projectId) return;
    setAdvancing(true);
    setError(null);
    try {
      await advanceBoardCycle(organizationId, projectId);
      await loadProjectCycle({ silent: true });
    } catch {
      setError('Failed to close the weekly cycle.');
    } finally {
      setAdvancing(false);
    }
  }

  async function handleUpdate(
    task: TaskWithContext,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      criticity: TaskCriticity;
      dueDate: string | null;
      parentTaskId: string | null;
    }>,
  ) {
    const updated = await updateProjectTask(
      task.organization.id,
      task.project.id,
      task.id,
      input,
    );
    if (input.status !== undefined || input.parentTaskId !== undefined) {
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
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      criticity: TaskCriticity;
      dueDate: string | null;
      parentTaskId: string | null;
    }>,
  ) {
    if (!organizationId || !projectId) return;
    await updateProjectTask(organizationId, projectId, taskId, input);
    await loadProjectCycle({ silent: true });
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

  const topLevelCount = projectFocus
    ? cycleTasks.filter((task) => !task.parentTaskId).length
    : tasks.filter((task) => !task.parentTaskId).length;

  return (
    <div className="tasks-page">
      <div className="board-filters">
        <label className="board-filter-field">
          Organization
          <Select
            value={organizationId ?? ''}
            placeholder="All organizations"
            onChange={handleOrganizationChange}
            options={[
              { value: '', label: 'All organizations' },
              ...organizations.map((organization) => ({
                value: organization.id,
                label: organization.name,
              })),
            ]}
          />
        </label>

        <label className="board-filter-field">
          Project
          <Select
            value={projectId ?? ''}
            placeholder="All projects"
            disabled={!organizationId}
            onChange={handleProjectChange}
            options={[
              { value: '', label: 'All projects' },
              ...projects.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
          />
        </label>

        {hasFilters && (
          <button
            type="button"
            className="btn btn-secondary board-filter-clear"
            onClick={() => setSearchParams(new URLSearchParams())}
          >
            Clear focus
          </button>
        )}

        <div className="board-filter-actions">
          <TaskImportExportMenu
            tasks={tasks}
            query={query}
            onImported={projectFocus ? loadProjectCycle : loadTasks}
          />
          <QuickTaskCreate
            onCreated={projectFocus ? loadProjectCycle : loadTasks}
          />
        </div>
      </div>

      {!projectFocus && organizationId && !projectId && (
        <p className="status-message board-cycle-focus-hint">
          Select a project to manage its weekly sprint cycle, close completed
          work into sprint history, and start the next week.
        </p>
      )}

      {projectFocus && activeCycle && (
        <BoardCycleHeader
          cycle={activeCycle}
          advancing={advancing}
          onAdvance={() => void handleAdvanceCycle()}
        />
      )}

      {loading && <p className="status-message">Loading tasks...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && topLevelCount === 0 && (
        <p className="status-message">
          {projectFocus
            ? 'No active board work in this weekly cycle.'
            : hasFilters
              ? 'No tasks match this focus.'
              : 'No tasks yet. Use New task in the filters to create one.'}
        </p>
      )}

      {!loading && !error && topLevelCount > 0 && projectFocus && (
        <TaskBoard
          tasks={cycleTasks}
          accentColor={
            focusedProject
              ? getProjectColor(focusedProject)
              : getProjectColor({ id: projectId! })
          }
          organizationId={organizationId}
          projectId={projectId}
          onUpdate={handleCycleUpdate}
          onDelete={handleCycleDelete}
          onCreateSubtask={handleCycleCreateSubtask}
          onSetParent={handleCycleSetParent}
        />
      )}

      {!loading && !error && topLevelCount > 0 && !projectFocus && (
        <UnifiedTaskBoard
          tasks={tasks}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onCreateSubtask={handleCreateSubtask}
          onSetParent={handleSetParent}
        />
      )}

      {projectFocus && (
        <BoardCycleHistoryPanel
          history={cycleHistory}
          loading={historyLoading}
        />
      )}
    </div>
  );
}
