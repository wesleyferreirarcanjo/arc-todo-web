import { useCallback, useEffect, useState } from 'react';

const API_UNREACHABLE_EVENT = 'arc-todo:api-unreachable';

export function useOfflineStatus() {
  const [navigatorOffline, setNavigatorOffline] = useState(
    () => (typeof navigator !== 'undefined' ? !navigator.onLine : false),
  );
  const [apiUnreachable, setApiUnreachable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setNavigatorOffline(false);
      setApiUnreachable(false);
      setDismissed(false);
    }

    function handleOffline() {
      setNavigatorOffline(true);
      setDismissed(false);
    }

    function handleApiUnreachable() {
      setApiUnreachable(true);
      setDismissed(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(API_UNREACHABLE_EVENT, handleApiUnreachable);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(API_UNREACHABLE_EVENT, handleApiUnreachable);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const offline = navigatorOffline || apiUnreachable;

  return {
    offline,
    dismiss,
    dismissed,
  };
}
