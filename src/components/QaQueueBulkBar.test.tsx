import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QaQueueBulkBar } from './QaQueueBulkBar';

const pickerTasks = [
  { id: 't1', displayId: '#arc-1', title: 'Parent one', projectName: 'arc-todo' },
  { id: 't2', displayId: '#arc-2', title: 'Parent two', projectName: 'arc-todo' },
];

const baseProps = {
  open: true,
  tasks: pickerTasks,
  selectedTaskIds: new Set<string>(),
  selectableCount: 2,
  allSelected: false,
  sending: false,
  sendError: null,
  replaceOpen: false,
  onToggleSelect: vi.fn(),
  onSelectAll: vi.fn(),
  onSend: vi.fn(),
  onOpenChecklists: vi.fn(),
  onClear: vi.fn(),
  onConfirmReplace: vi.fn(),
  onCancelReplace: vi.fn(),
};

describe('QaQueueBulkBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('hides the picker until Fila de QA is open', () => {
    render(
      <QaQueueBulkBar
        {...baseProps}
        open={false}
        selectedCount={0}
        mixedProjects={false}
      />,
    );

    expect(screen.queryByRole('region', { name: 'Fila de QA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select all' })).not.toBeInTheDocument();
  });

  it('lists parent tasks to pick for the extension queue', async () => {
    const onToggleSelect = vi.fn();
    const onSelectAll = vi.fn();
    const user = userEvent.setup();
    render(
      <QaQueueBulkBar
        {...baseProps}
        selectedCount={0}
        mixedProjects={false}
        onToggleSelect={onToggleSelect}
        onSelectAll={onSelectAll}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Select #arc-1 for QA queue' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select #arc-2 for QA queue' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Select all' }));
    expect(onSelectAll).toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Enviar para fila de QA' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ver checklists' })).toBeDisabled();
  });

  it('disables send when selected tasks span two projects', () => {
    render(
      <QaQueueBulkBar
        {...baseProps}
        selectedCount={2}
        mixedProjects
        selectedTaskIds={new Set(['t1', 't2'])}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Enviar para fila de QA' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ver checklists' })).toBeDisabled();
    expect(
      screen.getByText('Select tasks from one project to send to the QA queue.'),
    ).toBeInTheDocument();
  });

  it('opens stacked checklists for one project', async () => {
    const onOpenChecklists = vi.fn();
    const user = userEvent.setup();
    render(
      <QaQueueBulkBar
        {...baseProps}
        selectedCount={2}
        mixedProjects={false}
        selectedTaskIds={new Set(['t1', 't2'])}
        onOpenChecklists={onOpenChecklists}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ver checklists' }));
    expect(onOpenChecklists).toHaveBeenCalled();
  });

  it('asks to trocar de projeto after a 409 project switch', async () => {
    const onConfirmReplace = vi.fn();
    const user = userEvent.setup();
    render(
      <QaQueueBulkBar
        {...baseProps}
        selectedCount={1}
        mixedProjects={false}
        replaceOpen
        onConfirmReplace={onConfirmReplace}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'trocar de projeto' }));
    expect(onConfirmReplace).toHaveBeenCalled();
  });
});
