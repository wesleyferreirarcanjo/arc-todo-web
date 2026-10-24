import { useCallback, useRef, useState } from 'react';
import { BOARD_MOBILE_QUERY, useMediaQuery } from './useMediaQuery';

export function useDeferredDelete(onCommit: () => void | Promise<void>) {
  const isMobile = useMediaQuery(BOARD_MOBILE_QUERY);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const requestDelete = useCallback(() => {
    if (isMobile) {
      setToastOpen(true);
      setConfirmOpen(false);
      return;
    }
    setConfirmOpen(true);
    setToastOpen(false);
  }, [isMobile]);

  const confirm = useCallback(async () => {
    setConfirmOpen(false);
    await onCommitRef.current();
  }, []);

  const cancel = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  const undo = useCallback(() => {
    setToastOpen(false);
  }, []);

  const dismiss = useCallback(async () => {
    setToastOpen(false);
    await onCommitRef.current();
  }, []);

  return { requestDelete, confirmOpen, toastOpen, confirm, cancel, undo, dismiss };
}
