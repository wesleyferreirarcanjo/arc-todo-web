const ENTITY_ACCENTS = [
  '#fafafa',
  '#d4d4d4',
  '#a3a3a3',
  '#737373',
  '#525252',
];

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
