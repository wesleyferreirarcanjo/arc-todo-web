import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Breadcrumbs } from './Breadcrumbs';
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

const primaryNav = [
  { to: '/board', label: 'All tasks', icon: TasksIcon },
  { to: '/knowledge', label: 'Knowledge', icon: KnowledgeIcon },
  { to: '/people', label: 'People', icon: PeopleIcon },
  { to: '/organizations', label: 'Organizations', icon: OrganizationsIcon, end: false as const },
] as const;

export function Layout() {
  const { logout } = useAuth();
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isBoardPage = location.pathname === '/board';

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) {
      return;
    }

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty(
        '--app-header-height',
        `${header.offsetHeight}px`,
      );
    };

    syncHeaderHeight();

    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(header);
    window.addEventListener('resize', syncHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncHeaderHeight);
    };
  }, []);

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
        setSettingsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
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
        setSettingsOpen(false);
      }
      return next;
    });
  }

  return (
    <div className={`app-shell${collapsed ? ' is-sidebar-collapsed' : ''}`}>
      <header ref={headerRef} className="app-header">
        <div>
          <h1>Arc Todo</h1>
          <p className="subtitle">Organization workspace</p>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

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
          </nav>

          {!collapsed && (
            <div className="sidebar-context">
              <ProjectNavList />
              <OrgKnowledgeNav />
            </div>
          )}

          <div className="sidebar-footer" ref={settingsRef}>
            <button
              type="button"
              className="sidebar-settings-trigger"
              aria-expanded={settingsOpen}
              aria-haspopup="menu"
              aria-label="Settings"
              data-tooltip={collapsed ? 'Settings' : undefined}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <ConfigIcon />
              {!collapsed && <span className="sidebar-nav-label">Settings</span>}
            </button>

            {settingsOpen && (
              <div className="sidebar-settings-menu" role="menu">
                <p className="sidebar-settings-category">AI</p>
                <NavLink
                  to="/settings/chatbot"
                  role="menuitem"
                  className={({ isActive }) =>
                    isActive
                      ? 'sidebar-settings-menu-item active'
                      : 'sidebar-settings-menu-item'
                  }
                  onClick={() => setSettingsOpen(false)}
                >
                  <ChatbotIcon />
                  Chatbot
                </NavLink>
                <NavLink
                  to="/settings/mcp-tools"
                  role="menuitem"
                  className={({ isActive }) =>
                    isActive
                      ? 'sidebar-settings-menu-item active'
                      : 'sidebar-settings-menu-item'
                  }
                  onClick={() => setSettingsOpen(false)}
                >
                  <McpIcon />
                  MCP Tools
                </NavLink>
              </div>
            )}
          </div>
        </aside>

        <ChatProvider>
          <div className={`content-area${isBoardPage ? ' is-board-page' : ''}`}>
            <Breadcrumbs />
            <main className={`app-main${isBoardPage ? ' is-board-page' : ''}`}>
              <Outlet />
            </main>
          </div>

          <ChatWidget />
        </ChatProvider>
      </div>
    </div>
  );
}
