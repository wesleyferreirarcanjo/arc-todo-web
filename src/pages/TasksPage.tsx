import { useCallback, useEffect, useState } from 'react';
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  updateTodo,
} from '../lib/api/todos';
import type { CreateTodoInput, Todo, TodoPriority, TodoStatus } from '../types/todo';
import { Layout } from '../components/Layout';
import { TaskBoard } from '../components/TaskBoard';
import { TaskForm } from '../components/TaskForm';

export function TasksPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTodos();
      setTodos(data);
    } catch {
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

  async function handleCreate(input: CreateTodoInput) {
    const created = await createTodo(input);
    setTodos((prev) => [created, ...prev]);
  }

  async function handleUpdate(
    id: string,
    input: Partial<{
      title: string;
      description: string;
      status: TodoStatus;
      priority: TodoPriority;
      dueDate: string | null;
    }>,
  ) {
    const updated = await updateTodo(id, input);
    setTodos((prev) => prev.map((todo) => (todo.id === id ? updated : todo)));
  }

  async function handleDelete(id: string) {
    await deleteTodo(id);
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }

  return (
    <Layout>
      <div className="tasks-page">
        <TaskForm onSubmit={handleCreate} />

        {loading && <p className="status-message">Loading tasks...</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && todos.length === 0 && (
          <p className="status-message">No tasks yet. Create your first one above.</p>
        )}

        {!loading && !error && todos.length > 0 && (
          <TaskBoard
            todos={todos}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </div>
    </Layout>
  );
}
