import { useState } from 'react';
import { BOARD_MOBILE_QUERY, useMediaQuery } from './useMediaQuery';

export function useDeferredDelete(onCommit: () => void | Promise<void>) {
  const isMobile = useMediaQuery(BOARD_MOBILE_QUERY);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  function requestDelete() {
    if (isMobile) {
      setToastOpen(true);
      return;
    }
    setConfirmOpen(true);
  }

  async function runCommit() {
    try {
      await onCommit();
    } finally {
      setToastOpen(false);
      setConfirmOpen(false);
    }
  }

  function confirm() {
    void runCommit();
  }

  function cancel() {
    setConfirmOpen(false);
  }

  function undo() {
    setToastOpen(false);
  }

  function dismiss() {
    void runCommit();
  }

  return {
    requestDelete,
    confirmOpen,
    toastOpen,
    confirm,
    cancel,
    undo,
    dismiss,
  };
}
