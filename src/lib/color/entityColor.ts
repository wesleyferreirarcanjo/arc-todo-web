const ENTITY_ACCENTS = [
  '#22d3ee',
  '#a855f7',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#38bdf8',
  '#facc15',
];

export const DEFAULT_PROJECT_COLOR = '#a855f7';

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getEntityAccent(id: string): string {
  const index = hashString(id) % ENTITY_ACCENTS.length;
  return ENTITY_ACCENTS[index];
}

export function getProjectColor(project: { id: string; color?: string | null }): string {
  if (project.color && /^#[0-9A-Fa-f]{6}$/.test(project.color)) {
    return project.color;
  }
  return getEntityAccent(project.id);
}
