import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OrgKnowledgeNav } from './OrgKnowledgeNav';
import { ProjectNavList } from './ProjectNavList';
import { ThemeToggle } from './ThemeToggle';
import { ChatProvider } from '../context/ChatContext';
import { ChatWidget } from './ChatWidget';
import {
  getSidebarCollapsed,
  setSidebarCollapsed,
} from '../lib/storage/appStorage';

function Icon({ children, className = 'sidebar-nav-icon' }: { children: ReactNode; className?: string }) {
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
      {children}
    </svg>
  );
}

function TasksIcon() {
  return (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}

function KnowledgeIcon() {
  return (
    <Icon>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Icon>
  );
}

function PeopleIcon() {
  return (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

function OrganizationsIcon() {
  return (
    <Icon>
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
    </Icon>
  );
}

function UsersIcon() {
  return (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

function ConfigIcon() {
  return (
    <Icon className="sidebar-settings-icon">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  );
}

function ChatbotIcon() {
  return (
    <Icon className="sidebar-menu-item-icon">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  );
}

function RagIcon() {
  return (
    <Icon className="sidebar-menu-item-icon">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
    </Icon>
  );
}

function McpIcon() {
  return (
    <Icon className="sidebar-menu-item-icon">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </Icon>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <Icon className="sidebar-toggle-icon">
      {expanded ? (
        <>
          <path d="M15 18l-6-6 6-6" />
          <path d="M3 6v12" />
        </>
      ) : (
        <>
          <path d="M9 18l6-6-6-6" />
          <path d="M21 6v12" />
        </>
      )}
    </Icon>
  );
}

function LogoutIcon() {
  return (
    <Icon className="sidebar-logout-icon">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Icon>
  );
}

const primaryNav = [
  { to: '/board', label: 'All tasks', icon: TasksIcon },
  { to: '/knowledge', label: 'Knowledge', icon: KnowledgeIcon },
  { to: '/people', label: 'People', icon: PeopleIcon },
  { to: '/organizations', label: 'Organizations', icon: OrganizationsIcon, end: false as const },
] as const;

export function Layout() {
  const { logout, isAdmin } = useAuth();
  const location = useLocation();
  const settingsRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ragMenuOpen, setRagMenuOpen] = useState(
    () => location.pathname.startsWith('/settings/rag'),
  );
  const isSettingsPage = location.pathname.startsWith('/settings');
  const isAdminUsersPage = location.pathname.startsWith('/admin/users');
  const isRagSettingsPage = location.pathname.startsWith('/settings/rag');
  const isBoardPage = location.pathname === '/board';
  const isKnowledgePage =
    location.pathname === '/knowledge' ||
    /^\/organizations\/[^/]+\/knowledge$/.test(location.pathname) ||
    /^\/organizations\/[^/]+\/projects\/[^/]+\/knowledge$/.test(
      location.pathname,
    );
  const isWorkspacePage = isBoardPage || isKnowledgePage;

  useEffect(() => {
    if (location.pathname.startsWith('/settings/rag')) {
      setRagMenuOpen(true);
    }
  }, [location.pathname]);

  function closeSettingsMenu() {
    setSettingsOpen(false);
  }

  function handleSettingsFlyoutBlur(event: FocusEvent<HTMLDivElement>) {
    if (!settingsOpen) {
      return;
    }
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) {
      return;
    }
    closeSettingsMenu();
  }

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-expanded-width)',
    );
  }, [collapsed]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!settingsRef.current?.contains(event.target as Node)) {
        closeSettingsMenu();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeSettingsMenu();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [settingsOpen]);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      setSidebarCollapsed(next);
      if (next) {
        closeSettingsMenu();
      }
      return next;
    });
  }

  return (
    <div className={`app-shell${collapsed ? ' is-sidebar-collapsed' : ''}`}>
      <div className="app-body">
        <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`}>
          <div className="sidebar-header">
            {!collapsed && <span className="sidebar-header-label">Navigation</span>}
            <button
              type="button"
              className={`sidebar-toggle${collapsed ? ' is-collapsed' : ' is-expanded'}`}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              data-tooltip={collapsed ? 'Expand sidebar' : undefined}
              onClick={toggleSidebar}
            >
              <ChevronIcon expanded={!collapsed} />
            </button>
          </div>

          <nav className="sidebar-primary-nav" aria-label="Main navigation">
            {primaryNav.map(({ to, label, icon: NavIcon, ...rest }) => (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                data-tooltip={collapsed ? label : undefined}
                className={({ isActive }) =>
                  isActive ? 'sidebar-nav-link active' : 'sidebar-nav-link'
                }
                {...rest}
              >
                <NavIcon />
                <span className="sidebar-nav-label">{label}</span>
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin/users"
                aria-label="Users"
                data-tooltip={collapsed ? 'Users' : undefined}
                className={({ isActive }) =>
                  isActive || isAdminUsersPage
                    ? 'sidebar-nav-link active'
                    : 'sidebar-nav-link'
                }
              >
                <UsersIcon />
                <span className="sidebar-nav-label">Users</span>
              </NavLink>
            )}
          </nav>

          {!collapsed && (
            <div className="sidebar-context">
              <ProjectNavList />
              <OrgKnowledgeNav />
            </div>
          )}

          <div className="sidebar-footer">
            {isAdmin && (
            <div
              className="sidebar-settings-flyout"
              ref={settingsRef}
              onBlur={handleSettingsFlyoutBlur}
            >
              <button
                type="button"
                className={`sidebar-settings-trigger${isSettingsPage ? ' active' : ''}`}
                aria-expanded={settingsOpen}
                aria-haspopup="menu"
                aria-label="Settings"
                data-tooltip={collapsed ? 'Settings' : undefined}
                onClick={() => setSettingsOpen((open) => !open)}
              >
                <ConfigIcon />
                {!collapsed && <span className="sidebar-nav-label">Settings</span>}
              </button>

              {settingsOpen ? (
                <div className="sidebar-settings-menu" role="menu">
                  <p className="sidebar-settings-category">AI</p>
                  <NavLink
                    to="/settings/chatbot"
                    end
                    role="menuitem"
                    className={({ isActive }) =>
                      isActive
                        ? 'sidebar-settings-menu-item active'
                        : 'sidebar-settings-menu-item'
                    }
                    onClick={closeSettingsMenu}
                  >
                    <ChatbotIcon />
                    Chatbot
                  </NavLink>
                  <NavLink
                    to="/settings/chatbot/testing"
                    role="menuitem"
                    className={({ isActive }) =>
                      isActive
                        ? 'sidebar-settings-menu-item sidebar-settings-submenu-item active'
                        : 'sidebar-settings-menu-item sidebar-settings-submenu-item'
                    }
                    onClick={closeSettingsMenu}
                  >
                    Testing
                  </NavLink>
                  <NavLink
                    to="/settings/mcp-tools"
                    role="menuitem"
                    className={({ isActive }) =>
                      isActive
                        ? 'sidebar-settings-menu-item active'
                        : 'sidebar-settings-menu-item'
                    }
                    onClick={closeSettingsMenu}
                  >
                    <McpIcon />
                    MCP Tools
                  </NavLink>
                  <p className="sidebar-settings-category">RAG</p>
                  <button
                    type="button"
                    role="menuitem"
                    className={`sidebar-settings-menu-item sidebar-settings-submenu-trigger${
                      ragMenuOpen ? ' is-open' : ''
                    }${isRagSettingsPage ? ' active' : ''}`}
                    aria-expanded={ragMenuOpen}
                    onClick={() => setRagMenuOpen((open) => !open)}
                  >
                    <RagIcon />
                    RAG
                    <span className="sidebar-settings-submenu-chevron" aria-hidden="true">
                      {ragMenuOpen ? '▾' : '▸'}
                    </span>
                  </button>
                  {ragMenuOpen ? (
                    <div className="sidebar-settings-submenu">
                      <NavLink
                        to="/settings/rag/settings"
                        role="menuitem"
                        className={({ isActive }) =>
                          isActive
                            ? 'sidebar-settings-menu-item sidebar-settings-submenu-item active'
                            : 'sidebar-settings-menu-item sidebar-settings-submenu-item'
                        }
                        onClick={closeSettingsMenu}
                      >
                        Settings
                      </NavLink>
                      <NavLink
                        to="/settings/rag/chunks"
                        role="menuitem"
                        className={({ isActive }) =>
                          isActive
                            ? 'sidebar-settings-menu-item sidebar-settings-submenu-item active'
                            : 'sidebar-settings-menu-item sidebar-settings-submenu-item'
                        }
                        onClick={closeSettingsMenu}
                      >
                        Chunks
                      </NavLink>
                      <NavLink
                        to="/settings/rag/testing"
                        role="menuitem"
                        className={({ isActive }) =>
                          isActive
                            ? 'sidebar-settings-menu-item sidebar-settings-submenu-item active'
                            : 'sidebar-settings-menu-item sidebar-settings-submenu-item'
                        }
                        onClick={closeSettingsMenu}
                      >
                        Testing
                      </NavLink>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            )}

            <ThemeToggle variant="sidebar" collapsed={collapsed} />
            <button
              type="button"
              className="sidebar-footer-btn sidebar-logout-btn"
              aria-label="Logout"
              data-tooltip={collapsed ? 'Logout' : undefined}
              onClick={logout}
            >
              <LogoutIcon />
              {!collapsed && <span className="sidebar-nav-label">Logout</span>}
            </button>
          </div>
        </aside>

        <ChatProvider>
          <div className={`content-area${isWorkspacePage ? ' is-board-page' : ''}`}>
            <main className={`app-main${isWorkspacePage ? ' is-board-page' : ''}`}>
              <Outlet />
            </main>
          </div>

          <ChatWidget />
        </ChatProvider>
      </div>
    </div>
  );
}
