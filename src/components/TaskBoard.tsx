import type { Task, TaskPriority, TaskStatus } from '../types/todo';
import { TaskCard } from './TaskCard';

interface TaskBoardProps {
  tasks: Task[];
  onUpdate: (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
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

export function TaskBoard({ tasks, onUpdate, onDelete }: TaskBoardProps) {
  return (
    <div className="task-board">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status);

        return (
          <section key={column.status} className="board-column">
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
