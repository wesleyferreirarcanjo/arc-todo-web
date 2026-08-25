import { ErrorAlert } from './ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { FormEvent, useEffect, useState } from 'react';
import type { CreateTaskInput, TaskCategory, TaskCriticity, TaskStatus } from '../types/todo';
import {
  buildTaskMetadataInput,
  emptyCodingMetadataForm,
  type CodingMetadataFormState,
} from '../lib/tasks/taskCategory';
import {
  buildTaskDescriptionInput,
  type TaskDescriptionFormState,
} from '../lib/tasks/taskDescriptions';
import { useAuth } from '../context/AuthContext';
import { TASK_STATUS_OPTIONS } from '../lib/tasks/taskStatus';
import {
  assigneeCreatePayload,
  UNASSIGNED_VALUE,
} from '../lib/users/assigneeDisplay';
import {
  CategorySelect,
  DEFAULT_TASK_CATEGORY,
  TaskCategoryFormFields,
} from './TaskCategoryFormFields';
import { TaskDescriptionFields } from './TaskDescriptionFields';
import { AssigneeSelect } from './AssigneeSelect';
import { Select } from './Select';

interface TaskFormProps {
  onSubmit: (input: CreateTaskInput) => Promise<void>;
  parentTaskId?: string;
  defaultCategory?: TaskCategory;
  heading?: string;
  submitLabel?: string;
  hideHeading?: boolean;
  organizationId?: string;
  projectId?: string;
  defaultAssigneeId?: string | null;
}

const statuses = TASK_STATUS_OPTIONS;

const criticities: { value: TaskCriticity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function TaskForm({
  onSubmit,
  parentTaskId,
  defaultCategory = DEFAULT_TASK_CATEGORY,
  heading = 'New task',
  submitLabel = 'Add task',
  hideHeading = false,
  organizationId,
  projectId,
  defaultAssigneeId = null,
}: TaskFormProps) {
  const { isAdmin } = useAuth();
  const [title, setTitle] = useState('');
  const [descriptions, setDescriptions] = useState<TaskDescriptionFormState>({
    businessDescription: '',
    planCodeDescription: '',
    testDescription: '',
  });
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [criticity, setCriticity] = useState<TaskCriticity>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId ?? UNASSIGNED_VALUE);
  const [category, setCategory] = useState<TaskCategory>(defaultCategory);
  const [coding, setCoding] = useState<CodingMetadataFormState>(emptyCodingMetadataForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAssigneeId(defaultAssigneeId ?? UNASSIGNED_VALUE);
  }, [defaultAssigneeId, organizationId, projectId]);

  function handleCodingChange(
    field: keyof CodingMetadataFormState,
    value: string,
  ) {
    setCoding((current) => ({ ...current, [field]: value }));
  }

  function handleDescriptionChange(
    field: keyof TaskDescriptionFormState,
    value: string,
  ) {
    setDescriptions((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const metadata = buildTaskMetadataInput(category, coding);
      await onSubmit({
        title: title.trim(),
        ...buildTaskDescriptionInput(descriptions),
        status,
        criticity,
        dueDate: dueDate || undefined,
        parentTaskId,
        category,
        metadata,
        ...(isAdmin
          ? assigneeCreatePayload(assigneeId, defaultAssigneeId)
          : {}),
      });
      setTitle('');
      setDescriptions({
        businessDescription: '',
        planCodeDescription: '',
        testDescription: '',
      });
      setStatus('todo');
      setCriticity('medium');
      setDueDate('');
      setAssigneeId(defaultAssigneeId ?? UNASSIGNED_VALUE);
      setCategory(defaultCategory);
      setCoding(emptyCodingMetadataForm());
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this task' }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      {!hideHeading && <h2>{heading}</h2>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <label>
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to be done?"
          required
        />
      </label>

      <TaskDescriptionFields
        values={descriptions}
        onChange={handleDescriptionChange}
        compact
        showAiFields={false}
      />

      <div className="form-row">
        <label>
          Category
          <CategorySelect category={category} onCategoryChange={setCategory} />
        </label>

        <label>
          Status
          <Select
            value={status}
            onChange={(nextStatus) => setStatus(nextStatus as TaskStatus)}
            options={statuses}
          />
        </label>

        <label>
          Criticity
          <Select
            value={criticity}
            onChange={(nextCriticity) => setCriticity(nextCriticity as TaskCriticity)}
            options={criticities}
          />
        </label>

        <label>
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>

        {isAdmin && (
          <label>
            Assignee
            <AssigneeSelect
              orgId={organizationId}
              projectId={projectId}
              value={assigneeId}
              onChange={setAssigneeId}
            />
          </label>
        )}
      </div>

      <TaskCategoryFormFields
        category={category}
        onCategoryChange={setCategory}
        coding={coding}
        onCodingChange={handleCodingChange}
        showCategorySelect={false}
      />

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Adding...' : submitLabel}
      </button>
    </form>
  );
}
