/** All tasks Kanban shell — not diagrams, wireframes, or nested project hubs. */
export function isBoardShellPath(pathname: string): boolean {
  return pathname === '/board';
}

/** Hubs that opt into All tasks padding/gap via `.content-area.is-tight-page`. */
export function isTightPagePath(pathname: string): boolean {
  const TIGHT_EXACT = new Set([
    '/organizations',
    '/diagrams',
    '/wireframes',
    '/videos',
    '/names',
    '/seo',
  ]);
  if (TIGHT_EXACT.has(pathname)) return true;
  if (/^\/organizations\/[^/]+$/.test(pathname)) return true;
  if (/^\/organizations\/[^/]+\/activity$/.test(pathname)) return true;
  return /^\/organizations\/[^/]+\/projects\/[^/]+\/(diagrams|wireframes|videos|seo)$/.test(
    pathname,
  );
}

/** One naming session — not the Names hub or a project session list. */
export function isNamesSessionPath(pathname: string): boolean {
  return (
    /^\/names\/[^/]+$/.test(pathname) ||
    /^\/organizations\/[^/]+\/projects\/[^/]+\/names\/[^/]+$/.test(pathname)
  );
}

/** Open All tasks already filtered to one project (replaces the retired dedicated project board). */
export function projectTasksHref(
  organizationId: string,
  projectId: string,
): string {
  const params = new URLSearchParams({
    organizationId,
    projectId,
  });
  return `/board?${params.toString()}`;
}
