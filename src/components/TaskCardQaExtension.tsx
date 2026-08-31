import { useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  buildChecklistTaskUpdate,
  formatChecklistLabel,
  normalizeQaChecklistState,
  parseQaChecklistItems,
} from '../lib/tasks/taskQaChecklist';
import type { Task, UpdateTaskInput } from '../types/todo';

interface TaskCardQaExtensionProps {
  task: Task;
  inQueue: boolean;
  queueBusy?: boolean;
  onToggleQueue: () => void;
  onUpdate: (id: string, input: Partial<UpdateTaskInput>, replaced?: Task) => Promise<void>;
}

function stopCardPointer(
  event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>,
) {
  event.stopPropagation();
}

export function TaskCardQaExtension({
  task,
  inQueue,
  queueBusy = false,
  onToggleQueue,
  onUpdate,
}: TaskCardQaExtensionProps) {
  const items = useMemo(
    () => parseQaChecklistItems(task.testDescription),
    [task.testDescription],
  );
  const state = useMemo(
    () => normalizeQaChecklistState(task.qaChecklistState),
    [task.qaChecklistState],
  );
  const checkedIds = useMemo(
    () => new Set(state.checkedItemIds),
    [state.checkedItemIds],
  );
  const [saving, setSaving] = useState(false);
  const queueLabel = inQueue
    ? `Remove ${task.displayId || task.title} from QA extension`
    : `Add ${task.displayId || task.title} to QA extension`;

  async function handleToggleItem(itemId: string) {
    if (saving) return;
    const nextChecked = new Set(state.checkedItemIds);
    if (nextChecked.has(itemId)) {
      nextChecked.delete(itemId);
    } else {
      nextChecked.add(itemId);
    }
    const nextState = { ...state, checkedItemIds: [...nextChecked] };
    setSaving(true);
    try {
      await onUpdate(task.id, {
        qaChecklistState: nextState,
        ...buildChecklistTaskUpdate(nextState, items),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="task-card-qa-extension"
      onPointerDown={stopCardPointer}
      onClick={stopCardPointer}
    >
      <label className="task-card-qa-extension-queue">
        <input
          type="checkbox"
          checked={inQueue}
          disabled={queueBusy}
          aria-label={queueLabel}
          onChange={onToggleQueue}
        />
        <span>{inQueue ? 'In QA extension' : 'Add to QA extension'}</span>
      </label>
      {items.length === 0 ? (
        <p className="task-card-qa-extension-empty">No checklist items.</p>
      ) : (
        <ul className="task-card-qa-extension-list">
          {items.map((item) => (
            <li key={item.id}>
              <label className="task-card-qa-extension-item">
                <input
                  type="checkbox"
                  checked={checkedIds.has(item.id)}
                  disabled={saving}
                  aria-label={`Marcar ${formatChecklistLabel(item.label)} como verificado`}
                  onChange={() => void handleToggleItem(item.id)}
                />
                <span>{formatChecklistLabel(item.label)}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
