import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createProjectTask,
  deleteProjectTask,
  fetchAllTasks,
  updateProjectTask,
} from '../lib/api/todos';
import {
  setLastOrganizationId,
  setLastProjectId,
} from '../lib/storage/appStorage';
import { UnifiedTaskBoard } from '../components/UnifiedTaskBoard';
import { TaskForm } from '../components/TaskForm';
import { useWorkspace } from '../context/WorkspaceContext';
import type {
  CreateTaskInput,
  ListTasksQuery,
  TaskPriority,
  TaskStatus,
  TaskWithContext,
} from '../types/todo';

export function AllTasksBoardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { organizations, projects, refreshProjects } = useWorkspace();
  const [tasks, setTasks] = useState<TaskWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const organizationId = searchParams.get('organizationId') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;

  const query = useMemo<ListTasksQuery>(
    () => ({
      organizationId,
      projectId,
    }),
    [organizationId, projectId],
  );

  const hasFilters = Boolean(organizationId || projectId);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllTasks(query);
      setTasks(data);
    } catch {
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

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

  async function handleCreate(input: CreateTaskInput) {
    if (!organizationId || !projectId) return;
    await createProjectTask(organizationId, projectId, input);
    await loadTasks();
  }

  async function handleUpdate(
    task: TaskWithContext,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      dueDate: string | null;
    }>,
  ) {
    const updated = await updateProjectTask(
      task.organization.id,
      task.project.id,
      task.id,
      input,
    );
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

  async function handleDelete(task: TaskWithContext) {
    await deleteProjectTask(task.organization.id, task.project.id, task.id);
    setTasks((prev) => prev.filter((item) => item.id !== task.id));
  }

  return (
    <div className="tasks-page">
      <header className="page-header">
        <h2>All tasks</h2>
        <p className="page-subtitle">
          Tasks across your organizations and projects.
        </p>
      </header>

      <div className="board-filters">
        <label className="board-filter-field">
          Organization
          <select
            value={organizationId ?? ''}
            onChange={(event) => handleOrganizationChange(event.target.value)}
          >
            <option value="">All organizations</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>

        <label className="board-filter-field">
          Project
          <select
            value={projectId ?? ''}
            onChange={(event) => handleProjectChange(event.target.value)}
            disabled={!organizationId}
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
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
      </div>

      {organizationId && projectId && (
        <TaskForm onSubmit={handleCreate} />
      )}

      {loading && <p className="status-message">Loading tasks...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && tasks.length === 0 && (
        <p className="status-message">
          {hasFilters
            ? 'No tasks match this focus.'
            : 'No tasks yet. Create a project task to see it here.'}
        </p>
      )}

      {!loading && !error && tasks.length > 0 && (
        <UnifiedTaskBoard
          tasks={tasks}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
