import { apiRequest } from './client';
import type {
  AdvanceBoardCycleResponse,
  BoardCycleHistoryResponse,
  CurrentBoardCycleResponse,
} from '../../types/boardCycle';

export function fetchCurrentBoardCycle(
  orgId: string,
  projectId: string,
): Promise<CurrentBoardCycleResponse> {
  return apiRequest<CurrentBoardCycleResponse>(
    `/organizations/${orgId}/projects/${projectId}/board/cycle/current`,
  );
}

export function advanceBoardCycle(
  orgId: string,
  projectId: string,
): Promise<AdvanceBoardCycleResponse> {
  return apiRequest<AdvanceBoardCycleResponse>(
    `/organizations/${orgId}/projects/${projectId}/board/cycle/advance`,
    { method: 'POST' },
  );
}

export function fetchBoardCycleHistory(
  orgId: string,
  projectId: string,
): Promise<BoardCycleHistoryResponse> {
  return apiRequest<BoardCycleHistoryResponse>(
    `/organizations/${orgId}/projects/${projectId}/board/cycles/history`,
  );
}
