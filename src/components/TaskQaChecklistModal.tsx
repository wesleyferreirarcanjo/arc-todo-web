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
        <div className="task-qa-checklist-table-wrap">
          <table className="task-qa-checklist-table">
            <thead>
              <tr>
                <th scope="col">OK</th>
                <th scope="col">Verificação</th>
                <th scope="col">Bug</th>
              </tr>
            </thead>
            <tbody>
              {checklistItems.map((item) => {
                const isBugged = buggedIds.has(item.id);
                const isSaving = savingItemId === item.id;

                return (
                  <tr
                    key={item.id}
                    className={isBugged ? 'is-bugged' : undefined}
                  >
                    <td className="task-qa-checklist-col-ok">
                      <input
                        type="checkbox"
                        aria-label={`Marcar ${formatChecklistLabel(item.label)} como verificado`}
                        checked={checkedIds.has(item.id)}
                        disabled={isSaving}
                        onChange={() => void handleToggleChecklistItem(item.id)}
                      />
                    </td>
                    <td className="task-qa-checklist-col-label">
                      {formatChecklistLabel(item.label)}
                    </td>
                    <td className="task-qa-checklist-col-bug">
                      <button
                        type="button"
                        className={`btn btn-secondary btn-sm task-qa-checklist-bug-btn${isBugged ? ' is-active' : ''}`}
                        disabled={isSaving}
                        onClick={() => void handleToggleItemBug(item)}
                      >
                        {isBugged ? 'Remover bug' : 'Marcar bug'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
