import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBoardMobileShell } from '../context/BoardMobileShellContext';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { SHELL_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { MobileQuickCreateSheet } from './MobileQuickCreateSheet';
import { BoardStatusTabs } from './BoardStatusTabs';

function FabGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      className="mobile-board-fab-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function FilterIcon() {
  return (
    <FabGlyph>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </FabGlyph>
  );
}

function NewTaskIcon() {
  return (
    <FabGlyph>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </FabGlyph>
  );
}

function ChatIcon() {
  return (
    <FabGlyph>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </FabGlyph>
  );
}

function SunIcon() {
  return (
    <FabGlyph>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </FabGlyph>
  );
}

function MoonIcon() {
  return (
    <FabGlyph>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </FabGlyph>
  );
}

function SettingsIcon() {
  return (
    <FabGlyph>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </FabGlyph>
  );
}

function LogoutIcon() {
  return (
    <FabGlyph>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </FabGlyph>
  );
}

function BackIcon() {
  return (
    <FabGlyph>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </FabGlyph>
  );
}

function McpIcon() {
  return (
    <FabGlyph>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </FabGlyph>
  );
}

function RagIcon() {
  return (
    <FabGlyph>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </FabGlyph>
  );
}

function StorageIcon() {
  return (
    <FabGlyph>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </FabGlyph>
  );
}

function FlaskIcon() {
  return (
    <FabGlyph>
      <path d="M10 2v7.31" />
      <path d="M14 9.3V2" />
      <path d="M8.5 2h7" />
      <path d="M7 16.5A5 5 0 0 0 12 22a5 5 0 0 0 5-5.5V9.3H7z" />
    </FabGlyph>
  );
}

function NavigateIcon() {
  return (
    <FabGlyph>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </FabGlyph>
  );
}

function TasksIcon() {
  return (
    <FabGlyph>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </FabGlyph>
  );
}

function InstallIcon() {
  return (
    <FabGlyph>
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M4 19h16" />
    </FabGlyph>
  );
}

function BellIcon() {
  return (
    <FabGlyph>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </FabGlyph>
  );
}

function KnowledgeIcon() {
  return (
    <FabGlyph>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </FabGlyph>
  );
}

function DiagramsIcon() {
  return (
    <FabGlyph>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 15l3-3 2 2 5-5" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </FabGlyph>
  );
}

function WireframesIcon() {
  return (
    <FabGlyph>
      <rect x="4" y="6" width="14" height="14" rx="1" />
      <path d="M8 6V4h12v14h-2" />
    </FabGlyph>
  );
}

function PeopleIcon() {
  return (
    <FabGlyph>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </FabGlyph>
  );
}

function OrganizationsIcon() {
  return (
    <FabGlyph>
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
    </FabGlyph>
  );
}

function UsersIcon() {
  return (
    <FabGlyph>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </FabGlyph>
  );
}

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
        className={`mobile-board-fab-dial-item${
          action.danger ? ' is-danger' : ''
        }${labeled ? ' is-labeled' : ''}`}
        onClick={action.onClick}
      >
        {action.icon}
        {labeled ? (
          <span className="mobile-board-fab-dial-label">{action.label}</span>
        ) : null}
      </button>
    </div>
  );
}

export function MobileBoardFab() {
  const isMobileShell = useMediaQuery(SHELL_MOBILE_QUERY);
  const location = useLocation();
  const navigate = useNavigate();
  const isBoardPage = location.pathname === '/board';
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
        icon: <LogoutIcon />,
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
    if (actions) {
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
        className={`mobile-bottom-app-bar${statusTabs ? ' has-status-tabs' : ''}`}
        aria-hidden="false"
      >
        <div className="mobile-bottom-app-bar-surface">
          {statusTabs ? (
            <BoardStatusTabs
              columns={statusTabs.columns}
              activeStatus={statusTabs.activeStatus}
              counts={statusTabs.counts}
              onChange={statusTabs.onChange}
            />
          ) : null}
        </div>
      </div>

      {/* Sibling of the bar so open dial never grows bar height/background. */}
      <div
        ref={rootRef}
        className={`mobile-board-fab${menuOpen ? ' is-open' : ''}${
          statusTabs ? ' has-status-tabs' : ''
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
          className="mobile-board-fab-button"
          aria-label={menuOpen ? 'Close actions' : 'Open actions'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          animate={reducedMotion ? undefined : { rotate: menuOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        >
          <span className="mobile-board-fab-icon" aria-hidden="true">
            <NewTaskIcon />
          </span>
        </motion.button>
      </div>

      {actions ? (
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
