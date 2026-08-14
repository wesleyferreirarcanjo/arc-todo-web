import { usePwaInstall } from '../hooks/usePwaInstall';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { BellIcon, InstallIcon } from './icons';

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
          <InstallIcon className="sidebar-nav-icon" />
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
          <InstallIcon className="sidebar-nav-icon" />
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
        <BellIcon className="sidebar-nav-icon" />
        {!collapsed && (
          <span className="sidebar-nav-label">
            {optedIn ? 'Disable alerts' : 'Enable alerts'}
          </span>
        )}
      </button>
    </>
  );
}
