const ENTITY_ACCENTS = [
  '#6b8fa8',
  '#8778a3',
  '#a07d8c',
  '#7a9178',
  '#a38b6a',
  '#7a8ea3',
  '#9a9268',
];

export const DEFAULT_PROJECT_COLOR = '#8778a3';

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
