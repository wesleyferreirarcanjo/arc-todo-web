import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { CreateTaskInput, Task, TaskCategory, TaskCriticity, TaskStatus, TaskWithContext, UpdateTaskInput } from '../types/todo';
import { mergeSubtaskProgress, listParentCandidates, splitSubtasksByParentStatus } from '../lib/tasks/taskTree';
import {
  buildTaskMetadataInput,
  codingMetadataFormFromTask,
  type CodingMetadataFormState,
} from '../lib/tasks/taskCategory';
import {
  buildTaskDescriptionInput,
  taskDescriptionFormFromTask,
  type TaskDescriptionFormState,
} from '../lib/tasks/taskDescriptions';
import {
  computeQaChecklistProgress,
  getTaskBugBadgeLabel,
  normalizeQaChecklistState,
} from '../lib/tasks/taskQaChecklist';
import { getAdjacentStatus } from '../lib/tasks/adjacentStatus';
import {
  isSmartCopyStatus,
  TASK_STATUS_OPTIONS,
} from '../lib/tasks/taskStatus';
import { vibrateSafe } from '../lib/ui/haptics';
import { BOARD_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useChat } from '../context/ChatContext';
import { useSmartCopyBasket } from '../context/SmartCopyBasketContext';
import { copyTaskSmartToClipboard, copyTaskToClipboard } from '../lib/taskCopy';
import { useMotionTransition } from '../lib/motion/useMotionTransition';
import { DURATION_BASE } from '../lib/motion/variants';
import { useStatusMoveAnimation } from '../lib/motion/StatusMoveAnimationContext';
import { ConfirmDialog } from './ConfirmDialog';
import { IosHapticHit } from './IosHapticHit';
import { Modal } from './Modal';
import { Select } from './Select';
import { TaskDetailsModal } from './TaskDetailsModal';
import { DEFAULT_TASK_CATEGORY, TaskCategoryFormFields } from './TaskCategoryFormFields';
import { TaskDescriptionFields } from './TaskDescriptionFields';
import { TaskForm } from './TaskForm';
import { TaskQaChecklistModal } from './TaskQaChecklistModal';
import { UndoToast } from './UndoToast';
import {
  CopyIcon,
  EyeIcon,
  MoreVerticalIcon,
  PencilIcon,
  QaBoardIcon,
  TrashIcon,
} from './icons';

function clampContextMenuPosition(clientX: number, clientY: number) {
  const pad = 8;
  const menuWidth = 220;
  const menuHeight = 340;
  return {
    x: Math.max(pad, Math.min(clientX, window.innerWidth - menuWidth - pad)),
    y: Math.max(pad, Math.min(clientY, window.innerHeight - menuHeight - pad)),
  };
}

function formatDueDateForInput(dueDate: string | null): string {
  if (!dueDate) return '';
  return new Date(dueDate).toISOString().slice(0, 10);
}

