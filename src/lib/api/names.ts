import { apiRequest } from './client';
import type {
  CreateNameSessionInput,
  NameCandidate,
  ProjectNameSession,
  ProjectNameSessionSummary,
  UpdateNameSessionInput,
} from '../../types/name-session';
import { DEFAULT_NAMING_GOAL } from '../names/catalog';

function namesBasePath(orgId: string, projectId: string): string {
  return `/organizations/${orgId}/projects/${projectId}/name-sessions`;
}

export function fetchProjectNameSessions(
  orgId: string,
  projectId: string,
): Promise<ProjectNameSessionSummary[]> {
  return apiRequest<ProjectNameSessionSummary[]>(namesBasePath(orgId, projectId));
}

export function fetchProjectNameSession(
  orgId: string,
  projectId: string,
  sessionId: string,
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${namesBasePath(orgId, projectId)}/${sessionId}`,
  );
}

export function createNameSessionBasics(
  title: string,
  whatItIs = '',
  namingGoal = DEFAULT_NAMING_GOAL,
): CreateNameSessionInput {
  const product = whatItIs.trim();
  return {
    title,
    brief: title,
    namingGoal,
    productDescription: product ? { whatItIs: product } : {},
  };
}

export function createProjectNameSession(
  orgId: string,
  projectId: string,
  input: CreateNameSessionInput,
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(namesBasePath(orgId, projectId), {
    method: 'POST',
    body: input,
  });
}

export function updateProjectNameSession(
  orgId: string,
  projectId: string,
  sessionId: string,
  input: UpdateNameSessionInput,
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${namesBasePath(orgId, projectId)}/${sessionId}`,
    { method: 'PATCH', body: input },
  );
}

export function deleteProjectNameSession(
  orgId: string,
  projectId: string,
  sessionId: string,
): Promise<void> {
  return apiRequest<void>(`${namesBasePath(orgId, projectId)}/${sessionId}`, {
    method: 'DELETE',
  });
}

export function checkNameCandidate(
  orgId: string,
  projectId: string,
  sessionId: string,
  name: string,
): Promise<NameCandidate> {
  return apiRequest<NameCandidate>(
    `${namesBasePath(orgId, projectId)}/${sessionId}/check`,
    { method: 'POST', body: { name } },
  );
}

export function checkNameCandidatesBatch(
  orgId: string,
  projectId: string,
  sessionId: string,
  names: string[],
): Promise<{ candidates: NameCandidate[] }> {
  return apiRequest<{ candidates: NameCandidate[] }>(
    `${namesBasePath(orgId, projectId)}/${sessionId}/check-batch`,
    { method: 'POST', body: { names } },
  );
}

export function checkNameHistory(
  orgId: string,
  projectId: string,
  sessionId: string,
  name: string,
): Promise<NameCandidate> {
  return apiRequest<NameCandidate>(
    `${namesBasePath(orgId, projectId)}/${sessionId}/check-history`,
    { method: 'POST', body: { name } },
  );
}

export function addNameCandidates(
  orgId: string,
  projectId: string,
  sessionId: string,
  candidates: Array<{
    name: string;
    family?: string;
    laneId?: string;
    rationale?: string;
  }>,
  source: 'human' | 'chatbot' | 'mcp' = 'human',
): Promise<{ candidates: NameCandidate[] }> {
  return apiRequest<{ candidates: NameCandidate[] }>(
    `${namesBasePath(orgId, projectId)}/${sessionId}/candidates`,
    { method: 'POST', body: { candidates, source } },
  );
}

export function recommendNameCandidate(
  orgId: string,
  projectId: string,
  sessionId: string,
  candidateId: string,
  decisionNote?: string,
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${namesBasePath(orgId, projectId)}/${sessionId}/recommend`,
    { method: 'POST', body: { candidateId, decisionNote } },
  );
}

export function startNameFeedbackRound(
  orgId: string,
  projectId: string,
  sessionId: string,
  candidateIds: string[],
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${namesBasePath(orgId, projectId)}/${sessionId}/feedback-rounds`,
    { method: 'POST', body: { candidateIds } },
  );
}

export function upsertNameFeedback(
  orgId: string,
  projectId: string,
  sessionId: string,
  roundId: string,
  input: {
    candidateId: string;
    firstImpression?: string;
    rememberedSpelling?: string;
    perceivedPurpose?: string;
    ratings?: { easyToSay?: number; memorable?: number; fitsProduct?: number };
    concern?: string;
  },
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${namesBasePath(orgId, projectId)}/${sessionId}/feedback-rounds/${roundId}/responses`,
    { method: 'PUT', body: input },
  );
}

export function closeNameFeedbackRound(
  orgId: string,
  projectId: string,
  sessionId: string,
  roundId: string,
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${namesBasePath(orgId, projectId)}/${sessionId}/feedback-rounds/${roundId}/close`,
    { method: 'POST' },
  );
}
