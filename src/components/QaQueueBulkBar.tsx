import { ConfirmDialog } from './ConfirmDialog';
import { TrashIcon } from './icons';

export interface QaQueuePanelItem {
  taskId: string;
  displayId: string;
  title: string;
}

interface QaQueueBulkBarProps {
  open: boolean;
  items: QaQueuePanelItem[];
  unqueuedCount: number;
  mixedUnqueued: boolean;
  sending: boolean;
  removingTaskId: string | null;
  sendError: string | null;
  replaceOpen: boolean;
  panelId?: string;
  onAddAll: () => void;
  onRemove: (taskId: string) => void;
  onConfirmReplace: () => void;
  onCancelReplace: () => void;
}

export function QaQueueBulkBar({
  open,
  items,
  unqueuedCount,
  mixedUnqueued,
  sending,
  removingTaskId,
  sendError,
  replaceOpen,
  panelId = 'board-qa-queue-panel',
  onAddAll,
  onRemove,
  onConfirmReplace,
  onCancelReplace,
}: QaQueueBulkBarProps) {
  const addDisabled = unqueuedCount === 0 || mixedUnqueued || sending;

  return (
    <>
      {open ? (
        <div
          id={panelId}
          className="board-chrome-panel qa-queue-picker"
          role="region"
          aria-label="QA extension"
        >
          <p className="qa-queue-bulk-bar-copy">
            <strong>QA extension</strong>
            <span className="qa-queue-bulk-bar-note">
              Click a parent card to add it. The board shows titles only; cards
              already in this list stay hidden. Tasks that leave QA Test drop
              out automatically.
            </span>
            {mixedUnqueued ? (
              <span className="qa-queue-bulk-bar-hint" role="status">
                Select tasks from one project to send to the QA extension.
              </span>
            ) : null}
            {sendError ? (
              <span className="qa-queue-bulk-bar-hint" role="alert">
                {sendError}
              </span>
            ) : null}
          </p>
          {items.length === 0 ? (
            <p className="qa-queue-picker-empty">
              No cards in the QA extension yet.
            </p>
          ) : (
            <ul className="qa-queue-picker-list">
              {items.map((item) => {
                const removing = removingTaskId === item.taskId;
                return (
                  <li key={item.taskId} className="qa-queue-picker-item">
                    <div className="qa-queue-picker-row">
                      <span className="qa-queue-picker-copy">
                        <span className="qa-queue-picker-id">
                          {item.displayId}
                        </span>
                        <span className="qa-queue-picker-title">{item.title}</span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary qa-queue-remove-btn"
                        disabled={sending || removing}
                        aria-label={`Remove ${item.displayId} from QA extension`}
                        onClick={() => onRemove(item.taskId)}
                      >
                        <TrashIcon />
                        {removing ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="qa-queue-bulk-bar-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={addDisabled}
              aria-busy={sending}
              onClick={onAddAll}
            >
              {sending ? 'Adding...' : 'Add all parents'}
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
