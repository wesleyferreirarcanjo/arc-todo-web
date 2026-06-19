import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Breadcrumbs } from './Breadcrumbs';
import { OrgKnowledgeNav } from './OrgKnowledgeNav';
import { OrgSwitcher } from './OrgSwitcher';
import { ProjectNavList } from './ProjectNavList';
import { ThemeToggle } from './ThemeToggle';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Arc Todo</h1>
          <p className="subtitle">Organization workspace</p>
        </div>
        <div className="header-actions">
          <span className="user-badge">{user?.username}</span>
          <ThemeToggle />
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
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
          <OrgSwitcher />
          <ProjectNavList />
          <OrgKnowledgeNav />
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
