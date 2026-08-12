import { useCallback, useEffect, useState } from 'react';
import {
  getPushPreferences,
  updatePushPreferences,
} from '../lib/api/push';
import { subscribeUser, unsubscribeUser } from '../lib/pwa/pushSubscribe';

export function usePushNotifications() {
  const [optedIn, setOptedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getPushPreferences()
      .then((prefs) => {
        if (!cancelled) {
          setOptedIn(prefs.optedIn);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOptedIn(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await subscribeUser();
      const prefs = await updatePushPreferences({ optedIn: true });
      setOptedIn(prefs.optedIn);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to enable notifications.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await unsubscribeUser();
      const prefs = await updatePushPreferences({ optedIn: false });
      setOptedIn(prefs.optedIn);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to disable notifications.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    optedIn,
    enable,
    disable,
    loading,
    error,
  };
}
