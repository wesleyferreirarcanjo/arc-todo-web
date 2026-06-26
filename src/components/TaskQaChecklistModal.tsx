import { useEffect, useMemo, useState } from 'react';
import { updateProjectTask } from '../lib/api/todos';
import {
  buildChecklistTaskUpdate,
  formatChecklistLabel,
  normalizeQaChecklistState,
  parseQaChecklistItems,
} from '../lib/tasks/taskQaChecklist';
import type { QaChecklistState, Task } from '../types/todo';
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

function sortIds(ids: string[]): string {
  return [...ids].sort().join(',');
}

function isSameChecklistState(a: QaChecklistState, b: QaChecklistState): boolean {
  return (
    sortIds(a.checkedItemIds) === sortIds(b.checkedItemIds) &&
    sortIds(a.buggedItemIds) === sortIds(b.buggedItemIds)
  );
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
  const [draftState, setDraftState] = useState<QaChecklistState>({
    checkedItemIds: [],
    buggedItemIds: [],
  });
  const [saving, setSaving] = useState(false);

  const checklistItems = useMemo(
    () => parseQaChecklistItems(task.testDescription),
    [task.testDescription],
  );
  const savedState = useMemo(
    () => normalizeQaChecklistState(task.qaChecklistState),
    [task.qaChecklistState],
  );

  useEffect(() => {
    if (!open) return;
    setDraftState(normalizeQaChecklistState(task.qaChecklistState));
  }, [open, task.id]);

  const checkedIds = new Set(draftState.checkedItemIds);
  const buggedIds = new Set(draftState.buggedItemIds);
  const isDirty = !isSameChecklistState(draftState, savedState);

  function handleToggleChecklistItem(itemId: string) {
    setDraftState((current) => {
      const nextChecked = new Set(current.checkedItemIds);
      if (nextChecked.has(itemId)) {
        nextChecked.delete(itemId);
      } else {
        nextChecked.add(itemId);
      }

      return {
        ...current,
        checkedItemIds: [...nextChecked],
      };
    });
  }

  function handleToggleItemBug(itemId: string) {
    setDraftState((current) => {
      const nextBugged = new Set(current.buggedItemIds);
      if (nextBugged.has(itemId)) {
        nextBugged.delete(itemId);
      } else {
        nextBugged.add(itemId);
      }

      return {
        ...current,
        buggedItemIds: [...nextBugged],
      };
    });
  }

  async function handleSaveAndClose() {
    setSaving(true);
    try {
      const updated = await updateProjectTask(
        organizationId,
        projectId,
        task.id,
        {
          qaChecklistState: draftState,
          ...buildChecklistTaskUpdate(draftState, checklistItems),
        },
      );
      onTaskChange?.(updated);
      onClose();
    } catch (error: unknown) {
      onError?.(
        error instanceof Error ? error.message : 'Failed to save checklist',
      );
    } finally {
      setSaving(false);
    }
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
        <>
          <div className="task-qa-checklist-panel">
            <div className="task-qa-checklist-heading" aria-hidden="true">
              <span>OK</span>
              <span>Verificação</span>
              <span>Bug</span>
            </div>
            <ul className="task-qa-checklist-items">
              {checklistItems.map((item) => {
                const isBugged = buggedIds.has(item.id);

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
                        disabled={saving}
                        onChange={() => handleToggleChecklistItem(item.id)}
                      />
                    </label>
                    <p className="task-qa-checklist-label">
                      {formatChecklistLabel(item.label)}
                    </p>
                    <button
                      type="button"
                      className={`btn btn-secondary btn-sm task-qa-checklist-bug-btn${isBugged ? ' is-active' : ''}`}
                      disabled={saving}
                      onClick={() => handleToggleItemBug(item.id)}
                    >
                      {isBugged ? 'Remover' : 'Bug'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="task-qa-checklist-footer">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || !isDirty}
              onClick={() => void handleSaveAndClose()}
            >
              {saving ? 'Salvando...' : 'Salvar e fechar'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
