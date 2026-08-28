import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useEffect, useMemo, useState } from 'react';
import { updateProjectTask } from '../lib/api/todos';
import {
  buildChecklistTaskUpdate,
  formatChecklistLabel,
  normalizeQaChecklistState,
  parseQaChecklistDocument,
} from '../lib/tasks/taskQaChecklist';
import type { QaChecklistState, Task, TaskWithContext } from '../types/todo';
import { ErrorAlert } from './ErrorAlert';
import { Modal } from './Modal';

interface TaskQaMultiChecklistModalProps {
  open: boolean;
  onClose: () => void;
  tasks: Array<Task | TaskWithContext>;
  organizationId: string;
  projectId: string;
  accentColor?: string;
  onTaskChange?: (task: Task) => void;
}

function contextOf(
  task: Task | TaskWithContext,
  fallback: { organizationId: string; projectId: string },
): { organizationId: string; projectId: string } {
  if ('organization' in task && 'project' in task) {
    return {
      organizationId: task.organization.id,
      projectId: task.project.id,
    };
  }
  return fallback;
}

export function TaskQaMultiChecklistModal({
  open,
  onClose,
  tasks,
  organizationId,
  projectId,
  accentColor,
  onTaskChange,
}: TaskQaMultiChecklistModalProps) {
  const [drafts, setDrafts] = useState<Record<string, QaChecklistState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDrafts({});
      setSavingId(null);
      setError(null);
    }
  }, [open]);

  const sections = useMemo(
    () =>
      tasks.map((task) => ({
        task,
        document: parseQaChecklistDocument(task.testDescription),
        state: drafts[task.id] ?? normalizeQaChecklistState(task.qaChecklistState),
      })),
    [tasks, drafts],
  );

  const hasAnyItems = sections.some((section) => section.document.items.length > 0);

  async function handleToggle(task: Task | TaskWithContext, itemId: string) {
    const current =
      drafts[task.id] ?? normalizeQaChecklistState(task.qaChecklistState);
    const nextChecked = new Set(current.checkedItemIds);
    if (nextChecked.has(itemId)) {
      nextChecked.delete(itemId);
    } else {
      nextChecked.add(itemId);
    }
    const nextState: QaChecklistState = {
      ...current,
      checkedItemIds: [...nextChecked],
    };
    const items = parseQaChecklistDocument(task.testDescription).items;
    const { organizationId: orgId, projectId: projId } = contextOf(task, {
      organizationId,
      projectId,
    });

    setDrafts((currentDrafts) => ({ ...currentDrafts, [task.id]: nextState }));
    setSavingId(task.id);
    setError(null);
    try {
      const updated = await updateProjectTask(orgId, projId, task.id, {
        qaChecklistState: nextState,
        ...buildChecklistTaskUpdate(nextState, items),
      });
      onTaskChange?.(updated);
    } catch (err: unknown) {
      setDrafts((currentDrafts) => ({ ...currentDrafts, [task.id]: current }));
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'the checklist' }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Checklists de QA"
      titleId="task-qa-multi-checklist"
      className="task-qa-multi-checklist-modal"
      accentColor={accentColor}
    >
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      {!hasAnyItems ? (
        <p className="task-details-muted">
          None of the selected cards have a checklist.
        </p>
      ) : (
        <div className="task-qa-multi-checklist">
          {sections.map(({ task, document, state }) => {
            if (document.items.length === 0) {
              return (
                <section
                  key={task.id}
                  className="task-qa-multi-task"
                  aria-label={task.displayId ?? task.title}
                >
                  <h4 className="task-qa-multi-task-title">
                    {task.displayId ? `${task.displayId} · ` : ''}
                    {task.title}
                  </h4>
                  <p className="task-details-muted">No checklist items found.</p>
                </section>
              );
            }

            const checkedIds = new Set(state.checkedItemIds);
            const saving = savingId === task.id;

            return (
              <section
                key={task.id}
                className="task-qa-multi-task"
                aria-label={task.displayId ?? task.title}
              >
                <h4 className="task-qa-multi-task-title">
                  {task.displayId ? `${task.displayId} · ` : ''}
                  {task.title}
                </h4>
                <ul className="task-qa-checklist-items">
                  {document.items.map((item) => (
                    <li key={item.id} className="task-qa-checklist-item">
                      <label className="task-qa-checklist-check">
                        <input
                          type="checkbox"
                          aria-label={`Marcar ${formatChecklistLabel(item.label)} em ${task.displayId || task.title}`}
                          checked={checkedIds.has(item.id)}
                          disabled={saving}
                          onChange={() => void handleToggle(task, item.id)}
                        />
                      </label>
                      <p className="task-qa-checklist-label">
                        {formatChecklistLabel(item.label)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
