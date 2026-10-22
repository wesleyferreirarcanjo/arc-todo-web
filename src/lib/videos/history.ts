import type { VideoEditState } from '../../types/video';

export const HISTORY_LIMIT = 100;

export interface History {
  past: VideoEditState[];
  present: VideoEditState;
  future: VideoEditState[];
}

export function createHistory(present: VideoEditState): History {
  return { past: [], present, future: [] };
}

export function pushHistory(history: History, next: VideoEditState): History {
  if (next === history.present) return history;
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
  };
}

export function undo(history: History): History {
  if (history.past.length === 0) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
  };
}

export function redo(history: History): History {
  if (history.future.length === 0) return history;
  const [present, ...future] = history.future;
  return {
    past: [...history.past, history.present],
    present,
    future,
  };
}

export function canUndo(history: History): boolean {
  return history.past.length > 0;
}

export function canRedo(history: History): boolean {
  return history.future.length > 0;
}
