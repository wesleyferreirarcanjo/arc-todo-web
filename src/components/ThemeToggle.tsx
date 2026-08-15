import { useTheme } from '../context/ThemeContext';
import { IosHapticHit } from './IosHapticHit';
import { MoonIcon, SunIcon } from './icons';

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
        className="sidebar-footer-btn ios-haptic-host"
        onClick={toggleTheme}
        aria-label={label}
        data-tooltip={collapsed ? sidebarLabel : undefined}
      >
        {isDark ? (
          <SunIcon className="sidebar-nav-icon" />
        ) : (
          <MoonIcon className="sidebar-nav-icon" />
        )}
        {!collapsed && <span className="sidebar-nav-label">{sidebarLabel}</span>}
        <IosHapticHit />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-secondary theme-toggle-btn ios-haptic-host"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {isDark ? <SunIcon className="theme-icon" /> : <MoonIcon className="theme-icon" />}
      <IosHapticHit />
    </button>
  );
}
