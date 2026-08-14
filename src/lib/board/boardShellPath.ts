/** Exact All tasks or project Kanban — not Knowledge, diagrams, wireframes, or nested project routes. */
const PROJECT_BOARD_PATH = /^\/organizations\/[^/]+\/projects\/[^/]+$/;

export function isBoardShellPath(pathname: string): boolean {
  return pathname === '/board' || PROJECT_BOARD_PATH.test(pathname);
}
