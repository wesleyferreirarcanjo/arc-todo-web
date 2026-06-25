import type { TaskDescriptionFormState } from '../lib/tasks/taskDescriptions';

interface TaskDescriptionFieldsProps {
  values: TaskDescriptionFormState;
  onChange: <K extends keyof TaskDescriptionFormState>(
    field: K,
    value: TaskDescriptionFormState[K],
  ) => void;
  compact?: boolean;
}

export function TaskDescriptionFields({
  values,
  onChange,
  compact = false,
}: TaskDescriptionFieldsProps) {
  const businessRows = compact ? 3 : 4;
  const planRows = compact ? 4 : 6;
  const testRows = compact ? 3 : 4;

  return (
    <>
      <label>
        Business description
        <span className="field-help">
          Why the work matters, scope, constraints, and acceptance criteria.
        </span>
        <textarea
          value={values.businessDescription}
          onChange={(event) => onChange('businessDescription', event.target.value)}
          placeholder="Product intent and acceptance criteria"
          rows={businessRows}
        />
      </label>

      <label>
        Plan / code description
        <span className="field-help">
          How to implement the work: affected areas, execution order, and constraints.
        </span>
        <textarea
          value={values.planCodeDescription}
          onChange={(event) => onChange('planCodeDescription', event.target.value)}
          placeholder="Technical execution plan for agents or developers"
          rows={planRows}
        />
      </label>

      <label>
        Test description
        <span className="field-help">
          How to verify the work during Dev Test, QA Test, and final checks.
        </span>
        <textarea
          value={values.testDescription}
          onChange={(event) => onChange('testDescription', event.target.value)}
          placeholder="Automated checks and manual QA expectations"
          rows={testRows}
        />
      </label>
    </>
  );
}
