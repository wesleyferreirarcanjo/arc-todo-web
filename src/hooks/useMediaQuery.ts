import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Shell / FAB / full-page chat breakpoint (matches CSS max-width: 1023px). */
export const SHELL_MOBILE_QUERY = '(max-width: 1023px)';

/** Tabbed single-column board — same as the mobile shell so 901–1023 is not multi-column + FAB. */
export const BOARD_MOBILE_QUERY = SHELL_MOBILE_QUERY;
