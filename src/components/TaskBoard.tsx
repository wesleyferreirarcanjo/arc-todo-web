import type { Todo, TodoPriority, TodoStatus } from '../types/todo';
import { TaskCard } from './TaskCard';

interface TaskBoardProps {
  todos: Todo[];
  onUpdate: (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: TodoStatus;
      priority: TodoPriority;
      dueDate: string | null;
    }>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const columns: { status: TodoStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
];

export function TaskBoard({ todos, onUpdate, onDelete }: TaskBoardProps) {
  return (
    <div className="task-board">
      {columns.map((column) => {
        const columnTodos = todos.filter((todo) => todo.status === column.status);

        return (
          <section key={column.status} className="board-column">
            <header className="board-column-header">
              <h2>{column.title}</h2>
              <span className="count-badge">{columnTodos.length}</span>
            </header>
            <div className="board-column-body">
              {columnTodos.length === 0 ? (
                <p className="empty-column">No tasks here yet.</p>
              ) : (
                columnTodos.map((todo) => (
                  <TaskCard
                    key={todo.id}
                    todo={todo}
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
