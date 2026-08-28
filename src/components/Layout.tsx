import { useEffect, useRef, useState, type CSSProperties, type FocusEvent } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BoardMobileShellProvider } from '../context/BoardMobileShellContext';
import { ThemeToggle } from './ThemeToggle';
import { WorkspaceIdentity } from './WorkspaceIdentity';
import { entityAccentStyle, useWorkspaceAccent } from './WorkspaceChrome';
import { PwaControls } from './PwaControls';
import { OfflineBanner } from './OfflineBanner';
import { ChatProvider } from '../context/ChatContext';
import { SmartCopyBasketProvider } from '../context/SmartCopyBasketContext';
import { ChatWidget } from './ChatWidget';
import { MobileBoardFab } from './MobileBoardFab';
import { SmartCopyBasketTray } from './SmartCopyBasketTray';
import {
  getSidebarCollapsed,
  setSidebarCollapsed,
} from '../lib/storage/appStorage';
import { useDocumentChrome } from '../hooks/useDocumentChrome';
import { SHELL_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { isBoardShellPath } from '../lib/board/boardShellPath';
import { contrastInk } from '../lib/brand/brandMark';
import {
  BrandMarkIcon,
  ChatbotIcon,
  ChevronIcon,
  ConfigIcon,
  DiagramsIcon,
  KnowledgeIcon,
  LogoutIcon,
  McpIcon,
  NamesIcon,
  OrganizationsIcon,
  PeopleIcon,
  RagIcon,
  StorageIcon,
  TasksIcon,
  AnalyticsIcon,
  DownloadIcon,
  UsersIcon,
  WireframesIcon,
} from './icons';

const primaryNav = [
  { to: '/board', label: 'All tasks', icon: TasksIcon },
  { to: '/knowledge', label: 'Knowledge', icon: KnowledgeIcon },
  { to: '/diagrams', label: 'Diagrams', icon: DiagramsIcon },
  { to: '/wireframes', label: 'Wireframes', icon: WireframesIcon },
  { to: '/names', label: 'Names', icon: NamesIcon },
  { to: '/people', label: 'People', icon: PeopleIcon },
  { to: '/organizations', label: 'Organizations', icon: OrganizationsIcon, end: true as const },
  { to: '/download', label: 'Download', icon: DownloadIcon },
] as const;

export function Layout() {
  useDocumentChrome();
  const { logout, isAdmin } = useAuth();
  const { color: workspaceColor } = useWorkspaceAccent();
  const location = useLocation();
  const settingsRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const isMobileShell = useMediaQuery(SHELL_MOBILE_QUERY);
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ragMenuOpen, setRagMenuOpen] = useState(
    () => location.pathname.startsWith('/settings/rag'),
  );
  const isSettingsPage = location.pathname.startsWith('/settings');
  const isAdminUsersPage = location.pathname.startsWith('/admin/users');
  const isAnalyticsPage = location.pathname.startsWith('/analytics');
  const isRagSettingsPage = location.pathname.startsWith('/settings/rag');
  const isBoardShell = isBoardShellPath(location.pathname);

  useEffect(() => {
    if (location.pathname.startsWith('/settings/rag')) {
      setRagMenuOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar || !isMobileShell) {
      document.documentElement.style.removeProperty('--mobile-top-nav-height');
      return;
    }

    function syncTopNavHeight() {
      if (!sidebarRef.current) return;
      document.documentElement.style.setProperty(
        '--mobile-top-nav-height',
        `${sidebarRef.current.offsetHeight}px`,
      );
    }

    syncTopNavHeight();
    const observer = new ResizeObserver(syncTopNavHeight);
    observer.observe(sidebar);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--mobile-top-nav-height');
    };
  }, [isMobileShell]);

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
        <aside
          ref={sidebarRef}
          className={`sidebar${collapsed ? ' is-collapsed' : ''}${
            workspaceColor ? ' has-accent' : ''
          }`}
          style={entityAccentStyle(workspaceColor)}
        >
          <div className="sidebar-header">
            <button
              type="button"
              className={`sidebar-toggle${collapsed ? ' is-collapsed' : ' is-expanded'}${
                collapsed && workspaceColor ? ' is-entity-mark' : ''
              }`}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              data-tooltip={collapsed ? 'Expand sidebar' : undefined}
              onClick={toggleSidebar}
              style={
                collapsed && workspaceColor
                  ? ({
                      ...entityAccentStyle(workspaceColor),
                      '--mark-ink': contrastInk(workspaceColor),
                    } as CSSProperties)
                  : undefined
              }
            >
              {collapsed ? (
                <BrandMarkIcon className="sidebar-toggle-icon sidebar-toggle-mark" />
              ) : (
                <ChevronIcon className="sidebar-toggle-icon" expanded={!collapsed} />
              )}
            </button>
          </div>

          <WorkspaceIdentity collapsed={collapsed} />

          <nav className="sidebar-primary-nav" aria-label="Main navigation">
            {primaryNav.map(({ to, label, icon: NavIcon, ...rest }) => (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                data-tooltip={collapsed ? label : undefined}
                className={({ isActive }) => {
                  const diagramsActive =
                    to === '/diagrams' &&
                    (location.pathname === '/diagrams' ||
                      /\/projects\/[^/]+\/diagrams(?:\/|$)/.test(
                        location.pathname,
                      ));
                  const wireframesActive =
                    to === '/wireframes' &&
                    (location.pathname === '/wireframes' ||
                      /\/projects\/[^/]+\/wireframes(?:\/|$)/.test(
                        location.pathname,
                      ));
                  const namesActive =
                    to === '/names' &&
                    (location.pathname === '/names' ||
                      /\/projects\/[^/]+\/names(?:\/|$)/.test(
                        location.pathname,
                      ));
                  return isActive || diagramsActive || wireframesActive || namesActive
                    ? 'sidebar-nav-link active'
                    : 'sidebar-nav-link';
                }}
                {...rest}
              >
                <NavIcon className="sidebar-nav-icon" />
                <span className="sidebar-nav-label">{label}</span>
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/analytics"
                aria-label="Analytics"
                data-tooltip={collapsed ? 'Analytics' : undefined}
                className={({ isActive }) =>
                  isActive || isAnalyticsPage
                    ? 'sidebar-nav-link active'
                    : 'sidebar-nav-link'
                }
              >
                <AnalyticsIcon className="sidebar-nav-icon" />
                <span className="sidebar-nav-label">Analytics</span>
              </NavLink>
            )}
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
                <UsersIcon className="sidebar-nav-icon" />
                <span className="sidebar-nav-label">Users</span>
              </NavLink>
            )}
          </nav>

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
                <ConfigIcon className="sidebar-settings-icon" />
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
                    <ChatbotIcon className="sidebar-menu-item-icon" />
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
                    <McpIcon className="sidebar-menu-item-icon" />
                    MCP Tools
                  </NavLink>
                  <p className="sidebar-settings-category">System</p>
                  <NavLink
                    to="/settings/storage"
                    role="menuitem"
                    className={({ isActive }) =>
                      isActive
                        ? 'sidebar-settings-menu-item active'
                        : 'sidebar-settings-menu-item'
                    }
                    onClick={closeSettingsMenu}
                  >
                    <StorageIcon className="sidebar-menu-item-icon" />
                    Storage
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
                    <RagIcon className="sidebar-menu-item-icon" />
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
            <PwaControls collapsed={collapsed} />
            <button
              type="button"
              className="sidebar-footer-btn sidebar-logout-btn"
              aria-label="Logout"
              data-tooltip={collapsed ? 'Logout' : undefined}
              onClick={logout}
            >
              <LogoutIcon className="sidebar-logout-icon" />
              {!collapsed && <span className="sidebar-nav-label">Logout</span>}
            </button>
          </div>
        </aside>

        <ChatProvider>
          <BoardMobileShellProvider>
            <SmartCopyBasketProvider>
              <div
                className={`content-area${isBoardShell ? ' is-board-page' : ''}`}
                key={isBoardShell ? 'board-shell' : 'page-shell'}
              >
                <OfflineBanner />
                <main className={`app-main${isBoardShell ? ' is-board-page' : ''}`}>
                  <Outlet />
                </main>
              </div>

              <SmartCopyBasketTray />
              <ChatWidget />
              <MobileBoardFab />
            </SmartCopyBasketProvider>
          </BoardMobileShellProvider>
        </ChatProvider>
      </div>
    </div>
  );
}
