/** All tasks Kanban shell — not Knowledge, diagrams, wireframes, or nested project hubs. */
export function isBoardShellPath(pathname: string): boolean {
  return pathname === '/board';
}

/** One naming session — not the Names hub or a project session list. */
export function isNamesSessionPath(pathname: string): boolean {
  return /^\/organizations\/[^/]+\/projects\/[^/]+\/names\/[^/]+$/.test(
    pathname,
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
