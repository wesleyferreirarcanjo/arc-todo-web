import type { CreateTaskInput, Task } from '../../types/todo';

export interface TaskDescriptionFields {
  description: string | null;
  businessDescription: string | null;
  planCodeDescription: string | null;
  testDescription: string | null;
}

export interface TaskDescriptionFormState {
  businessDescription: string;
  planCodeDescription: string;
  testDescription: string;
}

export function taskDescriptionFieldsFromTask(task: Task): TaskDescriptionFields {
  const businessDescription =
    task.businessDescription?.trim() || task.description?.trim() || null;

  return {
    description: businessDescription,
    businessDescription,
    planCodeDescription: task.planCodeDescription?.trim() || null,
    testDescription: task.testDescription?.trim() || null,
  };
}

export function taskDescriptionFormFromTask(task: Task): TaskDescriptionFormState {
  const fields = taskDescriptionFieldsFromTask(task);
  return {
    businessDescription: fields.businessDescription ?? '',
    planCodeDescription: fields.planCodeDescription ?? '',
    testDescription: fields.testDescription ?? '',
  };
}

export function buildTaskDescriptionInput(
  form: TaskDescriptionFormState,
): Pick<
  CreateTaskInput,
  'description' | 'businessDescription' | 'planCodeDescription' | 'testDescription'
> {
  const businessDescription = form.businessDescription.trim();
  const planCodeDescription = form.planCodeDescription.trim();
  const testDescription = form.testDescription.trim();
  return {
    businessDescription: businessDescription || undefined,
    description: businessDescription || undefined,
    planCodeDescription: planCodeDescription || undefined,
    testDescription: testDescription || undefined,
  };
}

export function formatDescriptionSection(
  label: string,
  value: string | null | undefined,
  fallback = 'No description',
): string {
  const text = value?.trim();
  return text ? `## ${label}\n${text}` : `## ${label}\n${fallback}`;
}
