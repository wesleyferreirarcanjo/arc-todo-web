import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QaQueueBulkBar } from './QaQueueBulkBar';

const queueItems = [
  { taskId: 't1', displayId: '#arc-1', title: 'Queued one' },
  { taskId: 't2', displayId: '#arc-2', title: 'Queued two' },
];

const baseProps = {
  open: true,
  items: queueItems,
  unqueuedCount: 2,
  mixedUnqueued: false,
  sending: false,
  removingTaskId: null,
  sendError: null,
  replaceOpen: false,
  onAddAll: vi.fn(),
  onRemove: vi.fn(),
  onConfirmReplace: vi.fn(),
  onCancelReplace: vi.fn(),
};

describe('QaQueueBulkBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('hides the panel until QA extension is open', () => {
    render(
      <QaQueueBulkBar
        {...baseProps}
        open={false}
      />,
    );

    expect(screen.queryByRole('region', { name: 'QA extension' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add all parents' })).not.toBeInTheDocument();
  });

  it('lists queued cards with remove, not a parent-task picker', async () => {
    const onRemove = vi.fn();
    const onAddAll = vi.fn();
    const user = userEvent.setup();
    render(
      <QaQueueBulkBar
        {...baseProps}
        onRemove={onRemove}
        onAddAll={onAddAll}
      />,
    );

    expect(screen.getByText('Queued one')).toBeInTheDocument();
    expect(screen.getByText('Queued two')).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: /Select .* for QA queue/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver checklists' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Enviar para fila de QA' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Remove #arc-1 from QA extension' }),
    );
    expect(onRemove).toHaveBeenCalledWith('t1');
    await user.click(screen.getByRole('button', { name: 'Add all parents' }));
    expect(onAddAll).toHaveBeenCalled();
  });

  it('disables add all when remaining parents span two projects', () => {
    render(
      <QaQueueBulkBar
        {...baseProps}
        mixedUnqueued
      />,
    );

    expect(screen.getByRole('button', { name: 'Add all parents' })).toBeDisabled();
    expect(
      screen.getByText('Select tasks from one project to send to the QA extension.'),
    ).toBeInTheDocument();
  });

  it('asks to trocar de projeto after a 409 project switch', async () => {
    const onConfirmReplace = vi.fn();
    const user = userEvent.setup();
    render(
      <QaQueueBulkBar
        {...baseProps}
        replaceOpen
        onConfirmReplace={onConfirmReplace}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'trocar de projeto' }));
    expect(onConfirmReplace).toHaveBeenCalled();
  });
});
