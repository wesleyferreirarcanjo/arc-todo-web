/**
 * All-tasks board cards (including nested subtasks) share action handlers.
 * Always resolve by the clicked task id — never fall back to a parent closure.
 */
export function resolveBoardActionTarget<T extends { id: string }>(
  tasksById: Map<string, T>,
  clickedTaskId: string,
): T | undefined {
  return tasksById.get(clickedTaskId);
}
