import { useLayoutEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Breadcrumbs } from './Breadcrumbs';
import { OrgKnowledgeNav } from './OrgKnowledgeNav';
import { ProjectNavList } from './ProjectNavList';
import { ThemeToggle } from './ThemeToggle';

function SettingsIcon() {
  return (
    <svg
      className="sidebar-settings-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

export function Layout() {
  const { logout } = useAuth();
  const headerRef = useRef<HTMLElement>(null);

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

  return (
    <div className="app-shell">
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
        <aside className="sidebar">
          <nav className="sidebar-primary-nav" aria-label="Main navigation">
            <NavLink
              to="/board"
              className={({ isActive }) =>
                isActive ? 'sidebar-nav-link active' : 'sidebar-nav-link'
              }
            >
              All tasks
            </NavLink>
            <NavLink
              to="/knowledge"
              className={({ isActive }) =>
                isActive ? 'sidebar-nav-link active' : 'sidebar-nav-link'
              }
            >
              Knowledge
            </NavLink>
            <NavLink
              to="/people"
              className={({ isActive }) =>
                isActive ? 'sidebar-nav-link active' : 'sidebar-nav-link'
              }
            >
              People
            </NavLink>
            <NavLink
              to="/organizations"
              end={false}
              className={({ isActive }) =>
                isActive ? 'sidebar-nav-link active' : 'sidebar-nav-link'
              }
            >
              Organizations
            </NavLink>
          </nav>

          <div className="sidebar-context">
            <ProjectNavList />
            <OrgKnowledgeNav />
          </div>

          <nav className="sidebar-footer" aria-label="Settings">
            <p className="sidebar-label">Settings</p>
            <NavLink
              to="/settings/mcp-tools"
              className={({ isActive }) =>
                isActive
                  ? 'sidebar-settings-link active'
                  : 'sidebar-settings-link'
              }
            >
              <SettingsIcon />
              MCP Tools
            </NavLink>
          </nav>
        </aside>

        <div className="content-area">
          <Breadcrumbs />
          <main className="app-main">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
