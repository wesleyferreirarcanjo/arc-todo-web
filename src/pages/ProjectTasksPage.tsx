import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  createProjectTask,
  deleteProjectTask,
  fetchProjectTasks,
  updateProjectTask,
} from '../lib/api/todos';
import { collectDescendantIds } from '../lib/tasks/taskTree';
import { getProjectColor } from '../lib/color/entityColor';
import { TaskBoard } from '../components/TaskBoard';
import { TaskForm } from '../components/TaskForm';
import { useWorkspace } from '../context/WorkspaceContext';
import type {
  CreateTaskInput,
  Task,
  TaskCriticity,
  TaskStatus,
} from '../types/todo';

export function ProjectTasksPage() {
  const { orgId, projectId } = useParams();
  const { currentProject } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!orgId || !projectId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjectTasks(orgId, projectId);
      setTasks(data);
    } catch {
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function handleCreate(input: CreateTaskInput) {
    if (!orgId || !projectId) return;
    await createProjectTask(orgId, projectId, input);
    await loadTasks();
  }

  async function handleCreateSubtask(parentId: string, input: CreateTaskInput) {
    if (!orgId || !projectId) return;
    await createProjectTask(orgId, projectId, {
      ...input,
      parentTaskId: parentId,
    });
    await loadTasks();
  }

  async function handleUpdate(
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      criticity: TaskCriticity;
      dueDate: string | null;
    }>,
  ) {
    if (!orgId || !projectId) return;
    const updated = await updateProjectTask(orgId, projectId, id, input);
    // ponytail: reload on status change so parent rollup stays in sync
    if (input.status !== undefined) {
      await loadTasks();
      return;
    }
    setTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
  }

  async function handleDelete(id: string) {
    if (!orgId || !projectId) return;
    await deleteProjectTask(orgId, projectId, id);
    const removeIds = new Set(collectDescendantIds(tasks, id));
    setTasks((prev) => prev.filter((task) => !removeIds.has(task.id)));
  }

  if (!orgId || !projectId) {
    return <Navigate to="/organizations" replace />;
  }

  const projectAccent = currentProject
    ? getProjectColor(currentProject)
    : undefined;

  const topLevelCount = tasks.filter((task) => !task.parentTaskId).length;

  return (
    <div className="tasks-page">
      <header className="page-header">
        <h2>{currentProject?.name ?? 'Project tasks'}</h2>
        <p className="page-subtitle">Manage tasks for this project.</p>
        <div className="page-links">
          <Link
            to={`/organizations/${orgId}/projects/${projectId}/knowledge`}
            className="text-link"
          >
            Project knowledge
          </Link>
        </div>
      </header>

      <TaskForm onSubmit={handleCreate} />

      {loading && <p className="status-message">Loading tasks...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && topLevelCount === 0 && (
        <p className="status-message">No tasks yet. Create your first one above.</p>
      )}

      {!loading && !error && topLevelCount > 0 && (
        <TaskBoard
          tasks={tasks}
          accentColor={projectAccent}
          organizationId={orgId}
          projectId={projectId}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onCreateSubtask={handleCreateSubtask}
        />
      )}
    </div>
  );
}
