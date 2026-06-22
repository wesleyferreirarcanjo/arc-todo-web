import type { Task } from './todo';

export type BoardCycleStatus = 'active' | 'closed';

export interface BoardCycle {
  id: string;
  organizationId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  status: BoardCycleStatus;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardCycleHistoryEntry {
  id: string;
  cycleId: string;
  organizationId: string;
  projectId: string;
  taskId: string;
  parentTaskId: string | null;
  displayId: string;
  taskNumber: number;
  title: string;
  status: 'done';
  completedAt: string;
  completionTimestampSource: string;
  archivedAt: string;
  createdAt: string;
}

export interface CurrentBoardCycleResponse {
  cycle: BoardCycle;
  tasks: Task[];
}

export interface AdvanceBoardCycleResponse {
  closedCycle: BoardCycle;
  nextCycle: BoardCycle;
  archivedCount: number;
}

export interface BoardCycleHistoryResponse {
  cycles: Array<BoardCycle & { entries: BoardCycleHistoryEntry[] }>;
}
