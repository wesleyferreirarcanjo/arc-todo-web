import { usePwaInstall } from '../hooks/usePwaInstall';
import { usePushNotifications } from '../hooks/usePushNotifications';

function InstallIcon({ className = 'sidebar-nav-icon' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function BellIcon({ className = 'sidebar-nav-icon' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

interface PwaControlsProps {
  collapsed?: boolean;
}

export function PwaControls({ collapsed = false }: PwaControlsProps) {
  const { canInstall, install, isIos, isStandalone } = usePwaInstall();
  const { optedIn, loading, enable, disable } = usePushNotifications();

  const showIosHint = isIos && !isStandalone;

  return (
    <>
      {canInstall ? (
        <button
          type="button"
          className="sidebar-footer-btn"
          onClick={() => void install()}
          aria-label="Install app"
          data-tooltip={collapsed ? 'Install app' : undefined}
        >
          <InstallIcon />
          {!collapsed && <span className="sidebar-nav-label">Install app</span>}
        </button>
      ) : null}

      {showIosHint ? (
        <button
          type="button"
          className="sidebar-footer-btn"
          onClick={() => {
            window.alert(
              'To install Arc Todo on iOS: tap Share, then Add to Home Screen.',
            );
          }}
          aria-label="How to install on iOS"
          data-tooltip={collapsed ? 'Install (iOS)' : undefined}
        >
          <InstallIcon />
          {!collapsed && <span className="sidebar-nav-label">Install (iOS)</span>}
        </button>
      ) : null}

      <button
        type="button"
        className="sidebar-footer-btn"
        disabled={loading}
        onClick={() => void (optedIn ? disable() : enable())}
        aria-label={optedIn ? 'Disable notifications' : 'Enable notifications'}
        data-tooltip={
          collapsed
            ? optedIn
              ? 'Disable notifications'
              : 'Enable notifications'
            : undefined
        }
      >
        <BellIcon />
        {!collapsed && (
          <span className="sidebar-nav-label">
            {optedIn ? 'Disable alerts' : 'Enable alerts'}
          </span>
        )}
      </button>
    </>
  );
}
