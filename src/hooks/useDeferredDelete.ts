import { useCallback, useState } from 'react';
import { BOARD_MOBILE_QUERY, useMediaQuery } from './useMediaQuery';

export function useDeferredDelete(onCommit: () => void | Promise<void>) {
  const isMobile = useMediaQuery(BOARD_MOBILE_QUERY);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const requestDelete = useCallback(() => {
    if (isMobile) {
      setConfirmOpen(false);
      setToastOpen(true);
      return;
    }
    setToastOpen(false);
    setConfirmOpen(true);
  }, [isMobile]);

  const confirm = useCallback(async () => {
    setConfirmOpen(false);
    await onCommit();
  }, [onCommit]);

  const cancel = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const undo = useCallback(() => {
    setToastOpen(false);
  }, []);

  const dismiss = useCallback(async () => {
    setToastOpen(false);
    await onCommit();
  }, [onCommit]);

  return { requestDelete, confirm, cancel, undo, dismiss, toastOpen, confirmOpen };
}
