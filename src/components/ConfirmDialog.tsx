import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onCancel}
      title={title}
      titleId="confirm-dialog-title"
      className="confirm-dialog"
    >
      <p className="confirm-dialog-description">{description}</p>
      <div className="knowledge-actions">
        <button
          type="button"
          className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          disabled={loading}
          onClick={onConfirm}
        >
          {loading ? 'Working...' : confirmLabel}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={loading}
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}
