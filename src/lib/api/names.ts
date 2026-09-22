import { apiRequest } from './client';
import type {
  CandidateReaction,
  CreateNameSessionInput,
  NameCandidate,
  ProjectNameSession,
  ProjectNameSessionSummary,
  UpdateNameSessionInput,
} from '../../types/name-session';
import { DEFAULT_NAMING_GOAL } from '../names/catalog';

const NAMES_BASE = '/name-sessions';

function sessionPath(sessionId: string): string {
  return `${NAMES_BASE}/${sessionId}`;
}

export function fetchNameSessions(): Promise<ProjectNameSessionSummary[]> {
  return apiRequest<ProjectNameSessionSummary[]>(NAMES_BASE);
}

export function fetchNameSession(
  sessionId: string,
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}`,
  );
}

export function createNameSessionBasics(
  title: string,
  whatItIs = '',
  namingGoal = DEFAULT_NAMING_GOAL,
  participationMode: CreateNameSessionInput['participationMode'] = 'solo',
): CreateNameSessionInput {
  const product = whatItIs.trim();
  return {
    title,
    brief: title,
    namingGoal,
    participationMode,
    productDescription: product ? { whatItIs: product } : {},
  };
}

export function createNameSession(
  input: CreateNameSessionInput,
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(NAMES_BASE, {
    method: 'POST',
    body: input,
  });
}

export function updateNameSession(
  sessionId: string,
  input: UpdateNameSessionInput,
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}`,
    { method: 'PATCH', body: input },
  );
}

export function deleteNameSession(
  sessionId: string,
): Promise<void> {
  return apiRequest<void>(`${sessionPath(sessionId)}`, {
    method: 'DELETE',
  });
}

export function checkNameCandidate(
  sessionId: string,
  name: string,
): Promise<NameCandidate> {
  return apiRequest<NameCandidate>(
    `${sessionPath(sessionId)}/check`,
    { method: 'POST', body: { name } },
  );
}

export function checkNameCandidatesBatch(
  sessionId: string,
  names: string[],
): Promise<{ candidates: NameCandidate[] }> {
  return apiRequest<{ candidates: NameCandidate[] }>(
    `${sessionPath(sessionId)}/check-batch`,
    { method: 'POST', body: { names } },
  );
}

export function checkNameHistory(
  sessionId: string,
  name: string,
): Promise<NameCandidate> {
  return apiRequest<NameCandidate>(
    `${sessionPath(sessionId)}/check-history`,
    { method: 'POST', body: { name } },
  );
}

export function checkNameHandles(
  sessionId: string,
  name: string,
): Promise<NameCandidate> {
  return apiRequest<NameCandidate>(
    `${sessionPath(sessionId)}/check-handles`,
    { method: 'POST', body: { name } },
  );
}

export function addNameCandidates(
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
    `${sessionPath(sessionId)}/candidates`,
    { method: 'POST', body: { candidates, source } },
  );
}

export function upsertNameCandidateRating(
  sessionId: string,
  candidateId: string,
  input: { overall?: number; notes?: string },
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}/candidates/${candidateId}/rating`,
    { method: 'PUT', body: input },
  );
}

export function setNameCandidateReaction(
  sessionId: string,
  candidateId: string,
  input: { reaction: CandidateReaction | null },
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}/candidates/${candidateId}/reaction`,
    { method: 'PUT', body: input },
  );
}

export function setNameCandidateFavorite(
  sessionId: string,
  candidateId: string,
  input: { favorited: boolean },
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}/candidates/${candidateId}/favorite`,
    { method: 'PUT', body: input },
  );
}

export function startNameBatch(
  sessionId: string,
  input: { candidateIds: string[] },
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}/batches`,
    { method: 'POST', body: input },
  );
}

export function crownNameBatchWinner(
  sessionId: string,
  batchNumber: number,
  input: { candidateId: string; decisionNote?: string },
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}/batches/${batchNumber}/winner`,
    { method: 'POST', body: input },
  );
}

export function setNameBatchFinalists(
  sessionId: string,
  batchNumber: number,
  input: { candidateIds: string[] },
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}/batches/${batchNumber}/finalists`,
    { method: 'POST', body: input },
  );
}

export function recommendNameCandidate(
  sessionId: string,
  candidateId: string,
  decisionNote?: string,
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}/recommend`,
    { method: 'POST', body: { candidateId, decisionNote } },
  );
}

export function startNameFeedbackRound(
  sessionId: string,
  candidateIds: string[],
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}/feedback-rounds`,
    { method: 'POST', body: { candidateIds } },
  );
}

export function upsertNameFeedback(
  sessionId: string,
  roundId: string,
  input: {
    candidateId?: string;
    reaction?: CandidateReaction;
    firstImpression?: string;
    rememberedSpelling?: string;
    perceivedPurpose?: string;
    ratings?: { easyToSay?: number; memorable?: number; fitsProduct?: number };
    concern?: string;
    responses?: Array<{
      candidateId: string;
      reaction: CandidateReaction;
      rememberedSpelling?: string;
      perceivedPurpose?: string;
      firstImpression?: string;
      concern?: string;
    }>;
  },
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}/feedback-rounds/${roundId}/responses`,
    { method: 'PUT', body: input },
  );
}

export function closeNameFeedbackRound(
  sessionId: string,
  roundId: string,
): Promise<ProjectNameSession> {
  return apiRequest<ProjectNameSession>(
    `${sessionPath(sessionId)}/feedback-rounds/${roundId}/close`,
    { method: 'POST' },
  );
}
