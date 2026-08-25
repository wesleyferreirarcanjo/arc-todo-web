import { useEffect, useState } from 'react';

function readToken(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function useChartColors() {
  const [colors, setColors] = useState({
    accent: '#4862ce',
    secondary: '#6846b8',
    tertiary: '#4a5d9c',
    text: '#e8ecf4',
    muted: '#9aa6bc',
    grid: 'rgba(142, 160, 188, 0.18)',
  });

  useEffect(() => {
    function sync() {
      setColors({
        accent: readToken('--accent', '#4862ce'),
        secondary: readToken('--accent-secondary', '#6846b8'),
        tertiary: readToken('--accent-tertiary', '#4a5d9c'),
        text: readToken('--text-primary', '#e8ecf4'),
        muted: readToken('--text-muted', '#9aa6bc'),
        grid: readToken('--border', 'rgba(142, 160, 188, 0.18)'),
      });
    }
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}
