import { useMemo, useState } from 'react';
import { updateProjectTask } from '../lib/api/todos';
import {
  formatChecklistLabel,
  normalizeQaChecklistState,
  parseQaChecklistItems,
  toggleChecklistItemBug,
} from '../lib/tasks/taskQaChecklist';
import type { Task } from '../types/todo';
import { Modal } from './Modal';

interface TaskQaChecklistModalProps {
  open: boolean;
  onClose: () => void;
  task: Task;
  organizationId: string;
  projectId: string;
  onTaskChange?: (task: Task) => void;
  onError?: (message: string) => void;
}

export function TaskQaChecklistModal({
  open,
  onClose,
  task,
  organizationId,
  projectId,
  onTaskChange,
  onError,
}: TaskQaChecklistModalProps) {
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  const checklistItems = useMemo(
    () => parseQaChecklistItems(task.testDescription),
    [task.testDescription],
  );
  const checklistState = normalizeQaChecklistState(task.qaChecklistState);
  const checkedIds = new Set(checklistState.checkedItemIds);
  const buggedIds = new Set(checklistState.buggedItemIds);

  async function persistChecklistUpdate(
    itemId: string,
    nextState: typeof checklistState,
    taskUpdate?: { isBug: boolean; bugReason: string | null },
  ) {
    setSavingItemId(itemId);
    try {
      const updated = await updateProjectTask(
        organizationId,
        projectId,
        task.id,
        {
          qaChecklistState: nextState,
          ...(taskUpdate ?? {}),
        },
      );
      onTaskChange?.(updated);
    } catch (error: unknown) {
      onError?.(
        error instanceof Error ? error.message : 'Failed to save checklist',
      );
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleToggleChecklistItem(itemId: string) {
    const nextChecked = new Set(checkedIds);
    if (nextChecked.has(itemId)) {
      nextChecked.delete(itemId);
    } else {
      nextChecked.add(itemId);
    }

    await persistChecklistUpdate(itemId, {
      checkedItemIds: [...nextChecked],
      buggedItemIds: checklistState.buggedItemIds,
    });
  }

  async function handleToggleItemBug(item: { id: string; label: string }) {
    const { nextState, taskUpdate } = toggleChecklistItemBug(
      checklistState,
      item.id,
      item.label,
    );
    await persistChecklistUpdate(item.id, nextState, taskUpdate);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Checklist de QA"
      titleId={`task-qa-checklist-${task.id}`}
      className="task-qa-checklist-modal"
    >
      {checklistItems.length === 0 ? (
        <p className="task-details-muted">No checklist items found.</p>
      ) : (
        <div className="task-qa-checklist-panel">
          <div className="task-qa-checklist-heading" aria-hidden="true">
            <span>OK</span>
            <span>Verificação</span>
            <span>Bug</span>
          </div>
          <ul className="task-qa-checklist-items">
            {checklistItems.map((item) => {
              const isBugged = buggedIds.has(item.id);
              const isSaving = savingItemId === item.id;

              return (
                <li
                  key={item.id}
                  className={`task-qa-checklist-item${isBugged ? ' is-bugged' : ''}`}
                >
                  <label className="task-qa-checklist-check">
                    <input
                      type="checkbox"
                      aria-label={`Marcar ${formatChecklistLabel(item.label)} como verificado`}
                      checked={checkedIds.has(item.id)}
                      disabled={isSaving}
                      onChange={() => void handleToggleChecklistItem(item.id)}
                    />
                  </label>
                  <p className="task-qa-checklist-label">
                    {formatChecklistLabel(item.label)}
                  </p>
                  <button
                    type="button"
                    className={`btn btn-secondary btn-sm task-qa-checklist-bug-btn${isBugged ? ' is-active' : ''}`}
                    disabled={isSaving}
                    onClick={() => void handleToggleItemBug(item)}
                  >
                    {isBugged ? 'Remover' : 'Bug'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Modal>
  );
}
