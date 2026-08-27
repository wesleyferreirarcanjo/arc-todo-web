import { ConfirmDialog } from './ConfirmDialog';

interface QaQueueBulkBarProps {
  selectedCount: number;
  mixedProjects: boolean;
  sending: boolean;
  sendError: string | null;
  replaceOpen: boolean;
  onSend: () => void;
  onClear: () => void;
  onConfirmReplace: () => void;
  onCancelReplace: () => void;
}

export function QaQueueBulkBar({
  selectedCount,
  mixedProjects,
  sending,
  sendError,
  replaceOpen,
  onSend,
  onClear,
  onConfirmReplace,
  onCancelReplace,
}: QaQueueBulkBarProps) {
  if (selectedCount === 0) {
    return (
      <ConfirmDialog
        open={replaceOpen}
        title="Switch QA project"
        description="Your QA queue already has tasks from another project. Confirm switching projects to replace that batch, or keep the current queue."
        confirmLabel="trocar de projeto"
        loading={sending}
        onConfirm={onConfirmReplace}
        onCancel={onCancelReplace}
      />
    );
  }

  const sendDisabled = mixedProjects || sending;

  return (
    <>
      <div className="qa-queue-bulk-bar" role="region" aria-label="QA queue selection">
        <p className="qa-queue-bulk-bar-copy">
          <strong>
            {selectedCount} card{selectedCount === 1 ? '' : 's'} selected
          </strong>
          {mixedProjects ? (
            <span className="qa-queue-bulk-bar-hint" role="status">
              Select cards from one project to send to the QA queue.
            </span>
          ) : null}
          {sendError ? (
            <span className="qa-queue-bulk-bar-hint" role="alert">
              {sendError}
            </span>
          ) : null}
        </p>
        <div className="qa-queue-bulk-bar-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={sendDisabled}
            aria-busy={sending}
            onClick={onSend}
          >
            {sending ? 'Sending...' : 'Enviar para fila de QA'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClear}>
            Clear selection
          </button>
        </div>
      </div>
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
