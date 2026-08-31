import { ConfirmDialog } from './ConfirmDialog';

export interface QaQueuePickerTask {
  id: string;
  displayId: string;
  title: string;
  projectName?: string;
}

interface QaQueueBulkBarProps {
  open: boolean;
  tasks: QaQueuePickerTask[];
  selectedTaskIds: ReadonlySet<string>;
  selectedCount: number;
  selectableCount: number;
  allSelected: boolean;
  mixedProjects: boolean;
  sending: boolean;
  sendError: string | null;
  replaceOpen: boolean;
  checklistDisabled?: boolean;
  panelId?: string;
  onToggleSelect: (taskId: string) => void;
  onSelectAll: () => void;
  onSend: () => void;
  onOpenChecklists: () => void;
  onClear: () => void;
  onConfirmReplace: () => void;
  onCancelReplace: () => void;
}

export function QaQueueBulkBar({
  open,
  tasks,
  selectedTaskIds,
  selectedCount,
  selectableCount,
  allSelected,
  mixedProjects,
  sending,
  sendError,
  replaceOpen,
  checklistDisabled = false,
  panelId = 'board-qa-queue-panel',
  onToggleSelect,
  onSelectAll,
  onSend,
  onOpenChecklists,
  onClear,
  onConfirmReplace,
  onCancelReplace,
}: QaQueueBulkBarProps) {
  const sendDisabled = selectedCount === 0 || mixedProjects || sending;
  const checklistsDisabled =
    selectedCount === 0 || mixedProjects || checklistDisabled;
  const showProjectName =
    new Set(tasks.map((task) => task.projectName).filter(Boolean)).size > 1;

  return (
    <>
      {open ? (
        <div
          id={panelId}
          className="board-chrome-panel qa-queue-picker"
          role="region"
          aria-label="Fila de QA"
        >
          <p className="qa-queue-bulk-bar-copy">
            <strong>
              {selectedCount === 0
                ? 'Select tasks to attach to the browser extension'
                : `${selectedCount} task${selectedCount === 1 ? '' : 's'} selected`}
            </strong>
            {mixedProjects ? (
              <span className="qa-queue-bulk-bar-hint" role="status">
                Select tasks from one project to send to the QA queue.
              </span>
            ) : null}
            {sendError ? (
              <span className="qa-queue-bulk-bar-hint" role="alert">
                {sendError}
              </span>
            ) : null}
          </p>
          {tasks.length === 0 ? (
            <p className="qa-queue-picker-empty">
              No parent tasks on this board.
            </p>
          ) : (
            <ul className="qa-queue-picker-list">
              {tasks.map((task) => {
                const checked = selectedTaskIds.has(task.id);
                return (
                  <li key={task.id} className="qa-queue-picker-item">
                    <label className="qa-queue-picker-label">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleSelect(task.id)}
                        aria-label={`Select ${task.displayId || task.title} for QA queue`}
                      />
                      <span className="qa-queue-picker-copy">
                        <span className="qa-queue-picker-id">
                          {task.displayId}
                        </span>
                        <span className="qa-queue-picker-title">{task.title}</span>
                        {showProjectName && task.projectName ? (
                          <span className="qa-queue-picker-project">
                            {task.projectName}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="qa-queue-bulk-bar-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={selectableCount === 0 || allSelected}
              onClick={onSelectAll}
            >
              Select all
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={sendDisabled}
              aria-busy={sending}
              onClick={onSend}
            >
              {sending ? 'Sending...' : 'Enviar para fila de QA'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={checklistsDisabled}
              onClick={onOpenChecklists}
            >
              Ver checklists
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={selectedCount === 0}
              onClick={onClear}
            >
              Clear selection
            </button>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={replaceOpen}
        title="Switch QA project"
        description="Your QA queue already has tasks from another project. Confirm switching projects to replace that batch, or keep the current queue."
        confirmLabel="trocar de projeto"
        loading={sending}
        onConfirm={onConfirmReplace}
        onCancel={onCancelReplace}
      />
    </>
  );
}
