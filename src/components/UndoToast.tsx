import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface UndoToastProps {
  open: boolean;
  message: string;
  undoLabel?: string;
  durationMs?: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({
  open,
  message,
  undoLabel = 'Undo',
  durationMs = 5000,
  onUndo,
  onDismiss,
}: UndoToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [open, durationMs, onDismiss]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="undo-toast" role="status" aria-live="polite">
      <span className="undo-toast-message">{message}</span>
      <button type="button" className="undo-toast-action" onClick={onUndo}>
        {undoLabel}
      </button>
    </div>,
    document.body,
  );
}
