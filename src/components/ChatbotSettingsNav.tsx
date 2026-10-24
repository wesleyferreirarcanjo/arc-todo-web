import { NavLink } from 'react-router-dom';

const settingsTabs = [
  { to: '/settings/chatbot', label: 'Chatbot', end: true },
  { to: '/settings/chatbot/testing', label: 'Testing', end: false },
  { to: '/settings/mcp-tools', label: 'MCP Tools', end: false },
  { to: '/settings/storage', label: 'Storage', end: false },
  { to: '/settings/seo', label: 'SEO', end: false },
] as const;

export function ChatbotSettingsNav() {
  return (
    <nav className="settings-page-tabs" aria-label="Settings">
      {settingsTabs.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
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
