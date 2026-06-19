import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" className="btn btn-secondary" onClick={toggleTheme}>
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
