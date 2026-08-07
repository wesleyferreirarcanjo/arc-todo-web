import { useState } from 'react';
import { BATCH_SMART_COPY_MAX } from '../lib/taskCopy';
import { useSmartCopyBasket } from '../context/SmartCopyBasketContext';

export function SmartCopyBasketTray() {
  const { items, capMessage, removeTask, clear, copyBatch } = useSmartCopyBasket();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  if (items.length === 0) {
    return null;
  }

  async function handleCopy() {
    try {
      await copyBatch();
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('failed');
      window.setTimeout(() => setCopyStatus('idle'), 2500);
    }
  }

  const copyLabel =
    copyStatus === 'copied'
      ? 'Copied'
      : copyStatus === 'failed'
        ? 'Copy failed'
        : 'Copy Smart Copy batch';

  return (
    <div className="smart-copy-basket-tray" role="region" aria-label="Smart Copy batch">
      <div className="smart-copy-basket-tray-main">
        <div className="smart-copy-basket-tray-header">
          <strong>
            Smart Copy batch ({items.length}/{BATCH_SMART_COPY_MAX})
          </strong>
          {capMessage && (
            <span className="smart-copy-basket-tray-cap" role="status">
              {capMessage}
            </span>
          )}
        </div>
        <ul className="smart-copy-basket-tray-list">
          {items.map((item) => (
            <li key={item.task.id} className="smart-copy-basket-tray-chip">
              <span title={item.task.title}>{item.task.displayId}</span>
              <button
                type="button"
                className="smart-copy-basket-tray-chip-remove"
                aria-label={`Remove ${item.task.displayId} from Smart Copy batch`}
                onClick={() => removeTask(item.task.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="smart-copy-basket-tray-actions">
        <button
          type="button"
          className="smart-copy-basket-tray-btn smart-copy-basket-tray-btn-primary"
          onClick={() => void handleCopy()}
        >
          {copyLabel}
        </button>
        <button
          type="button"
          className="smart-copy-basket-tray-btn"
          onClick={clear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
