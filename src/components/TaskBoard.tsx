import type { Task, TaskCriticity, TaskStatus } from '../types/todo';
import { TaskCard } from './TaskCard';
import { useBoardDragDrop } from '../lib/board/useBoardDragDrop';

interface TaskBoardProps {
  tasks: Task[];
  accentColor?: string;
  onUpdate: (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      criticity: TaskCriticity;
      dueDate: string | null;
    }>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
];

export function TaskBoard({ tasks, accentColor, onUpdate, onDelete }: TaskBoardProps) {
  const {
    draggingTaskId,
    dropTargetStatus,
    handleDragStart,
    handleDragEnd,
    handleDragOverColumn,
    handleDragLeaveColumn,
    handleDropOnColumn,
  } = useBoardDragDrop(async (taskId, status) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;
    await onUpdate(taskId, { status });
  });

  return (
    <div className="task-board">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status);
        const isDropTarget = dropTargetStatus === column.status;

        return (
          <section
            key={column.status}
            className={`board-column${isDropTarget ? ' is-drop-target' : ''}`}
            onDragOver={(event) => handleDragOverColumn(event, column.status)}
            onDragLeave={(event) => handleDragLeaveColumn(event, column.status)}
            onDrop={(event) => void handleDropOnColumn(event, column.status)}
          >
            <header className="board-column-header">
              <h2>{column.title}</h2>
              <span className="count-badge">{columnTasks.length}</span>
            </header>
            <div className="board-column-body">
              {columnTasks.length === 0 ? (
                <p className="empty-column">No tasks here yet.</p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    accentColor={accentColor}
                    draggable
                    isDragging={draggingTaskId === task.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
