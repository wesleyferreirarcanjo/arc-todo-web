import { createNameSessionBasics } from '../api/names';
import type { CreateNameSessionInput } from '../../types/name-session';

export const OFFERINGS_REQUIRED_COPY =
  'Enter at least one offering to continue.';

export const MAX_OFFERINGS = 5;
export const MAX_CLUSTER_PRIMARIES = 8;

export function nonBlankOfferings(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function createNameSessionFromOfferings(
  title: string,
  offerings: string[],
  clusterPrimaries: string[] = [],
): CreateNameSessionInput {
  const { namingGoal: _omitted, ...basics } = createNameSessionBasics(
    title,
    nonBlankOfferings(offerings).join('; '),
  );
  const primaries = nonBlankOfferings(clusterPrimaries).slice(
    0,
    MAX_CLUSTER_PRIMARIES,
  );
  const extra =
    primaries.length > 0
      ? {
          problem: primaries.join('; '),
          includeWords: primaries.join('; '),
        }
      : {};
  return {
    ...basics,
    productDescription: {
      ...basics.productDescription,
      ...extra,
    },
  };
}
