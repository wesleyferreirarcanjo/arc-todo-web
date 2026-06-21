import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import type { TaskStatus } from '../types/todo';
import { getColumnDroppableId } from '../lib/board/useTaskBoardDnd';
import { useMotionTransition } from '../lib/motion/useMotionTransition';

interface BoardColumnProps {
  status: TaskStatus;
  title: string;
  taskCount: number;
  isDropTarget: boolean;
  isFocused: boolean;
  isCompact: boolean;
  onFocus: () => void;
  children: ReactNode;
}

export function BoardColumn({
  status,
  title,
  taskCount,
  isDropTarget,
  isFocused,
  isCompact,
  onFocus,
  children,
}: BoardColumnProps) {
  const { base } = useMotionTransition();
  const { setNodeRef, isOver } = useDroppable({
    id: getColumnDroppableId(status),
  });

  const highlighted = isDropTarget || isOver;
  const isEmpty = taskCount === 0;

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onFocus();
    }
  }

  return (
    <motion.section
      ref={setNodeRef}
      className={`board-column${isFocused ? ' is-focused' : ''}${isCompact ? ' is-compact' : ''}${isEmpty ? ' is-empty' : ''}${highlighted ? ' is-drop-target' : ''}`}
      tabIndex={0}
      role="button"
      aria-pressed={isFocused}
      aria-label={`${title} column, ${taskCount} tasks`}
      onClick={onFocus}
      onKeyDown={handleKeyDown}
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
