import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BoardViewModePanel } from './BoardViewToggle';
import { TaskListView } from './TaskListView';
import type { Task } from '../types/todo';

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Ship list view',
    description: null,
    status: 'todo',
    criticity: 'medium',
    dueDate: '2026-07-01T00:00:00.000Z',
    projectId: 'p1',
    taskNumber: 1,
    displayId: '#arc-1',
    category: 'other',
    metadata: {},
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
];

function ToggleHarness() {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  return (
    <BoardViewModePanel
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      board={<div data-testid="board-view">Board panel</div>}
      list={<TaskListView tasks={sampleTasks} accentColor="#8778a3" />}
    />
  );
}

describe('BoardViewModePanel', () => {
  it('defaults to board and switches to list with task rows', async () => {
    const user = userEvent.setup();
    render(<ToggleHarness />);

    expect(screen.getByTestId('board-view')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'List' }));

    expect(screen.queryByTestId('board-view')).not.toBeInTheDocument();
    expect(screen.getByText('Ship list view')).toBeInTheDocument();
    expect(screen.getByText('#arc-1')).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Board' }));

    expect(screen.getByTestId('board-view')).toBeInTheDocument();
    expect(screen.queryByText('Ship list view')).not.toBeInTheDocument();
  });
});
