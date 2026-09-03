export function sessionHubSubtitle(opts: {
  candidateCount: number;
  recommendedName: string | null;
}): string {
  if (opts.candidateCount <= 0) return 'Needs AI';
  const pick = opts.recommendedName?.trim() || '';
  return pick ? `Your pick: ${pick}` : 'No pick yet';
}

export function hubOrgProjectFiltersVisible(
  items: Array<{ orgId: string; projectId: string }>,
): { org: boolean; project: boolean } {
  const orgs = new Set(items.map((item) => item.orgId));
  const projects = new Set(items.map((item) => item.projectId));
  return { org: orgs.size > 1, project: projects.size > 1 };
}
