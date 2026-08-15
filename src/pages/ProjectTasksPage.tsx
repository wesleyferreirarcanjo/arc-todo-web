import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  createProjectTask,
  deleteProjectTask,
  fetchProjectTasks,
  updateProjectTask,
} from '../lib/api/todos';
import { fetchProjectKnowledgeAccess } from '../lib/api/knowledge';
import { collectDescendantIds } from '../lib/tasks/taskTree';
import { getProjectColor } from '../lib/color/entityColor';
import { TaskBoard } from '../components/TaskBoard';
import { TaskForm } from '../components/TaskForm';
import { WorkspaceEyebrow } from '../components/WorkspaceChrome';
import { useAuth } from '../context/AuthContext';
import { useRegisterBoardMobileActions } from '../context/BoardMobileShellContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from '../types/todo';

export function ProjectTasksPage() {
  const { orgId, projectId } = useParams();
  const { isAdmin } = useAuth();
  const { currentProject } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasKnowledgeAccess, setHasKnowledgeAccess] = useState(isAdmin);

  const loadTasks = useCallback(async () => {
    if (!orgId || !projectId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjectTasks(orgId, projectId);
      setTasks(data);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'tasks' }));
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId]);

  useRegisterBoardMobileActions(
    orgId && projectId
      ? {
          onCreated: loadTasks,
          openFilters: () => {},
          scope: { organizationId: orgId, projectId },
        }
      : null,
  );

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!orgId || !projectId) return;
    if (isAdmin) {
      setHasKnowledgeAccess(true);
      return;
    }
    let cancelled = false;
    void fetchProjectKnowledgeAccess(orgId, projectId)
      .then((status) => {
        if (!cancelled) setHasKnowledgeAccess(status.hasAccess);
      })
      .catch(() => {
        if (!cancelled) setHasKnowledgeAccess(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, projectId, isAdmin]);

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
    input: Partial<UpdateTaskInput>,
    replaced?: Task,
  ) {
    if (!orgId || !projectId) return;
    const updated =
      replaced ?? (await updateProjectTask(orgId, projectId, id, input));
    if (
      input.status !== undefined ||
      input.parentTaskId !== undefined ||
      input.isBug !== undefined ||
      replaced?.isBug !== undefined
    ) {
      await loadTasks();
      return;
    }
    setTasks((prev) => prev.map((task) => (task.id === id ? updated : task)));
  }

  async function handleSetParent(taskId: string, parentId: string | null) {
    if (!orgId || !projectId) return;
    await updateProjectTask(orgId, projectId, taskId, { parentTaskId: parentId });
    await loadTasks();
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
    <div
      className="tasks-page"
      style={
        projectAccent
          ? ({ '--entity-accent': projectAccent } as CSSProperties)
          : undefined
      }
    >
      <header className={`page-header${projectAccent ? ' has-accent' : ''}`}>
        <WorkspaceEyebrow />
        <h2>{currentProject?.name ?? 'Project tasks'}</h2>
        <p className="page-subtitle">Manage tasks for this project.</p>
        <div className="page-links">
          <Link to="/organizations" className="text-link">
            Back to organizations
          </Link>
          {hasKnowledgeAccess && (
            <Link
              to={`/organizations/${orgId}/projects/${projectId}/knowledge`}
              className="text-link"
            >
              Project knowledge
            </Link>
          )}
        </div>
      </header>

      <TaskForm onSubmit={handleCreate} />

      {loading && <p className="status-message">Loading tasks...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

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
          onSetParent={handleSetParent}
        />
      )}
    </div>
  );
}
