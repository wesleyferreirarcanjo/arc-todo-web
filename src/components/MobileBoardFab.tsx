import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBoardMobileShell } from '../context/BoardMobileShellContext';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { SHELL_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { vibrateSafe } from '../lib/ui/haptics';
import { isBoardShellPath } from '../lib/board/boardShellPath';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { MobileQuickCreateSheet } from './MobileQuickCreateSheet';
import { BoardStatusTabs } from './BoardStatusTabs';
import { IosHapticHit } from './IosHapticHit';
import {
  BackIcon,
  BellIcon,
  ChatIcon,
  DiagramsIcon,
  FilterIcon,
  FlaskIcon,
  InstallIcon,
  KnowledgeIcon,
  LogoutIcon,
  McpIcon,
  MoonIcon,
  NamesIcon,
  NavigateIcon,
  NewTaskIcon,
  OrganizationsIcon,
  PeopleIcon,
  RagIcon,
  SettingsIcon,
  StorageIcon,
  SunIcon,
  TasksIcon,
  UsersIcon,
  WireframesIcon,
} from './icons';

type DialLevel = 'main' | 'nav' | 'settings';

type DialAction = {
  id: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
};

function DialActionButton({
  action,
  labeled = false,
}: {
  action: DialAction;
  labeled?: boolean;
}) {
  return (
    <div className="mobile-board-fab-dial-slot">
      <button
        type="button"
        role="menuitem"
        aria-label={labeled ? undefined : action.label}
        title={action.label}
        className={`mobile-board-fab-dial-item ios-haptic-host${
          action.danger ? ' is-danger' : ''
        }${labeled ? ' is-labeled' : ''}`}
        onClick={action.onClick}
      >
        {action.icon}
        {labeled ? (
          <span className="mobile-board-fab-dial-label">{action.label}</span>
        ) : null}
        <IosHapticHit />
      </button>
    </div>
  );
}

export function MobileBoardFab() {
  const isMobileShell = useMediaQuery(SHELL_MOBILE_QUERY);
  const location = useLocation();
  const navigate = useNavigate();
  const isBoardPage = location.pathname === '/board';
  const isBoardShell = isBoardShellPath(location.pathname);
  const { logout, isAdmin } = useAuth();
  const { setChatOpen } = useChat();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, install, isIos, isStandalone } = usePwaInstall();
  const { optedIn, enable, disable, loading: pushLoading } = usePushNotifications();
  const { actions, statusTabs } = useBoardMobileShell();
  const reducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialLevel, setDialLevel] = useState<DialLevel>('main');
  const [createOpen, setCreateOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      setDialLevel('main');
    }
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setCreateOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (dialLevel !== 'main') {
          setDialLevel('main');
          return;
        }
        setMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, dialLevel]);

  const mainActions = useMemo((): DialAction[] => {
    // Logout is first in the array so column-reverse CSS paints it last
    // (bottom, closest to +). Do not flip `.mobile-board-fab-dial` flex-direction.
    const items: DialAction[] = [
      {
        id: 'logout',
        label: 'Logout',
        icon: <LogoutIcon className="mobile-board-fab-glyph" />,
        danger: true,
        onClick: () => {
          setMenuOpen(false);
          logout();
        },
      },
      {
        id: 'navigate',
        label: 'Navigate',
        icon: <NavigateIcon />,
        onClick: () => setDialLevel('nav'),
      },
    ];
    if (isBoardPage && actions?.openFilters) {
      items.push({
        id: 'filter',
        label: 'Filter',
        icon: <FilterIcon />,
        onClick: () => {
          setMenuOpen(false);
          actions.openFilters();
        },
      });
    }
    if (isBoardShell && actions) {
      items.push({
        id: 'new-task',
        label: 'New task',
        icon: <NewTaskIcon />,
        onClick: () => {
          setMenuOpen(false);
          setCreateOpen(true);
        },
      });
    }
    items.push({
      id: 'chatbot',
      label: 'Chatbot',
      icon: <ChatIcon />,
      onClick: () => {
        setMenuOpen(false);
        setChatOpen(true);
      },
    });
    items.push({
      id: 'theme',
      label: theme === 'dark' ? 'Light theme' : 'Dark theme',
      icon: theme === 'dark' ? <SunIcon /> : <MoonIcon />,
      onClick: () => {
        toggleTheme();
        setMenuOpen(false);
      },
    });
    if (canInstall || (isIos && !isStandalone)) {
      items.push({
        id: 'install',
        label: 'Install app',
        icon: <InstallIcon />,
        onClick: () => {
          setMenuOpen(false);
          if (canInstall) {
            void install();
            return;
          }
          window.alert(
            'To install Arc Todo on iOS: tap Share, then Add to Home Screen.',
          );
        },
      });
    }
    items.push({
      id: 'notifications',
      label: optedIn ? 'Disable notifications' : 'Enable notifications',
      icon: <BellIcon />,
      onClick: () => {
        if (pushLoading) return;
        setMenuOpen(false);
        void (optedIn ? disable() : enable()).catch(() => {
          // Keep dial closed; errors stay in hook state.
        });
      },
    });
    if (isAdmin) {
      items.push({
        id: 'settings',
        label: 'Settings',
        icon: <SettingsIcon />,
        onClick: () => setDialLevel('settings'),
      });
    }
    return items;
  }, [
    actions,
    canInstall,
    disable,
    enable,
    install,
    isAdmin,
    isBoardPage,
    isBoardShell,
    isIos,
    isStandalone,
    logout,
    optedIn,
    pushLoading,
    setChatOpen,
    theme,
    toggleTheme,
  ]);

  const navActions = useMemo((): DialAction[] => {
    const go = (path: string) => {
      setMenuOpen(false);
      navigate(path);
    };
    const items: DialAction[] = [
      {
        id: 'nav-back',
        label: 'Back',
        icon: <BackIcon />,
        onClick: () => setDialLevel('main'),
      },
      {
        id: 'nav-board',
        label: 'All tasks',
        icon: <TasksIcon />,
        onClick: () => go('/board'),
      },
      {
        id: 'nav-knowledge',
        label: 'Knowledge',
        icon: <KnowledgeIcon />,
        onClick: () => go('/knowledge'),
      },
      {
        id: 'nav-diagrams',
        label: 'Diagrams',
        icon: <DiagramsIcon />,
        onClick: () => go('/diagrams'),
      },
      {
        id: 'nav-wireframes',
        label: 'Wireframes',
        icon: <WireframesIcon />,
        onClick: () => go('/wireframes'),
      },
      {
        id: 'nav-names',
        label: 'Names',
        icon: <NamesIcon />,
        onClick: () => go('/names'),
      },
      {
        id: 'nav-people',
        label: 'People',
        icon: <PeopleIcon />,
        onClick: () => go('/people'),
      },
      {
        id: 'nav-organizations',
        label: 'Organizations',
        icon: <OrganizationsIcon />,
        onClick: () => go('/organizations'),
      },
    ];
    if (isAdmin) {
      items.push({
        id: 'nav-users',
        label: 'Users',
        icon: <UsersIcon />,
        onClick: () => go('/admin/users'),
      });
    }
    return items;
  }, [isAdmin, navigate]);

  const settingsActions = useMemo((): DialAction[] => {
    return [
      {
        id: 'back',
        label: 'Back',
        icon: <BackIcon />,
        onClick: () => setDialLevel('main'),
      },
      {
        id: 'settings-chatbot',
        label: 'Chatbot settings',
        icon: <ChatIcon />,
        onClick: () => {
          setMenuOpen(false);
          navigate('/settings/chatbot');
        },
      },
      {
        id: 'settings-chatbot-testing',
        label: 'Chatbot testing',
        icon: <FlaskIcon />,
        onClick: () => {
          setMenuOpen(false);
          navigate('/settings/chatbot/testing');
        },
      },
      {
        id: 'settings-mcp',
        label: 'MCP Tools',
        icon: <McpIcon />,
        onClick: () => {
          setMenuOpen(false);
          navigate('/settings/mcp-tools');
        },
      },
      {
        id: 'settings-storage',
        label: 'Storage',
        icon: <StorageIcon />,
        onClick: () => {
          setMenuOpen(false);
          navigate('/settings/storage');
        },
      },
      {
        id: 'settings-rag',
        label: 'RAG settings',
        icon: <RagIcon />,
        onClick: () => {
          setMenuOpen(false);
          navigate('/settings/rag/settings');
        },
      },
    ];
  }, [navigate]);

  if (!isMobileShell) {
    return null;
  }

  const visibleStatusTabs = isBoardShell ? statusTabs : null;
  const dialActions =
    dialLevel === 'nav'
      ? navActions
      : dialLevel === 'settings'
        ? settingsActions
        : mainActions;
  const dialKey = dialLevel;
  const dialAriaLabel =
    dialLevel === 'nav'
      ? 'Main navigation'
      : dialLevel === 'settings'
        ? 'Settings actions'
        : 'Board actions';

  return (
    <>
      <div
        className={`mobile-bottom-app-bar${visibleStatusTabs ? ' has-status-tabs' : ''}`}
        aria-hidden="false"
      >
        <div className="mobile-bottom-app-bar-surface">
          {visibleStatusTabs ? (
            <BoardStatusTabs
              columns={visibleStatusTabs.columns}
              activeStatus={visibleStatusTabs.activeStatus}
              counts={visibleStatusTabs.counts}
              onChange={visibleStatusTabs.onChange}
            />
          ) : null}
        </div>
      </div>

      {/* Sibling of the bar so open dial never grows bar height/background. */}
      <div
        ref={rootRef}
        className={`mobile-board-fab${menuOpen ? ' is-open' : ''}${
          visibleStatusTabs ? ' has-status-tabs' : ''
        }`}
      >
        <div
          className={`mobile-board-fab-dial${
            dialLevel === 'nav' ? ' is-nav-list' : ''
          }`}
          role="menu"
          aria-label={dialAriaLabel}
        >
          {menuOpen
            ? dialActions.map((action) => (
                <DialActionButton
                  key={`${dialKey}-${action.id}`}
                  action={action}
                  labeled={dialLevel === 'nav'}
                />
              ))
            : null}
        </div>

        <motion.button
          type="button"
          className="mobile-board-fab-button ios-haptic-host"
          aria-label={menuOpen ? 'Close actions' : 'Open actions'}
          aria-expanded={menuOpen}
          onClick={() => {
            vibrateSafe(10);
            setMenuOpen((open) => !open);
          }}
          animate={reducedMotion ? undefined : { rotate: menuOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        >
          <span className="mobile-board-fab-icon" aria-hidden="true">
            <NewTaskIcon className="mobile-board-fab-glyph" />
          </span>
          <IosHapticHit />
        </motion.button>
      </div>

      {isBoardShell && actions ? (
        <MobileQuickCreateSheet
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={actions.onCreated}
          scope={actions.scope}
        />
      ) : null}
    </>
  );
}
