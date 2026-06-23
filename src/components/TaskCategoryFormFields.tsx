import type { CodingMetadataFormState, TaskCategory } from '../lib/tasks/taskCategory';
import {
  DEFAULT_TASK_CATEGORY,
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
} from '../lib/tasks/taskCategory';
import { Select } from './Select';

interface TaskCategoryFormFieldsProps {
  category: TaskCategory;
  onCategoryChange: (category: TaskCategory) => void;
  coding: CodingMetadataFormState;
  onCodingChange: (field: keyof CodingMetadataFormState, value: string) => void;
}

export function TaskCategoryFormFields({
  category,
  onCategoryChange,
  coding,
  onCodingChange,
}: TaskCategoryFormFieldsProps) {
  return (
    <>
      <label>
        Category
        <Select
          value={category}
          onChange={(nextCategory) => onCategoryChange(nextCategory as TaskCategory)}
          options={TASK_CATEGORIES.map((value) => ({
            value,
            label: TASK_CATEGORY_LABELS[value],
          }))}
        />
      </label>

      {category === 'coding' && (
        <fieldset className="task-coding-metadata-fields">
          <legend>Code metadata</legend>

          <label>
            Repository URL
            <input
              type="url"
              value={coding.repositoryUrl}
              onChange={(event) => onCodingChange('repositoryUrl', event.target.value)}
              placeholder="https://github.com/org/repo"
            />
          </label>

          <label>
            Branch
            <input
              type="text"
              value={coding.branch}
              onChange={(event) => onCodingChange('branch', event.target.value)}
              placeholder="main"
            />
          </label>

          <label>
            Commits
            <input
              type="text"
              value={coding.commits}
              onChange={(event) => onCodingChange('commits', event.target.value)}
              placeholder="abc123, def456"
            />
          </label>

          <label>
            Pull request URL
            <input
              type="url"
              value={coding.pullRequestUrl}
              onChange={(event) => onCodingChange('pullRequestUrl', event.target.value)}
              placeholder="https://github.com/org/repo/pull/1"
            />
          </label>

          <label>
            Deployment URL
            <input
              type="url"
              value={coding.deploymentUrl}
              onChange={(event) => onCodingChange('deploymentUrl', event.target.value)}
              placeholder="https://app.example.com"
            />
          </label>

          <label>
            Implementation notes
            <textarea
              value={coding.implementationNotes}
              onChange={(event) =>
                onCodingChange('implementationNotes', event.target.value)
              }
              rows={3}
              placeholder="Optional engineering notes"
            />
          </label>
        </fieldset>
      )}
    </>
  );
}

export { DEFAULT_TASK_CATEGORY };
