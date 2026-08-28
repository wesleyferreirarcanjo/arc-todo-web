import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QaQueueBulkBar } from './QaQueueBulkBar';

const baseProps = {
  selectableCount: 4,
  allSelected: false,
  sending: false,
  sendError: null,
  replaceOpen: false,
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

  it('lets testers select all cards for the extension queue', async () => {
    const onSelectAll = vi.fn();
    const user = userEvent.setup();
    render(
      <QaQueueBulkBar
        {...baseProps}
        selectedCount={0}
        mixedProjects={false}
        onSelectAll={onSelectAll}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Select all' }));
    expect(onSelectAll).toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Enviar para fila de QA' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ver checklists' })).toBeDisabled();
  });

  it('disables send when selected cards span two projects', () => {
    render(
      <QaQueueBulkBar
        {...baseProps}
        selectedCount={2}
        mixedProjects
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Enviar para fila de QA' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ver checklists' })).toBeDisabled();
    expect(
      screen.getByText('Select cards from one project to send to the QA queue.'),
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
