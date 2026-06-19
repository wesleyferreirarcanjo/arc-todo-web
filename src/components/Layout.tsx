import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Breadcrumbs } from './Breadcrumbs';
import { OrgSwitcher } from './OrgSwitcher';
import { ProjectNavList } from './ProjectNavList';

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
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <OrgSwitcher />
          <ProjectNavList />
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
