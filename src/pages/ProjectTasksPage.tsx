import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
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
import { QaQueueBulkBar } from '../components/QaQueueBulkBar';
import { QaQueueCountChip } from '../components/QaQueueCountChip';
import { TaskForm } from '../components/TaskForm';
import { TaskQaMultiChecklistModal } from '../components/TaskQaMultiChecklistModal';
import { TasksIcon } from '../components/icons';
import { WorkspaceEyebrow } from '../components/WorkspaceChrome';
import { useAuth } from '../context/AuthContext';
import { useRegisterBoardMobileActions } from '../context/BoardMobileShellContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useQaQueueBoard } from '../hooks/useQaQueueBoard';
import { selectedTasksFromIds, parentTasksOnly } from '../lib/qaQueue/selection';
import { parseQaChecklistItems } from '../lib/tasks/taskQaChecklist';
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from '../types/todo';

export function ProjectTasksPage() {
  const { orgId, projectId } = useParams();
  const { isAdmin } = useAuth();
  const { currentProject, currentOrganization } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasKnowledgeAccess, setHasKnowledgeAccess] = useState(isAdmin);
  const [checklistsOpen, setChecklistsOpen] = useState(false);
  const [qaQueueOpen, setQaQueueOpen] = useState(false);
  const qaQueueTasks = useMemo(() => parentTasksOnly(tasks), [tasks]);
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
    confirmReplace,
    cancelReplace,
  } = useQaQueueBoard(qaQueueTasks);
  const selectedTasks = selectedTasksFromIds(qaQueueTasks, selectedTaskIds);
  const selectedHaveChecklists = selectedTasks.some(
    (task) => parseQaChecklistItems(task.testDescription).length > 0,
  );
  const qaQueuePickerTasks = useMemo(
    () =>
      qaQueueTasks.map((task) => ({
        id: task.id,
        displayId: task.displayId,
        title: task.title,
        projectName: currentProject?.name,
      })),
    [qaQueueTasks, currentProject?.name],
  );

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
          <Link
            to={`/organizations/${orgId}/projects/${projectId}/qa-info`}
            className="text-link"
          >
            QA info
          </Link>
          <QaQueueCountChip
            count={queueCount}
            expanded={qaQueueOpen}
            onToggle={() => setQaQueueOpen((open) => !open)}
          />
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

      <TaskForm
        onSubmit={handleCreate}
        organizationId={orgId}
        projectId={projectId}
        defaultAssigneeId={currentProject?.defaultAssigneeId}
      />

      <QaQueueBulkBar
        open={qaQueueOpen}
        tasks={qaQueuePickerTasks}
        selectedTaskIds={selectedTaskIds}
        selectedCount={selectedCount}
        selectableCount={selectableCount}
        allSelected={allSelected}
        mixedProjects={mixedProjects}
        sending={sending}
        sendError={sendError}
        replaceOpen={replaceOpen}
        checklistDisabled={!selectedHaveChecklists}
        onToggleSelect={toggleSelect}
        onSelectAll={selectAll}
        onSend={sendSelected}
        onOpenChecklists={() => setChecklistsOpen(true)}
        onClear={clearSelection}
        onConfirmReplace={confirmReplace}
        onCancelReplace={cancelReplace}
      />

      {loading && <p className="status-message">Loading tasks...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && topLevelCount === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <TasksIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">No tasks yet. Create your first one above.</p>
        </div>
      )}

      {!loading && !error && topLevelCount > 0 && (
        <TaskBoard
          tasks={tasks}
          accentColor={projectAccent}
          organizationId={orgId}
          projectId={projectId}
          organizationName={currentOrganization?.name}
          projectName={currentProject?.name}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onCreateSubtask={handleCreateSubtask}
          onSetParent={handleSetParent}
        />
      )}

      <TaskQaMultiChecklistModal
        open={checklistsOpen}
        onClose={() => setChecklistsOpen(false)}
        tasks={selectedTasks}
        organizationId={orgId}
        projectId={projectId}
        accentColor={projectAccent}
        onTaskChange={(updated) => {
          void handleUpdate(updated.id, {}, updated);
        }}
      />
    </div>
  );
}
