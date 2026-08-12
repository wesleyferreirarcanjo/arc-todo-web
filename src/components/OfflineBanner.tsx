import { useOfflineStatus } from '../hooks/useOfflineStatus';

export function OfflineBanner() {
  const { offline, dismiss } = useOfflineStatus();
  if (!offline) return null;

  return (
    <div className="offline-banner" role="status">
      <span>
        You&apos;re offline. The app shell still works, but changes won&apos;t
        save until you&apos;re back online.
      </span>
      <button type="button" className="offline-banner-dismiss" onClick={dismiss}>
        Dismiss
      </button>
    </div>
  );
}
