export type TaskCategory =
  | 'coding'
  | 'meeting'
  | 'design'
  | 'marketing'
  | 'other';

export const TASK_CATEGORIES: TaskCategory[] = [
  'coding',
  'meeting',
  'design',
  'marketing',
  'other',
];

export const DEFAULT_TASK_CATEGORY: TaskCategory = 'other';

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  coding: 'Coding',
  meeting: 'Meeting',
  design: 'Design',
  marketing: 'Marketing',
  other: 'Other',
};

export interface CodingTaskMetadata {
  repositoryUrl?: string;
  branch?: string;
  commits?: string[];
  pullRequestUrl?: string;
  deploymentUrl?: string;
  implementationNotes?: string;
}

export interface CodingMetadataFormState {
  repositoryUrl: string;
  branch: string;
  commits: string;
  pullRequestUrl: string;
  deploymentUrl: string;
  implementationNotes: string;
}

export function emptyCodingMetadataForm(): CodingMetadataFormState {
  return {
    repositoryUrl: '',
    branch: '',
    commits: '',
    pullRequestUrl: '',
    deploymentUrl: '',
    implementationNotes: '',
  };
}

export function codingMetadataFormFromTask(
  metadata: Record<string, unknown> | undefined,
): CodingMetadataFormState {
  const coding = (metadata ?? {}) as CodingTaskMetadata;
  return {
    repositoryUrl: coding.repositoryUrl ?? '',
    branch: coding.branch ?? '',
    commits: (coding.commits ?? []).join(', '),
    pullRequestUrl: coding.pullRequestUrl ?? '',
    deploymentUrl: coding.deploymentUrl ?? '',
    implementationNotes: coding.implementationNotes ?? '',
  };
}

function trimOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseCommitsInput(value: string): string[] | undefined {
  const commits = value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return commits.length > 0 ? commits : undefined;
}

export function buildTaskMetadataInput(
  category: TaskCategory,
  coding: CodingMetadataFormState,
): Record<string, unknown> | undefined {
  if (category !== 'coding') {
    return undefined;
  }

  const metadata: CodingTaskMetadata = {};
  const repositoryUrl = trimOrUndefined(coding.repositoryUrl);
  const branch = trimOrUndefined(coding.branch);
  const commits = parseCommitsInput(coding.commits);
  const pullRequestUrl = trimOrUndefined(coding.pullRequestUrl);
  const deploymentUrl = trimOrUndefined(coding.deploymentUrl);
  const implementationNotes = trimOrUndefined(coding.implementationNotes);

  if (repositoryUrl) metadata.repositoryUrl = repositoryUrl;
  if (branch) metadata.branch = branch;
  if (commits) metadata.commits = commits;
  if (pullRequestUrl) metadata.pullRequestUrl = pullRequestUrl;
  if (deploymentUrl) metadata.deploymentUrl = deploymentUrl;
  if (implementationNotes) metadata.implementationNotes = implementationNotes;

  return Object.keys(metadata).length > 0
    ? (metadata as Record<string, unknown>)
    : {};
}

export function formatTaskCategoryLabel(category: TaskCategory | string): string {
  if (category in TASK_CATEGORY_LABELS) {
    return TASK_CATEGORY_LABELS[category as TaskCategory];
  }
  return category;
}

export function parseMetadataColumn(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined || value === '') {
    return {};
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      throw new Error('metadata must be valid JSON');
    }
  }
  throw new Error('metadata must be a JSON object');
}

export function serializeMetadataColumn(
  metadata: Record<string, unknown> | undefined,
): string {
  return JSON.stringify(metadata ?? {});
}
