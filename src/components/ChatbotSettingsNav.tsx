import { NavLink } from 'react-router-dom';

const chatbotTabs = [
  { to: '/settings/chatbot', label: 'Settings' },
  { to: '/settings/chatbot/testing', label: 'Testing' },
] as const;

export function ChatbotSettingsNav() {
  return (
    <nav className="settings-page-tabs" aria-label="Chatbot settings">
      {chatbotTabs.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/settings/chatbot'}
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
