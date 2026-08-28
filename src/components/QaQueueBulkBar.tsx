import { ConfirmDialog } from './ConfirmDialog';

interface QaQueueBulkBarProps {
  selectedCount: number;
  selectableCount: number;
  allSelected: boolean;
  mixedProjects: boolean;
  sending: boolean;
  sendError: string | null;
  replaceOpen: boolean;
  checklistDisabled?: boolean;
  onSelectAll: () => void;
  onSend: () => void;
  onOpenChecklists: () => void;
  onClear: () => void;
  onConfirmReplace: () => void;
  onCancelReplace: () => void;
}

export function QaQueueBulkBar({
  selectedCount,
  selectableCount,
  allSelected,
  mixedProjects,
  sending,
  sendError,
  replaceOpen,
  checklistDisabled = false,
  onSelectAll,
  onSend,
  onOpenChecklists,
  onClear,
  onConfirmReplace,
  onCancelReplace,
}: QaQueueBulkBarProps) {
  if (selectableCount === 0 && selectedCount === 0) {
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

  const sendDisabled = selectedCount === 0 || mixedProjects || sending;
  const checklistsDisabled =
    selectedCount === 0 || mixedProjects || checklistDisabled;

  return (
    <>
      <div className="qa-queue-bulk-bar" role="region" aria-label="QA queue selection">
        <p className="qa-queue-bulk-bar-copy">
          <strong>
            {selectedCount === 0
              ? 'Select cards to attach to the browser extension'
              : `${selectedCount} card${selectedCount === 1 ? '' : 's'} selected`}
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
