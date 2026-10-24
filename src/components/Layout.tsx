import { useEffect, useRef, useState, type CSSProperties, type FocusEvent } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BoardMobileShellProvider } from '../context/BoardMobileShellContext';
import { ThemeToggle } from './ThemeToggle';
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
import { entityAccentStyle, useWorkspaceAccent } from './WorkspaceChrome';
import { useDocumentChrome } from '../hooks/useDocumentChrome';
import { SHELL_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { isBoardShellPath, isTightPagePath } from '../lib/board/boardShellPath';
import { contrastInk } from '../lib/brand/brandMark';
import {
  groupForPath,
  isEntryActive,
  isLinkActive,
  visibleNav,
  type NavGroupId,
  type NavLinkEntry,
  type PrimaryNavEntry,
} from '../lib/nav/primaryNav';
import {
  BrandMarkIcon,
  ChatbotIcon,
  ChevronIcon,
  ConfigIcon,
  LogoutIcon,
  McpIcon,
  SeoIcon,
  StorageIcon,
} from './icons';

function SidebarNavLink({
  entry,
  pathname,
  tooltip,
  onNavigate,
}: {
  entry: NavLinkEntry;
  pathname: string;
  tooltip: boolean;
  onNavigate?: () => void;
}) {
  const Icon = entry.icon;
  const active = isLinkActive(entry, pathname);
  return (
    <NavLink
      to={entry.to}
      end={entry.end}
      aria-label={entry.label}
      data-tooltip={tooltip ? entry.label : undefined}
      className={() => (active ? 'sidebar-nav-link active' : 'sidebar-nav-link')}
      onClick={onNavigate}
    >
      <Icon className="sidebar-nav-icon" />
      <span className="sidebar-nav-label">{entry.label}</span>
    </NavLink>
  );
}

export function Layout({ tightPage = false }: { tightPage?: boolean }) {
  useDocumentChrome();
  const { logout, isAdmin } = useAuth();
  const { color: workspaceColor } = useWorkspaceAccent();
  const location = useLocation();
  const settingsRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const isMobileShell = useMediaQuery(SHELL_MOBILE_QUERY);
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navPath, setNavPath] = useState(location.pathname);
  const [groupOverride, setGroupOverride] = useState<NavGroupId | null | undefined>(
    undefined,
  );
  const [collapsedFlyout, setCollapsedFlyout] = useState<NavGroupId | null>(null);
  const isSettingsPage = location.pathname.startsWith('/settings');
  const isBoardShell = isBoardShellPath(location.pathname);
  const isTightPage =
    tightPage ||
    isTightPagePath(location.pathname) ||
    location.pathname === '/organizations' ||
    location.pathname === '/analytics' ||
    location.pathname === '/metrics' ||
    location.pathname === '/admin/users';
  const entries = visibleNav(isAdmin);

  if (navPath !== location.pathname) {
    // A route change drops the manual open/closed choice so the current page's group starts open.
    setNavPath(location.pathname);
    setGroupOverride(undefined);
    setCollapsedFlyout(null);
  }

  const openGroupId =
    groupOverride === undefined
      ? groupForPath(location.pathname, isAdmin)
      : groupOverride;

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
    if (!settingsOpen && !collapsedFlyout) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (settingsOpen && !settingsRef.current?.contains(target)) {
        closeSettingsMenu();
      }
      if (collapsedFlyout && !navRef.current?.contains(target)) {
        setCollapsedFlyout(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeSettingsMenu();
        setCollapsedFlyout(null);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [settingsOpen, collapsedFlyout]);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      setSidebarCollapsed(next);
      if (next) {
        closeSettingsMenu();
        setCollapsedFlyout(null);
      }
      return next;
    });
  }

  function toggleGroup(id: NavGroupId) {
    if (collapsed) {
      closeSettingsMenu();
      setCollapsedFlyout((current) => (current === id ? null : id));
      return;
    }
    setGroupOverride(openGroupId === id ? null : id);
  }

  function renderNavEntry(entry: PrimaryNavEntry) {
    if (entry.kind === 'link') {
      return (
        <SidebarNavLink
          key={entry.to}
          entry={entry}
          pathname={location.pathname}
          tooltip={collapsed}
        />
      );
    }

    const open = collapsed ? collapsedFlyout === entry.id : openGroupId === entry.id;
    const active = isEntryActive(entry, location.pathname);
    const Icon = entry.icon;
    return (
      <div key={entry.id} className="sidebar-nav-group">
        <button
          type="button"
          className={`sidebar-nav-link${active ? ' active' : ''}`}
          aria-expanded={open}
          aria-label={entry.label}
          data-tooltip={collapsed && !open ? entry.label : undefined}
          onClick={() => toggleGroup(entry.id)}
        >
          <Icon className="sidebar-nav-icon" />
          <span className="sidebar-nav-label">{entry.label}</span>
        </button>
        {open ? (
          <div
            className={collapsed ? 'sidebar-nav-flyout' : 'sidebar-nav-group-children'}
            role={collapsed ? 'group' : undefined}
            aria-label={collapsed ? entry.label : undefined}
          >
            {entry.children.map((child) => (
              <SidebarNavLink
                key={child.to}
                entry={child}
                pathname={location.pathname}
                tooltip={false}
                onNavigate={collapsed ? () => setCollapsedFlyout(null) : undefined}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
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

          <nav
            ref={navRef}
            className="sidebar-primary-nav"
            aria-label="Main navigation"
          >
            {entries
              .filter((entry) => entry.kind === 'link' && entry.isolated)
              .map((entry) => renderNavEntry(entry))}
            <hr className="sidebar-nav-divider" />
            {entries
              .filter((entry) => !(entry.kind === 'link' && entry.isolated))
              .map((entry) => renderNavEntry(entry))}
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
                onClick={() => {
                  setCollapsedFlyout(null);
                  setSettingsOpen((open) => !open);
                }}
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
                  <NavLink
                    to="/settings/seo"
                    role="menuitem"
                    className={({ isActive }) =>
                      isActive
                        ? 'sidebar-settings-menu-item active'
                        : 'sidebar-settings-menu-item'
                    }
                    onClick={closeSettingsMenu}
                  >
                    <SeoIcon className="sidebar-menu-item-icon" />
                    SEO
                  </NavLink>
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
                className={`content-area${isBoardShell ? ' is-board-page' : isTightPage ? ' is-tight-page' : ''}`}
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
