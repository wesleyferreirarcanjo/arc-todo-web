import { useTheme } from '../context/ThemeContext';

function SunIcon({ className = 'theme-icon' }: { className?: string }) {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className = 'theme-icon' }: { className?: string }) {
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface ThemeToggleProps {
  variant?: 'header' | 'sidebar';
  collapsed?: boolean;
}

export function ThemeToggle({ variant = 'header', collapsed = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const sidebarLabel = isDark ? 'Light mode' : 'Dark mode';

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        className="sidebar-footer-btn"
        onClick={toggleTheme}
        aria-label={label}
        data-tooltip={collapsed ? sidebarLabel : undefined}
      >
        {isDark ? <SunIcon className="sidebar-nav-icon" /> : <MoonIcon className="sidebar-nav-icon" />}
        {!collapsed && <span className="sidebar-nav-label">{sidebarLabel}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-secondary theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