function formatBadgeLabel(label: string): string {
  return label.length > 15 ? `${label.slice(0, 15)}...` : label;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberryNext(seed: number): { seed: number; value: number } {
  const nextSeed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return { seed: nextSeed, value: nextSeed / 4294967296 };
}

function scatterLightsFromId(id: string) {
  let seed = hashString(id);
  const next = () => {
    const step = mulberryNext(seed);
    seed = step.seed;
    return step.value;
  };

  return Array.from({ length: 6 }, () => ({
    x: 8 + next() * 84,
    y: 10 + next() * 80,
    w: 1.7 + next() * 2.5,
    h: 1.3 + next() * 2.1,
    o: 0.62 + next() * 0.5,
  }));
}

function scatterBounceFromId(id: string) {
  let seed = hashString(`${id}:bounce`);
  const next = () => {
    const step = mulberryNext(seed);
    seed = step.seed;
    return step.value;
  };

  return {
    x: 10 + next() * 80,
    y: 12 + next() * 76,
    o: 0.07 + next() * 0.09,
  };
}

function resetScatterPointer(card: HTMLElement) {
  card.style.removeProperty('--scatter-mx');
  card.style.removeProperty('--scatter-my');
}

function SubtaskProgressRing({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const size = 11;
  const stroke = 1.75;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(Math.max(done / total, 0), 1) : 0;
  const dashOffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <svg
      className="subtask-progress-ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <circle
        className="subtask-progress-ring-track"
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={stroke}
      />
      <circle
        className="subtask-progress-ring-fill"
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
}

function QaChecklistProgress({
  done,
  total,
  clickable,
  onClick,
}: {
  done: number;
  total: number;
  clickable: boolean;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const progress = total > 0 ? Math.min(Math.max(done / total, 0), 1) : 0;
  const label = `Ver checklist, QA ${done}/${total}`;
  const style = { '--qa-progress': progress } as CSSProperties;
  const inner = (
    <>
      <span className="task-card-qa-progress-fill" aria-hidden="true" />
      <span className="task-card-qa-progress-well" aria-hidden="true" />
      <QaBoardIcon className="task-card-action-icon" />
      {clickable ? (
        <span className="task-card-action-tooltip" role="tooltip">
          Ver checklist
        </span>
      ) : null}
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        className="task-card-action-btn task-card-qa-progress"
        aria-label={label}
        style={style}
        onClick={onClick}
      >
        {inner}
      </button>
    );
  }

  return (
    <span className="task-card-qa-progress" aria-label={label} style={style}>
      {inner}
    </span>
  );
}


interface TaskCardProps {
  task: Task;
  subtasks?: Task[];
  isSubtask?: boolean;
  isDetachedSubtask?: boolean;
  parentDisplayId?: string;
  organizationId?: string;
  projectId?: string;
  organizationName?: string;
  projectName?: string;
  accentColor?: string;
  draggable?: boolean;
  isDragging?: boolean;
  isMoving?: boolean;
  draggingTaskId?: string;
  compact?: boolean;
  onUpdate: (id: string, input: Partial<UpdateTaskInput>, replaced?: Task) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateSubtask?: (parentId: string, input: CreateTaskInput) => Promise<void>;
  onSetParent?: (taskId: string, parentId: string | null) => Promise<void>;
  parentCandidates?: Task[];
  chatContextScope?: {
    organizationId: string;
    projectId: string;
  };
}

const statusOptions = TASK_STATUS_OPTIONS;

const criticityOptions: { value: TaskCriticity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function TaskCard({
  task,
  subtasks = [],
  isSubtask = false,
  isDetachedSubtask = false,
  parentDisplayId,
  organizationId,
  projectId,
  organizationName,
  projectName,
  accentColor,
  draggable = false,
  isDragging = false,
  isMoving = false,
  draggingTaskId,
  compact = false,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onSetParent,
  parentCandidates = [],
  chatContextScope,
}: TaskCardProps) {
  const { requestTaskInsert, requestTaskRemove, isTaskReferenced } = useChat();
  const {
    isInBasket: isInSmartCopyBasket,
    toggleTask: toggleSmartCopyBasket,
  } = useSmartCopyBasket();
  const { base, reducedMotion } = useMotionTransition();
  const { shouldAnimateStatusMove, markStatusMove } = useStatusMoveAnimation();
  const animateStatusMove = shouldAnimateStatusMove(task.id);
  const menuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);
  const [setParentModalOpen, setSetParentModalOpen] = useState(false);
  const [qaChecklistOpen, setQaChecklistOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [copyTooltip, setCopyTooltip] = useState('Copy task');
  const [smartCopyTooltip, setSmartCopyTooltip] = useState('Smart copy');
  const [title, setTitle] = useState(task.title);
  const [descriptions, setDescriptions] = useState<TaskDescriptionFormState>(() =>
    taskDescriptionFormFromTask(task),
  );
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [criticity, setCriticity] = useState<TaskCriticity>(task.criticity);
  const [dueDate, setDueDate] = useState(formatDueDateForInput(task.dueDate));
  const [category, setCategory] = useState<TaskCategory>(task.category ?? DEFAULT_TASK_CATEGORY);
  const [coding, setCoding] = useState<CodingMetadataFormState>(() =>
    codingMetadataFormFromTask(task.metadata),
  );
  const [parentTaskId, setParentTaskId] = useState(task.parentTaskId ?? '');
  const [selectedParentId, setSelectedParentId] = useState(task.parentTaskId ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeHint, setSwipeHint] = useState<string | null>(null);
  const swipeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    locked: 'horizontal' | 'vertical' | null;
  } | null>(null);
  const scatterRafRef = useRef<number | null>(null);
  const isMobileBoard = useMediaQuery(BOARD_MOBILE_QUERY);

  const menusOpen = actionMenuOpen || contextMenuPos !== null;
  const isInteractionLocked =
    detailsModalOpen ||
    editModalOpen ||
    subtaskModalOpen ||
    setParentModalOpen ||
    qaChecklistOpen ||
    menusOpen;
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

  function closeActionMenus() {
    setActionMenuOpen(false);
    setContextMenuPos(null);
  }

  useEffect(() => {
    if (!menusOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || contextMenuRef.current?.contains(target)) {
        return;
      }
      closeActionMenus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeActionMenus();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menusOpen]);

  function resetEditFields() {
    setTitle(task.title);
    setDescriptions(taskDescriptionFormFromTask(task));
    setStatus(task.status);
    setCriticity(task.criticity);
    setDueDate(formatDueDateForInput(task.dueDate));
    setCategory(task.category ?? DEFAULT_TASK_CATEGORY);
    setCoding(codingMetadataFormFromTask(task.metadata));
    setParentTaskId(task.parentTaskId ?? '');
    setSelectedParentId(task.parentTaskId ?? '');
  }

  function handleStartEdit() {
    resetEditFields();
    closeActionMenus();
    setDetailsModalOpen(false);
    setEditModalOpen(true);
  }

  function handleOpenDetails() {
    vibrateSafe(10);
    setDetailsModalOpen(true);
  }

  function handleCardDoubleClick(event: ReactMouseEvent<HTMLElement>) {
    if (!canOpenDetails) {
      return;
    }

    const target = event.target as HTMLElement;
    if (
      target.closest(
        'button, a, input, select, textarea, label, [role="menu"], .task-card-actions, .task-card-copy-actions, .task-card-context-menu',
      )
    ) {
      return;
    }

    event.stopPropagation();
    handleOpenDetails();
  }

  function handleCardContextMenu(event: ReactMouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (
      target.closest(
        'input, select, textarea, label, [role="menu"], .task-card-context-menu',
      )
    ) {
      return;
    }

    // Nested TaskCard handles its own contextmenu; don't bubble to parent card.
    const nestedCard = target.closest('.task-card');
    if (nestedCard && nestedCard !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setActionMenuOpen(false);
    setContextMenuPos(clampContextMenuPosition(event.clientX, event.clientY));
  }

  async function handleCopyTask() {
    try {
      await copyTaskToClipboard(task, isSubtask ? undefined : resolvedSubtasks);
      setCopyTooltip('Copied');
      window.setTimeout(() => setCopyTooltip('Copy task'), 2000);
    } catch {
      setCopyTooltip('Copy failed');
      window.setTimeout(() => setCopyTooltip('Copy task'), 2500);
    }
  }

  async function handleSmartCopyTask() {
    if (!resolvedOrganizationId || !resolvedProjectId) {
      return;
    }

    try {
      await copyTaskSmartToClipboard(task, {
        organizationId: resolvedOrganizationId,
        projectId: resolvedProjectId,
        organizationName,
        projectName,
        parentDisplayId,
        subtasks: isSubtask ? undefined : resolvedSubtasks,
      });
      setSmartCopyTooltip('Smart copied');
      window.setTimeout(() => setSmartCopyTooltip('Smart copy'), 2000);
    } catch {
      setSmartCopyTooltip('Copy failed');
      window.setTimeout(() => setSmartCopyTooltip('Smart copy'), 2500);
    }
  }

  function handleToggleSmartCopyBasket() {
    if (!resolvedOrganizationId || !resolvedProjectId) {
      return;
    }

    closeActionMenus();
    toggleSmartCopyBasket(task, {
      organizationId: resolvedOrganizationId,
      projectId: resolvedProjectId,
      organizationName,
      projectName,
      parentDisplayId,
      subtasks: isSubtask ? undefined : resolvedSubtasks,
    });
  }

  function handleCancelEdit() {
    resetEditFields();
    setEditModalOpen(false);
  }

  function handleCodingChange(
    field: keyof CodingMetadataFormState,
    value: string,
  ) {
    setCoding((current) => ({ ...current, [field]: value }));
  }

  function handleDescriptionChange(
    field: keyof TaskDescriptionFormState,
    value: string,
  ) {
    setDescriptions((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    if (!title.trim()) return;

    setSaving(true);
    try {
      const metadata =
        category === 'coding'
          ? buildTaskMetadataInput(category, coding) ?? {}
          : {};
      await onUpdate(task.id, {
        title: title.trim(),
        ...buildTaskDescriptionInput(descriptions),
        status,
        criticity,
        dueDate: dueDate || null,
        parentTaskId: parentTaskId || null,
        category,
        metadata,
      });
      setEditModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function finalizeDelete() {
    setDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setDeleting(false);
      setPendingDelete(false);
      setConfirmDeleteOpen(false);
    }
  }

  function handleDelete() {
    closeActionMenus();
    if (isMobileBoard) {
      setPendingDelete(true);
      return;
    }
    setConfirmDeleteOpen(true);
  }

  async function handleSwipeStatus(direction: 'next' | 'previous') {
    const result = getAdjacentStatus(task.status, direction);
    if (result.clamped) {
      setSwipeHint(
        direction === 'next' ? 'Already at Done' : 'Already at To Do',
      );
      window.setTimeout(() => setSwipeHint(null), 1200);
      vibrateSafe(8);
      return;
    }

    try {
      await onUpdate(task.id, { status: result.status });
      markStatusMove(task.id);
      vibrateSafe(14);
    } catch {
      setSwipeHint('Could not update status');
      window.setTimeout(() => setSwipeHint(null), 1500);
    }
  }

  function handleSwipePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!isMobileBoard || isInteractionLocked || isDraggable) return;
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [role="menuitem"]')) {
      return;
    }
    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      locked: null,
    };
    setSwipeOffset(0);
  }

  function handleSwipePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;

    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;

    if (!swipe.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      swipe.locked = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      if (swipe.locked === 'vertical') {
        swipeRef.current = null;
        setSwipeOffset(0);
        return;
      }
    }

    if (swipe.locked === 'horizontal') {
      event.preventDefault();
      setSwipeOffset(Math.max(-80, Math.min(80, dx)));
    }
  }

  function handleSwipePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const dx = event.clientX - swipe.startX;
    swipeRef.current = null;
    setSwipeOffset(0);

    if (swipe.locked !== 'horizontal' || Math.abs(dx) < 56) {
      return;
    }

    void handleSwipeStatus(dx > 0 ? 'next' : 'previous');
  }

  function handleSwipePointerCancel(event: ReactPointerEvent<HTMLElement>) {
    if (swipeRef.current?.pointerId === event.pointerId) {
      swipeRef.current = null;
      setSwipeOffset(0);
    }
  }

  function handleScatterPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (reducedMotion || isInteractionLocked) {
      return;
    }

    const card = event.currentTarget;
    if (!card.classList.contains('has-scatter-lights')) {
      return;
    }

    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) {
      return;
    }

    const { clientX, clientY } = event;
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return;
    }
    if (scatterRafRef.current != null) {
      cancelAnimationFrame(scatterRafRef.current);
    }

    scatterRafRef.current = requestAnimationFrame(() => {
      scatterRafRef.current = null;
      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      card.style.setProperty(
        '--scatter-mx',
        `${((clientX - rect.left) / rect.width) * 100}%`,
      );
      card.style.setProperty(
        '--scatter-my',
        `${((clientY - rect.top) / rect.height) * 100}%`,
      );
    });
  }

  function handleScatterPointerLeave(event: ReactPointerEvent<HTMLElement>) {
    if (scatterRafRef.current != null) {
      cancelAnimationFrame(scatterRafRef.current);
      scatterRafRef.current = null;
    }
    resetScatterPointer(event.currentTarget);
  }

  function handleCardPointerMove(event: ReactPointerEvent<HTMLElement>) {
    handleScatterPointerMove(event);
    handleSwipePointerMove(event);
  }

  function handleCardPointerLeave(event: ReactPointerEvent<HTMLElement>) {
    handleScatterPointerLeave(event);
  }

  function handleCardPointerCancel(event: ReactPointerEvent<HTMLElement>) {
    handleScatterPointerLeave(event);
    handleSwipePointerCancel(event);
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
        acronym: task.displayId?.slice(1, 4) ?? '',
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

    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      handleChatContextAction(event);
      return;
    }

    handleSwipePointerDown(event);
  }

  const draggableProps = useMemo(() => {
    if (!isDraggable) {
      return {
        onPointerDown: handleCardPointerDown,
      };
    }

    return {
      ...attributes,
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        handleCardPointerDown(event);

        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
          return;
        }

        listeners?.onPointerDown?.(event);
      },
    };
  }, [attributes, isDraggable, listeners]);

  const inChatContext = isTaskReferenced(task.id);
  const chatContextTask = resolveChatContextTask();
  const subtaskProgress = mergeSubtaskProgress(task.subtaskProgress);
  const checklistProgress =
    task.qaChecklistProgress ??
    computeQaChecklistProgress(
      task.testDescription,
      normalizeQaChecklistState(task.qaChecklistState),
    );
  const resolvedSubtasks =
    subtasks.length > 0 ? subtasks : (task.subtasks ?? []);
  const { nested: nestedSubtasks, detached: detachedSubtasks } =
    splitSubtasksByParentStatus(task.status, resolvedSubtasks);
  const detachedSubtaskCount = detachedSubtasks.length;
  const availableParents = listParentCandidates(
    parentCandidates,
    task.id,
    task.projectId,
  );
  const canSetParent =
    Boolean(onSetParent) &&
    resolvedSubtasks.length === 0 &&
    availableParents.length > 0;
  const canAddSubtask = Boolean(onCreateSubtask) && !isSubtask;
  const qaProgress =
    task.status === 'dev_test' || task.status === 'qa_test'
      ? checklistProgress
      : null;
  const showQaStage =
    Boolean(qaProgress) && (!isSubtask || isDetachedSubtask);
  const qaProgressRatio =
    qaProgress && qaProgress.total > 0
      ? Math.min(Math.max(qaProgress.done / qaProgress.total, 0), 1)
      : 0;
  const subtaskProgressRatio =
    !isSubtask && subtaskProgress && subtaskProgress.total > 0
      ? Math.min(Math.max(subtaskProgress.done / subtaskProgress.total, 0), 1)
      : 0;
  const scatterBounce =
    isSubtask && !isDetachedSubtask ? scatterBounceFromId(task.id) : null;

  const cardStyle = {
    ...(accentColor ? ({ '--entity-accent': accentColor } as CSSProperties) : null),
    ...(showQaStage ? ({ '--qa-progress': qaProgressRatio } as CSSProperties) : null),
    ...(!isSubtask && subtaskProgress
      ? ({ '--subtask-progress': subtaskProgressRatio } as CSSProperties)
      : null),
    ...(scatterBounce
      ? ({
          '--scatter-bounce-x': `${scatterBounce.x}%`,
          '--scatter-bounce-y': `${scatterBounce.y}%`,
          '--scatter-bounce-opacity': String(scatterBounce.o),
        } as CSSProperties)
      : null),
    ...dragStyle,
    ...(swipeOffset
      ? {
          transform: `${dragStyle?.transform ? `${dragStyle.transform} ` : ''}translateX(${swipeOffset}px)`,
        }
      : null),
    ...(isMobileBoard && !isDraggable ? { touchAction: 'pan-y' as const } : null),
  } as CSSProperties | undefined;

  const showAsDragging = isDragging || isDndDragging;
  const showChatHint = Boolean((!isSubtask || isDetachedSubtask) && chatContextTask);
  const showSmartCopy =
    isSmartCopyStatus(task.status) &&
    Boolean(resolvedOrganizationId && resolvedProjectId);
  const showSmartCopyBasketAction =
    showSmartCopy && (!isSubtask || isDetachedSubtask);
  const inSmartCopyBasket = isInSmartCopyBasket(task.id);
  const showCornerActions =
    (!isSubtask || isDetachedSubtask) &&
    (Boolean(qaProgress) || showSmartCopy);
  const showParentSubtaskMeta =
    !compact && !isSubtask && (Boolean(subtaskProgress) || detachedSubtaskCount > 0);
  const showSubtaskSection =
    !compact && !isSubtask && (nestedSubtasks.length > 0 || showParentSubtaskMeta);
  const showScatterLights =
    Boolean(accentColor) &&
    showSubtaskSection &&
    !showQaStage &&
    (task.status === 'todo' || task.status === 'in_progress' || task.status === 'done');
  const scatterLights = useMemo(
    () => (showScatterLights ? scatterLightsFromId(task.id) : []),
    [showScatterLights, task.id],
  );

  const taskMenuItems = (
    <>
      {canOpenDetails && isSubtask && !isDetachedSubtask && (
        <button
          type="button"
          role="menuitem"
          className="task-action-menu-item"
          onClick={() => {
            closeActionMenus();
            handleOpenDetails();
          }}
        >
          <EyeIcon className="task-menu-item-icon" />
          View details
        </button>
      )}

      <button
        type="button"
        role="menuitem"
        className="task-action-menu-item"
        onClick={handleStartEdit}
      >
        <PencilIcon className="task-menu-item-icon" />
        Edit
      </button>

      <button
        type="button"
        role="menuitem"
        className="task-action-menu-item"
        onClick={() => {
          closeActionMenus();
          void handleCopyTask();
        }}
      >
        <CopyIcon className="task-menu-item-icon" />
        {copyTooltip}
      </button>

      {showSmartCopyBasketAction && (
        <button
          type="button"
          role="menuitem"
          className="task-action-menu-item"
          onClick={handleToggleSmartCopyBasket}
        >
          <CopyIcon className="task-menu-item-icon" />
          {inSmartCopyBasket ? 'Remove from Smart Copy' : 'Add to Smart Copy'}
        </button>
      )}

      {canAddSubtask && (
        <button
          type="button"
          role="menuitem"
          className="task-action-menu-item"
          onClick={() => {
            closeActionMenus();
            setSubtaskModalOpen(true);
          }}
        >
          Add subtask
        </button>
      )}

      {canSetParent && (
        <button
          type="button"
          role="menuitem"
          className="task-action-menu-item"
          onClick={() => {
            closeActionMenus();
            setSelectedParentId(task.parentTaskId ?? '');
            setSetParentModalOpen(true);
          }}
        >
          Set parent task
        </button>
      )}

      {isSubtask && onSetParent && (
        <button
          type="button"
          role="menuitem"
          className="task-action-menu-item"
          onClick={() => {
            closeActionMenus();
            void onSetParent(task.id, null);
          }}
        >
          Detach from parent
        </button>
      )}

      <button
        type="button"
        role="menuitem"
        className="task-action-menu-item task-action-menu-item-danger"
        disabled={deleting}
        onClick={() => void handleDelete()}
      >
        <TrashIcon className="task-menu-item-icon" />
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </>
  );

  const bugBadgeLabel = getTaskBugBadgeLabel(task);

  return (
    <>
      {!pendingDelete ? (
      <motion.article
        ref={setNodeRef}
        layout={animateStatusMove ? 'position' : false}
        className={`task-card criticity-${task.criticity}${accentColor ? ' has-accent' : ''}${compact ? ' is-compact' : ''}${showAsDragging ? ' is-dragging' : ''}${isMoving ? ' is-moving' : ''}${isInteractionLocked ? ' has-menu-open' : ''}${inChatContext ? ' is-chat-context' : ''}${inSmartCopyBasket ? ' is-smart-copy-basket' : ''}${showChatHint ? ' has-chat-hint' : ''}${isSubtask ? ' is-subtask' : ''}${isDetachedSubtask ? ' is-detached-subtask' : ''}${showSubtaskSection ? ' has-subtasks' : ''}${showCornerActions ? ' has-corner-actions' : ''}${showQaStage ? ' is-qa-stage' : ''}${showScatterLights ? ' has-scatter-lights' : ''}${showScatterLights && task.status === 'todo' ? ' is-todo-stage' : ''}${showScatterLights && task.status === 'in_progress' ? ' is-in-progress-stage' : ''}${showScatterLights && task.status === 'done' ? ' is-done-stage' : ''}${swipeHint ? ' has-swipe-hint' : ''}${isDraggable ? ' is-draggable' : ''}`}
        style={cardStyle}
        animate={{ opacity: showAsDragging || isMoving ? 0.55 : 1 }}
        aria-busy={isMoving || undefined}
        whileHover={
          !showAsDragging && !isInteractionLocked && !showScatterLights
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
        onDoubleClick={handleCardDoubleClick}
        onContextMenu={handleCardContextMenu}
        {...draggableProps}
        onPointerMove={handleCardPointerMove}
        onPointerUp={handleSwipePointerUp}
        onPointerCancel={handleCardPointerCancel}
        onPointerLeave={handleCardPointerLeave}
      >
        {showScatterLights ? (
          <span className="task-card-scatter-lights" aria-hidden="true">
            {scatterLights.map((light, index) => (
              <span
                key={index}
                className="task-card-scatter-light"
                style={
                  {
                    '--sx': `${light.x}%`,
                    '--sy': `${light.y}%`,
                    '--sw': `${light.w}rem`,
                    '--sh': `${light.h}rem`,
                    '--scatter-spot-opacity': String(light.o),
                  } as CSSProperties
                }
              />
            ))}
          </span>
        ) : null}
        {swipeHint ? (
          <span className="task-card-swipe-hint" role="status">
            {swipeHint}
          </span>
        ) : null}
        {task.displayId && isSubtask && !isDetachedSubtask && (
          <span className="task-display-id" title={task.displayId}>
            {task.displayId}
          </span>
        )}

        {(!isSubtask || isDetachedSubtask) && (
          <div className="task-context-badges">
            <div className="task-context-badges-main">
              {task.displayId && (
                <span className="task-display-id" title={task.displayId}>
                  {task.displayId}
                </span>
              )}
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
            <div className="task-context-badges-meta">
              {bugBadgeLabel && (
                <span
                  className={`task-bug-badge${bugBadgeLabel === 'Bug resolvido' ? ' is-resolved' : ''}`}
                >
                  {bugBadgeLabel}
                </span>
              )}
            </div>
          </div>
        )}

        {isDetachedSubtask && parentDisplayId && (
          <p
            className="task-subtask-parent-chip"
            title={`Subtask of ${parentDisplayId}`}
          >
            Subtask of {parentDisplayId}
          </p>
        )}

        <div
          className="task-card-actions"
          ref={menuRef}
          onPointerDown={stopCardPointer}
          onClick={stopCardPointer}
        >
          {canOpenDetails && (!isSubtask || isDetachedSubtask) && (
            <button
              type="button"
              className="task-card-action-btn ios-haptic-host"
              aria-label="View details"
              onClick={handleOpenDetails}
            >
              <EyeIcon className="task-card-action-icon" />
              <span className="task-card-action-tooltip" role="tooltip">
                View details
              </span>
              <IosHapticHit />
            </button>
          )}

          <div className="task-action-menu">
            <button
              type="button"
              className="task-menu-trigger"
              aria-label="Task actions"
              aria-haspopup="menu"
              aria-expanded={actionMenuOpen}
              onClick={() => {
                setContextMenuPos(null);
                setActionMenuOpen((open) => !open);
              }}
            >
              <MoreVerticalIcon className="task-menu-icon" />
            </button>

            {actionMenuOpen && (
              <div className="task-action-menu-panel" role="menu">
                {taskMenuItems}
              </div>
            )}
          </div>
        </div>

        <motion.div
          className="task-card-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={base}
        >
          <div className="task-card-header">
            <h3>{task.title}</h3>
            {isSubtask && !isDetachedSubtask && subtaskProgress && (
              <span
                className="subtask-progress-badge"
                style={
                  accentColor
                    ? ({ '--entity-accent': accentColor } as CSSProperties)
                    : undefined
                }
              >
                <SubtaskProgressRing
                  done={subtaskProgress.done}
                  total={subtaskProgress.total}
                />
                {subtaskProgress.done}/{subtaskProgress.total} done
              </span>
            )}
          </div>

          {!isSubtask && compact && resolvedSubtasks.length > 0 && (
            <p className="task-subtask-summary">
              {resolvedSubtasks.length} subtask{resolvedSubtasks.length === 1 ? '' : 's'}
              {detachedSubtaskCount > 0
                ? ` · ${detachedSubtaskCount} elsewhere`
                : ''}
            </p>
          )}

          {!compact && (!isSubtask || isDetachedSubtask) && task.dueDate && (
            <div className="task-meta">
              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </motion.div>

        {(!isSubtask || isDetachedSubtask) && chatContextTask ? (
          <span className="task-card-tooltip" role="tooltip">
            Ctrl+click insert reference · Shift+click remove
          </span>
        ) : null}

        {showSubtaskSection && (
          <div className="task-subtasks" onPointerDown={stopCardPointer} onClick={stopCardPointer}>
            {showParentSubtaskMeta && (
              <div className="task-subtask-meta">
                {detachedSubtaskCount > 0 && (
                  <span
                    className="task-subtask-elsewhere-badge"
                    title={`${detachedSubtaskCount} subtask${detachedSubtaskCount === 1 ? '' : 's'} in other columns`}
                  >
                    {detachedSubtaskCount} elsewhere
                  </span>
                )}
                {subtaskProgress && (
                  <span
                    className="subtask-progress-badge"
                    style={
                      accentColor
                        ? ({ '--entity-accent': accentColor } as CSSProperties)
                        : undefined
                    }
                  >
                    <SubtaskProgressRing
                      done={subtaskProgress.done}
                      total={subtaskProgress.total}
                    />
                    {subtaskProgress.done}/{subtaskProgress.total} done
                  </span>
                )}
              </div>
            )}
            {nestedSubtasks.map((subtask) => (
              <TaskCard
                key={subtask.id}
                task={subtask}
                isSubtask
                parentDisplayId={task.displayId}
                organizationId={organizationId}
                projectId={projectId}
                organizationName={organizationName}
                projectName={projectName}
                accentColor={accentColor}
                compact={false}
                draggable={isDraggable}
                isDragging={draggingTaskId === subtask.id || draggingTaskId === task.id}
                draggingTaskId={draggingTaskId}
                chatContextScope={chatContextScope}
                parentCandidates={parentCandidates}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onCreateSubtask={onCreateSubtask}
                onSetParent={onSetParent}
              />
            ))}
          </div>
        )}

        {showCornerActions && (
          <div
            className="task-card-copy-actions"
            onPointerDown={stopCardPointer}
            onClick={stopCardPointer}
          >
            {showSmartCopy && (
              <button
                type="button"
                className="task-card-action-btn task-card-smart-copy-btn"
                aria-label={smartCopyTooltip}
                onClick={(event) => {
                  stopCardPointer(event);
                  void handleSmartCopyTask();
                }}
              >
                <CopyIcon className="task-card-action-icon" />
                <span className="task-card-action-tooltip" role="tooltip">
                  {smartCopyTooltip}
                </span>
              </button>
            )}
            {qaProgress && (
              <QaChecklistProgress
                done={qaProgress.done}
                total={qaProgress.total}
                clickable={canOpenDetails}
                onClick={(event) => {
                  stopCardPointer(event);
                  setQaChecklistOpen(true);
                }}
              />
            )}
          </div>
        )}

      </motion.article>
      ) : null}

      {contextMenuPos &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="task-card-context-menu"
            role="menu"
            aria-label="Task actions"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
            onPointerDown={stopCardPointer}
            onClick={stopCardPointer}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {taskMenuItems}
          </div>,
          document.body,
        )}

      {canOpenDetails && (qaProgress || qaChecklistOpen) && (
        <TaskQaChecklistModal
          open={qaChecklistOpen}
          onClose={() => setQaChecklistOpen(false)}
          task={task}
          organizationId={resolvedOrganizationId!}
          projectId={resolvedProjectId!}
          onTaskChange={(updated) => void onUpdate(task.id, {}, updated)}
        />
      )}


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
          onTaskSynced={(updated) => void onUpdate(task.id, {}, updated)}
          subtasks={resolvedSubtasks}
          parentDisplayId={parentDisplayId}
        />
      )}

      {!isSubtask && canAddSubtask && (
        <Modal
          open={subtaskModalOpen}
          onClose={() => setSubtaskModalOpen(false)}
          title={`Add subtask to ${task.title}`}
          titleId={`subtask-modal-${task.id}`}
          className="task-create-modal"
        >
          <TaskForm
            heading="New subtask"
            submitLabel="Add subtask"
            hideHeading
            parentTaskId={task.id}
            defaultCategory={task.category ?? DEFAULT_TASK_CATEGORY}
            onSubmit={async (input) => {
              await onCreateSubtask!(task.id, input);
              setSubtaskModalOpen(false);
            }}
          />
        </Modal>
      )}

      {canSetParent && (
        <Modal
          open={setParentModalOpen}
          onClose={() => setSetParentModalOpen(false)}
          title={`Set parent for ${task.title}`}
          titleId={`set-parent-modal-${task.id}`}
          className="task-create-modal"
        >
          <form
            className="task-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedParentId) return;
              void onSetParent!(task.id, selectedParentId).then(() =>
                setSetParentModalOpen(false),
              );
            }}
          >
            <label>
              Parent task
              <Select
                value={selectedParentId}
                placeholder="Choose parent task"
                onChange={setSelectedParentId}
                options={availableParents.map((parent) => ({
                  value: parent.id,
                  label: parent.title,
                }))}
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedParentId}
            >
              Set parent
            </button>
          </form>
        </Modal>
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

          <TaskDescriptionFields
            values={descriptions}
            onChange={handleDescriptionChange}
          />

          <TaskCategoryFormFields
            category={category}
            onCategoryChange={setCategory}
            coding={coding}
            onCodingChange={handleCodingChange}
          />

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

          {resolvedSubtasks.length === 0 && availableParents.length > 0 && (
            <label>
              Parent task
              <Select
                value={parentTaskId}
                placeholder="No parent (top-level task)"
                onChange={setParentTaskId}
                options={[
                  { value: '', label: 'No parent (top-level task)' },
                  ...availableParents.map((parent) => ({
                    value: parent.id,
                    label: parent.title,
                  })),
                ]}
              />
            </label>
          )}

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

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete task"
        description="Delete this task? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => void finalizeDelete()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <UndoToast
        open={pendingDelete}
        message="Task deleted"
        onUndo={() => setPendingDelete(false)}
        onDismiss={() => {
          void finalizeDelete();
        }}
      />
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
          {task.displayId && (
            <span className="task-display-id" title={task.displayId}>
              {task.displayId}
            </span>
          )}
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
      </div>

      <div className="task-card-header">
        <h3>{task.title}</h3>
      </div>
    </article>
  );
}
