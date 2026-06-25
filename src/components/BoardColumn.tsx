import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import type { TaskStatus } from '../types/todo';
import { getColumnDroppableId } from '../lib/board/useTaskBoardDnd';
import { useMotionTransition } from '../lib/motion/useMotionTransition';
import { EyeIcon } from './EyeIcon';

interface BoardColumnProps {
  status: TaskStatus;
  title: string;
  taskCount: number;
  isDropTarget: boolean;
  isFocused: boolean;
  isCompact: boolean;
  isColumnHidden?: boolean;
  canHideColumn?: boolean;
  focusEnabled?: boolean;
  onFocus: () => void;
  onToggleVisibility?: () => void;
  children: ReactNode;
}

export function BoardColumn({
  status,
  title,
  taskCount,
  isDropTarget,
  isFocused,
  isCompact,
  isColumnHidden = false,
  canHideColumn = true,
  focusEnabled = true,
  onFocus,
  onToggleVisibility,
  children,
}: BoardColumnProps) {
  const { base } = useMotionTransition();
  const { setNodeRef, isOver } = useDroppable({
    id: getColumnDroppableId(status),
  });

  const highlighted = isDropTarget || isOver;
  const isEmpty = taskCount === 0;
  const hideBlocked = !isColumnHidden && !canHideColumn;

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (!focusEnabled || isColumnHidden) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onFocus();
    }
  }

  function handleToggleVisibility(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (hideBlocked) return;
    onToggleVisibility?.();
  }

  return (
    <motion.section
      ref={setNodeRef}
      className={`board-column${isFocused ? ' is-focused' : ''}${isCompact ? ' is-compact' : ''}${isEmpty ? ' is-empty' : ''}${highlighted ? ' is-drop-target' : ''}${isColumnHidden ? ' is-column-hidden' : ''}`}
      tabIndex={focusEnabled && !isColumnHidden ? 0 : undefined}
      role={focusEnabled && !isColumnHidden ? 'button' : undefined}
      aria-pressed={focusEnabled && !isColumnHidden ? isFocused : undefined}
      aria-label={`${title} column, ${taskCount} tasks${isColumnHidden ? ', hidden' : ''}`}
      onClick={focusEnabled && !isColumnHidden ? onFocus : undefined}
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
        <div className="board-column-header-main">
          <h2>{title}</h2>
          {!isColumnHidden && <span className="count-badge">{taskCount}</span>}
        </div>
        {onToggleVisibility && (
          <button
            type="button"
            className={`board-column-visibility-toggle${isColumnHidden ? ' is-hidden' : ''}`}
            aria-label={
              isColumnHidden ? `Show ${title} column` : `Hide ${title} column`
            }
            aria-pressed={!isColumnHidden}
            disabled={hideBlocked}
            title={
              hideBlocked
                ? 'At least one column must stay visible'
                : isColumnHidden
                  ? `Show ${title}`
                  : `Hide ${title}`
            }
            onClick={handleToggleVisibility}
          >
            <EyeIcon visible={!isColumnHidden} />
          </button>
        )}
      </header>
      {!isColumnHidden && <div className="board-column-body">{children}</div>}
    </motion.section>
  );
}
