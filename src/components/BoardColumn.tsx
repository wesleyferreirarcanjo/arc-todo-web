import { useDroppable } from '@dnd-kit/core';
import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import type { TaskStatus } from '../types/todo';
import { getColumnDroppableId } from '../lib/board/useTaskBoardDnd';
import { useMotionTransition } from '../lib/motion/useMotionTransition';

interface BoardColumnProps {
  status: TaskStatus;
  title: string;
  taskCount: number;
  isDropTarget: boolean;
  children: ReactNode;
}

export function BoardColumn({
  status,
  title,
  taskCount,
  isDropTarget,
  children,
}: BoardColumnProps) {
  const { base } = useMotionTransition();
  const { setNodeRef, isOver } = useDroppable({
    id: getColumnDroppableId(status),
  });

  const highlighted = isDropTarget || isOver;

  return (
    <m.section
      ref={setNodeRef}
      className="board-column"
      animate={{
        borderColor: highlighted
          ? 'var(--accent)'
          : 'var(--border)',
        boxShadow: highlighted ? 'var(--drop-glow)' : 'var(--shadow-card)',
      }}
      transition={base}
    >
      <header className="board-column-header">
        <h2>{title}</h2>
        <span className="count-badge">{taskCount}</span>
      </header>
      <div className="board-column-body">{children}</div>
    </m.section>
  );
}
