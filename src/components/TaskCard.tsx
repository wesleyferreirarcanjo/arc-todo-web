import { useEffect, useMemo, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { Task, TaskCriticity, TaskStatus, TaskWithContext } from '../types/todo';
import { useChat } from '../context/ChatContext';
import { copyTaskToClipboard } from '../lib/taskCopy';
import { useMotionTransition } from '../lib/motion/useMotionTransition';
import { DURATION_BASE } from '../lib/motion/variants';
import { useStatusMoveAnimation } from '../lib/motion/StatusMoveAnimationContext';
import { Modal } from './Modal';
import { Select } from './Select';
import { TaskDetailsModal } from './TaskDetailsModal';

function formatDueDateForInput(dueDate: string | null): string {
  if (!dueDate) return '';
  return new Date(dueDate).toISOString().slice(0, 10);
}

function formatBadgeLabel(label: string): string {
  return label.length > 15 ? `${label.slice(0, 15)}...` : label;
}

function MoreVerticalIcon() {
  return (
    <svg
      className="task-menu-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      className="task-menu-item-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      className="task-menu-item-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function CopyIcon({ className = 'task-menu-item-icon' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function EyeIcon({ className = 'task-menu-item-icon' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

interface TaskCardProps {
  task: Task;
  organizationId?: string;
  projectId?: string;
  organizationName?: string;
  projectName?: string;
  accentColor?: string;
  draggable?: boolean;
  isDragging?: boolean;
  compact?: boolean;
  onUpdate: (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      criticity: TaskCriticity;
      dueDate: string | null;
    }>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  chatContextScope?: {
    organizationId: string;
    projectId: string;
  };
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const criticityOptions: { value: TaskCriticity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function TaskCard({
  task,
  organizationId,
  projectId,
  organizationName,
  projectName,
  accentColor,
  draggable = false,
  isDragging = false,
  compact = false,
  onUpdate,
  onDelete,
  chatContextScope,
}: TaskCardProps) {
  const { requestTaskInsert, requestTaskRemove, isTaskReferenced } = useChat();
  const { base } = useMotionTransition();
  const { shouldAnimateStatusMove } = useStatusMoveAnimation();
  const animateStatusMove = shouldAnimateStatusMove(task.id);
  const menuRef = useRef<HTMLDivElement>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [copyTooltip, setCopyTooltip] = useState('Copy task');
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [criticity, setCriticity] = useState<TaskCriticity>(task.criticity);
  const [dueDate, setDueDate] = useState(formatDueDateForInput(task.dueDate));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isInteractionLocked = detailsModalOpen || editModalOpen || actionMenuOpen;
  const resolvedOrganizationId = organizationId ?? chatContextScope?.organizationId;
  const resolvedProjectId = projectId ?? chatContextScope?.projectId;
  const canOpenDetails = Boolean(resolvedOrganizationId && resolvedProjectId);
  const isDraggable = draggable && !isInteractionLocked;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDndDragging,
  } = useDraggable({
    id: task.id,
    disabled: !isDraggable,
  });

  const dragStyle: CSSProperties | undefined =
    transform && !isDragging
      ? { transform: CSS.Translate.toString(transform) }
      : undefined;

  useEffect(() => {
    if (!actionMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActionMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [actionMenuOpen]);

  function resetEditFields() {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setStatus(task.status);
    setCriticity(task.criticity);
    setDueDate(formatDueDateForInput(task.dueDate));
  }

  function handleStartEdit() {
    resetEditFields();
    setActionMenuOpen(false);
    setDetailsModalOpen(false);
    setEditModalOpen(true);
  }

  function handleOpenDetails() {
    setDetailsModalOpen(true);
  }

  async function handleCopyTask() {
    try {
      await copyTaskToClipboard(task);
      setCopyTooltip('Copied');
      window.setTimeout(() => setCopyTooltip('Copy task'), 2000);
    } catch {
      setCopyTooltip('Copy failed');
      window.setTimeout(() => setCopyTooltip('Copy task'), 2500);
    }
  }

  function handleCancelEdit() {
    resetEditFields();
    setEditModalOpen(false);
  }

  async function handleSave() {
    if (!title.trim()) return;

    setSaving(true);
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || '',
        status,
        criticity,
        dueDate: dueDate || null,
      });
      setEditModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setActionMenuOpen(false);
    setDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setDeleting(false);
    }
  }

  function stopCardPointer(event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  function resolveChatContextTask(): TaskWithContext | null {
    const candidate = task as TaskWithContext;

    if (
      candidate.organization?.id &&
      candidate.project?.id &&
      'organization' in task &&
      'project' in task
    ) {
      return candidate;
    }

    if (!chatContextScope) {
      return null;
    }

    return {
      ...task,
      organization: {
        id: chatContextScope.organizationId,
        name: organizationName ?? '',
        slug: '',
      },
      project: {
        id: chatContextScope.projectId,
        name: projectName ?? '',
        organizationId: chatContextScope.organizationId,
        color: accentColor ?? '',
      },
    };
  }

  function handleChatContextAction(event: ReactMouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>) {
    const contextTask = resolveChatContextTask();
    if (!contextTask) {
      return;
    }

    if (event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      if (isTaskReferenced(task.id)) {
        requestTaskRemove(task.id);
      }
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      void requestTaskInsert(contextTask);
    }
  }

  function handleCardPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
      return;
    }

    handleChatContextAction(event);
  }

  const draggableProps = useMemo(() => {
    if (!isDraggable) {
      return {};
    }

    return {
      ...attributes,
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        handleCardPointerDown(event);

        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          return;
        }

        listeners?.onPointerDown?.(event);
      },
    };
  }, [attributes, isDraggable, listeners]);

  const inChatContext = isTaskReferenced(task.id);
  const chatContextTask = resolveChatContextTask();

  const cardStyle = accentColor
    ? ({ '--entity-accent': accentColor, ...dragStyle } as CSSProperties)
    : dragStyle;

  const showAsDragging = isDragging || isDndDragging;

  return (
    <>
      <motion.article
        ref={setNodeRef}
        layout={animateStatusMove ? 'position' : false}
        className={`task-card criticity-${task.criticity}${accentColor ? ' has-accent' : ''}${compact ? ' is-compact' : ''}${showAsDragging ? ' is-dragging' : ''}${isInteractionLocked ? ' has-menu-open' : ''}${inChatContext ? ' is-chat-context' : ''}${chatContextTask ? ' has-chat-hint' : ''}`}
        style={cardStyle}
        animate={{ opacity: showAsDragging ? 0.45 : 1 }}
        whileHover={
          !showAsDragging && !isInteractionLocked
            ? {
                y: -1,
                boxShadow: 'var(--shadow-lift)',
                borderColor: 'var(--border-strong)',
              }
            : undefined
        }
        transition={{
          opacity: { duration: showAsDragging ? DURATION_BASE : 0 },
          layout: animateStatusMove ? base : { duration: 0 },
          default: base,
        }}
        {...draggableProps}
      >
        <div className="task-context-badges">
          <div className="task-context-badges-main">
            {organizationName && (
              <span className="task-badge task-badge-org" title={organizationName}>
                {formatBadgeLabel(organizationName)}
              </span>
            )}
            {projectName && (
              <span
                className="task-badge task-badge-project"
                title={projectName}
                style={
                  accentColor
                    ? ({ '--entity-accent': accentColor } as CSSProperties)
                    : undefined
                }
              >
                {formatBadgeLabel(projectName)}
              </span>
            )}
          </div>
          <span className={`criticity-badge criticity-${task.criticity}`}>
            {task.criticity}
          </span>
        </div>

        <div
          className="task-card-actions"
          ref={menuRef}
          onPointerDown={stopCardPointer}
          onClick={stopCardPointer}
        >
          {canOpenDetails && (
            <button
              type="button"
              className="task-card-action-btn"
              aria-label="View details"
              onClick={handleOpenDetails}
            >
              <EyeIcon className="task-card-action-icon" />
              <span className="task-card-action-tooltip" role="tooltip">
                View details
              </span>
            </button>
          )}

          <button
            type="button"
            className="task-card-action-btn"
            aria-label={copyTooltip}
            onClick={() => void handleCopyTask()}
          >
            <CopyIcon className="task-card-action-icon" />
            <span className="task-card-action-tooltip" role="tooltip">
              {copyTooltip}
            </span>
          </button>

          <div className="task-action-menu">
            <button
              type="button"
              className="task-menu-trigger"
              aria-label="Task actions"
              aria-haspopup="menu"
              aria-expanded={actionMenuOpen}
              onClick={() => setActionMenuOpen((open) => !open)}
            >
              <MoreVerticalIcon />
            </button>

            {actionMenuOpen && (
              <div className="task-action-menu-panel" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="task-action-menu-item"
                  onClick={handleStartEdit}
                >
                  <PencilIcon />
                  Edit
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="task-action-menu-item task-action-menu-item-danger"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  <TrashIcon />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={base}
        >
          <div className="task-card-header">
            <h3>{task.title}</h3>
          </div>

          {task.description && !compact && (
            <p className="task-description">{task.description}</p>
          )}

          {!compact && (
            <div className="task-meta">
              {task.dueDate && (
                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </motion.div>

        {chatContextTask ? (
          <span className="task-card-tooltip" role="tooltip">
            Ctrl+click insert reference · Shift+click remove
          </span>
        ) : null}
      </motion.article>

      {canOpenDetails && (
        <TaskDetailsModal
          open={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          task={task}
          organizationId={resolvedOrganizationId!}
          projectId={resolvedProjectId!}
          organizationName={organizationName}
          projectName={projectName}
          onEdit={handleStartEdit}
        />
      )}

      <Modal
        open={editModalOpen}
        onClose={handleCancelEdit}
        title="Edit task"
        titleId={`edit-task-modal-${task.id}`}
        className="task-edit-modal"
      >
        <form
          className="task-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
            />
          </label>

          <div className="form-row">
            <label>
              Status
              <Select
                value={status}
                onChange={(nextStatus) => setStatus(nextStatus as TaskStatus)}
                options={statusOptions}
              />
            </label>

            <label>
              Criticity
              <Select
                value={criticity}
                onChange={(nextCriticity) =>
                  setCriticity(nextCriticity as TaskCriticity)
                }
                options={criticityOptions}
              />
            </label>

            <label>
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>

          <div className="task-edit-form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !title.trim()}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

interface TaskCardOverlayProps {
  task: Task;
  organizationName?: string;
  projectName?: string;
  accentColor?: string;
  compact?: boolean;
}

export function TaskCardOverlay({
  task,
  organizationName,
  projectName,
  accentColor,
  compact = false,
}: TaskCardOverlayProps) {
  const cardStyle = accentColor
    ? ({ '--entity-accent': accentColor } as CSSProperties)
    : undefined;

  return (
    <article
      className={`task-card task-card-overlay criticity-${task.criticity}${accentColor ? ' has-accent' : ''}${compact ? ' is-compact' : ''}`}
      style={cardStyle}
    >
      <div className="task-context-badges">
        <div className="task-context-badges-main">
          {organizationName && (
            <span className="task-badge task-badge-org" title={organizationName}>
              {formatBadgeLabel(organizationName)}
            </span>
          )}
          {projectName && (
            <span
              className="task-badge task-badge-project"
              title={projectName}
              style={
                accentColor
                  ? ({ '--entity-accent': accentColor } as CSSProperties)
                  : undefined
              }
            >
              {formatBadgeLabel(projectName)}
            </span>
          )}
        </div>
        <span className={`criticity-badge criticity-${task.criticity}`}>
          {task.criticity}
        </span>
      </div>

      <div className="task-card-header">
        <h3>{task.title}</h3>
      </div>

      {task.description && !compact && (
        <p className="task-description">{task.description}</p>
      )}
    </article>
  );
}
