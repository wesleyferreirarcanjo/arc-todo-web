import { NavLink } from 'react-router-dom';

const ragTabs = [
  { to: '/settings/rag/settings', label: 'Settings' },
  { to: '/settings/rag/chunks', label: 'Chunks' },
  { to: '/settings/rag/testing', label: 'Testing' },
] as const;

export function RagSettingsNav() {
  return (
    <nav className="settings-page-tabs" aria-label="RAG settings">
      {ragTabs.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            isActive ? 'settings-page-tab active' : 'settings-page-tab'
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
