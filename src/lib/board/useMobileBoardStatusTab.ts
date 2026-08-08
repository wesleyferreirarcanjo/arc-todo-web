import { useEffect, useMemo, useState } from 'react';
import type { TaskStatus } from '../../types/todo';
import type { StatusColumn } from '../tasks/taskStatus';
import { getBoardStatusTab, setBoardStatusTab } from './boardStatusTab';

function pickDefaultStatus(
  columns: StatusColumn[],
  preferred: TaskStatus | null,
): TaskStatus | null {
  if (preferred && columns.some((column) => column.status === preferred)) {
    return preferred;
  }
  return columns[0]?.status ?? null;
}

export function useMobileBoardStatusTab(columns: StatusColumn[]): {
  activeStatus: TaskStatus | null;
  setActiveStatus: (status: TaskStatus) => void;
} {
  const [activeStatus, setActiveStatusState] = useState<TaskStatus | null>(() =>
    pickDefaultStatus(columns, getBoardStatusTab()),
  );

  useEffect(() => {
    setActiveStatusState((current) => {
      const next = pickDefaultStatus(columns, current ?? getBoardStatusTab());
      if (next) {
        setBoardStatusTab(next);
      }
      return next;
    });
  }, [columns]);

  const setActiveStatus = useMemo(
    () => (status: TaskStatus) => {
      setBoardStatusTab(status);
      setActiveStatusState(status);
    },
    [],
  );

  return { activeStatus, setActiveStatus };
}
