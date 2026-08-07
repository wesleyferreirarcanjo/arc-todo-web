import { describe, expect, it } from 'vitest';
import {
  BATCH_SMART_COPY_MAX,
  formatTaskCopyText,
  formatTaskSmartCopyText,
  formatTasksBatchSmartCopyText,
} from './taskCopy';
import type { Task } from '../types/todo';

const parentTask: Task = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Add smart copy',
  description: '## Overview\nShip portable agent copy from the board.',
  businessDescription: '## Overview\nShip portable agent copy from the board.',
  planCodeDescription:
    '## Overview\nAdd clarifying questions, overview, and specific plan to Smart Copy.',
  testDescription: 'Run vitest for taskCopy and verify Smart Copy sections.',
  status: 'todo',
  criticity: 'medium',
  dueDate: '2026-06-30T00:00:00.000Z',
  projectId: 'd576e04d-f683-4b88-a374-0aab28a4be10',
  taskNumber: 1,
  displayId: '#arc-1',
  category: 'other',
  metadata: {},
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const subtask: Task = {
  id: '22222222-2222-2222-2222-222222222222',
  title: 'Wire UI button',
  description: '## Execution Plan\n- Add Smart copy to TaskDetailsModal.',
  businessDescription: '## Execution Plan\n- Add Smart copy to TaskDetailsModal.',
  planCodeDescription: 'Update TaskDetailsModal and TaskCard copy actions.',
  testDescription: 'Manual Smart Copy smoke test.',
  status: 'todo',
  criticity: 'low',
  dueDate: null,
  projectId: parentTask.projectId,
  parentTaskId: parentTask.id,
  taskNumber: 2,
  displayId: '#arc-2',
  category: 'other',
  metadata: {},
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('formatTaskCopyText', () => {
  it('includes subtasks and structured descriptions in the simple copy format', () => {
    const text = formatTaskCopyText(parentTask, [subtask]);

    expect(text).toContain('Task: Add smart copy');
    expect(text).toContain('Business description:');
    expect(text).toContain('Plan / code description:');
    expect(text).toContain('Test description:');
    expect(text).toContain('Subtask: Wire UI button');
  });
});

describe('formatTaskSmartCopyText', () => {
  it('includes structured descriptions, subtasks, MCP hints, and Dev Test handoff', () => {
    const text = formatTaskSmartCopyText(parentTask, {
      organizationId: '57df4a79-d87d-40e1-9fb0-2da29d8ebecf',
      projectId: parentTask.projectId,
      organizationName: 'Arc Org',
      projectName: 'Frontend',
      subtasks: [subtask],
    });

    expect(text).toContain('# Arc Todo Smart Copy');
    expect(text).toContain('verify it with the test description');
    expect(text).toContain('move completed implementation work to Dev Test');
    expect(text).toContain('## Business Description');
    expect(text).toContain('## Plan / Code Description');
    expect(text).toContain('## Test Description');
    expect(text).toContain('display_id: #arc-1');
    expect(text).toContain('organization_id: 57df4a79-d87d-40e1-9fb0-2da29d8ebecf');
    expect(text).toContain('project_name: Frontend');
    expect(text).toContain('Wire UI button (#arc-2)');
    expect(text).toContain('get_task(');
    expect(text).toContain('parent_task_id=<parent UUID from get_task>');
    expect(text).toContain('list_tasks parent_task_id filter requires UUID');
    expect(text).toContain('move the task to `dev_test` instead of `done`');
    expect(text).toContain('Treat Plan / Code Description as the main execution plan');
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

describe('formatTasksBatchSmartCopyText', () => {
  const orgId = '57df4a79-d87d-40e1-9fb0-2da29d8ebecf';
  const secondTask: Task = {
    ...parentTask,
    id: '33333333-3333-3333-3333-333333333333',
    title: 'Second batch task',
    taskNumber: 3,
    displayId: '#arc-3',
  };

  it('builds a multi-task packet with header, id list, and per-task blocks', () => {
    const text = formatTasksBatchSmartCopyText([
      {
        task: parentTask,
        context: {
          organizationId: orgId,
          projectId: parentTask.projectId,
          organizationName: 'Arc Org',
          projectName: 'Frontend',
          subtasks: [subtask],
        },
      },
      {
        task: secondTask,
        context: {
          organizationId: orgId,
          projectId: secondTask.projectId,
          projectName: 'Frontend',
        },
      },
    ]);

    expect(text).toContain('# Arc Todo Batch Smart Copy');
    expect(text).toContain('arc-todo-batch-execute-tasks');
    expect(text).toContain('arc-todo-batch-execute-bugs');
    expect(text).toContain('## Selected tasks');
    expect(text).toContain('1. #arc-1');
    expect(text).toContain('2. #arc-3');
    expect(text).toContain('## Task 1 of 2: #arc-1');
    expect(text).toContain('## Task 2 of 2: #arc-3');
    expect(text).toContain('Wire UI button (#arc-2)');
    expect(text).toContain('Second batch task');
    expect(text).not.toContain('# Arc Todo Smart Copy');
    expect(text).not.toContain('make a concise implementation plan from this task before editing');
  });

  it('rejects empty and over-cap batches', () => {
    expect(() => formatTasksBatchSmartCopyText([])).toThrow(
      /at least one task/i,
    );

    const items = Array.from({ length: BATCH_SMART_COPY_MAX + 1 }, (_, i) => ({
      task: {
        ...parentTask,
        id: `44444444-4444-4444-4444-${String(i).padStart(12, '0')}`,
        displayId: `#arc-${100 + i}`,
        taskNumber: 100 + i,
      },
      context: {
        organizationId: orgId,
        projectId: parentTask.projectId,
      },
    }));

    expect(() => formatTasksBatchSmartCopyText(items)).toThrow(
      new RegExp(`limited to ${BATCH_SMART_COPY_MAX}`, 'i'),
    );
  });

  it('accepts exactly the max batch size', () => {
    const items = Array.from({ length: BATCH_SMART_COPY_MAX }, (_, i) => ({
      task: {
        ...parentTask,
        id: `55555555-5555-5555-5555-${String(i).padStart(12, '0')}`,
        displayId: `#arc-${200 + i}`,
        taskNumber: 200 + i,
      },
      context: {
        organizationId: orgId,
        projectId: parentTask.projectId,
      },
    }));

    const text = formatTasksBatchSmartCopyText(items);
    expect(text).toContain(`1. #arc-200`);
    expect(text).toContain(`5. #arc-204`);
    expect(text).toContain('## Task 5 of 5: #arc-204');
  });
});
