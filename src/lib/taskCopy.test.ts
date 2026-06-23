import { describe, expect, it } from 'vitest';
import { formatTaskCopyText, formatTaskSmartCopyText } from './taskCopy';
import type { Task } from '../types/todo';

const parentTask: Task = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Add smart copy',
  description: '## Overview\nShip portable agent copy from the board.',
  status: 'todo',
  criticity: 'medium',
  dueDate: '2026-06-30T00:00:00.000Z',
  projectId: 'd576e04d-f683-4b88-a374-0aab28a4be10',
  taskNumber: 1,
  displayId: '#arc-1',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const subtask: Task = {
  id: '22222222-2222-2222-2222-222222222222',
  title: 'Wire UI button',
  description: '## Execution Plan\n- Add Smart copy to TaskDetailsModal.',
  status: 'todo',
  criticity: 'low',
  dueDate: null,
  projectId: parentTask.projectId,
  parentTaskId: parentTask.id,
  taskNumber: 2,
  displayId: '#arc-2',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('formatTaskCopyText', () => {
  it('includes subtasks in the simple copy format', () => {
    const text = formatTaskCopyText(parentTask, [subtask]);

    expect(text).toContain('Task: Add smart copy');
    expect(text).toContain('Subtask: Wire UI button');
    expect(text).toContain('## Execution Plan');
  });
});

describe('formatTaskSmartCopyText', () => {
  it('includes task context, subtasks, MCP hints, and deploy guardrails', () => {
    const text = formatTaskSmartCopyText(parentTask, {
      organizationId: '57df4a79-d87d-40e1-9fb0-2da29d8ebecf',
      projectId: parentTask.projectId,
      organizationName: 'Arc Org',
      projectName: 'Frontend',
      subtasks: [subtask],
    });

    expect(text).toContain('# Arc Todo Smart Copy');
    expect(text).toContain('display_id: #arc-1');
    expect(text).toContain('organization_id: 57df4a79-d87d-40e1-9fb0-2da29d8ebecf');
    expect(text).toContain('project_name: Frontend');
    expect(text).toContain('Wire UI button (#arc-2)');
    expect(text).toContain('get_task(');
    expect(text).toContain('parent_task_id=<parent UUID from get_task>');
    expect(text).toContain('list_tasks parent_task_id filter requires UUID');
    expect(text).toContain('Deploy only when repo scripts/docs make the path clear');
    expect(text).toContain('In plan mode: produce a concise implementation plan');
  });

  it('includes parent reference for subtasks', () => {
    const text = formatTaskSmartCopyText(subtask, {
      organizationId: '57df4a79-d87d-40e1-9fb0-2da29d8ebecf',
      projectId: subtask.projectId,
      parentDisplayId: '#arc-1',
    });

    expect(text).toContain('## Parent');
    expect(text).toContain('display_id: #arc-1');
    expect(text).toContain('## Subtasks\nnone');
  });
});
