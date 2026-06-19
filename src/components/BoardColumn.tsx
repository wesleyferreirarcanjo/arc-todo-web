import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
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
    <motion.section
      ref={setNodeRef}
      className="board-column"
      animate={{ scale: highlighted ? 1.008 : 1 }}
      transition={base}
    >
      <motion.div
        className="board-column-drop-highlight"
        aria-hidden="true"
        initial={false}
        animate={{ opacity: highlighted ? 1 : 0 }}
        transition={base}
      />

      <motion.div
        className="board-column-drop-accent"
        aria-hidden="true"
        initial={false}
        animate={{
          opacity: highlighted ? 1 : 0.35,
          scaleX: highlighted ? 1 : 0.55,
        }}
        transition={base}
      />

      <header className="board-column-header">
        <h2>{title}</h2>
        <span className="count-badge">{taskCount}</span>
      </header>
      <div className="board-column-body">{children}</div>
    </motion.section>
  );
}
