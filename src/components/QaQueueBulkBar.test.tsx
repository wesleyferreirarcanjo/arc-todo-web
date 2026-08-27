import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QaQueueBulkBar } from './QaQueueBulkBar';

describe('QaQueueBulkBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('disables send when selected cards span two projects', () => {
    render(
      <QaQueueBulkBar
        selectedCount={2}
        mixedProjects
        sending={false}
        sendError={null}
        replaceOpen={false}
        onSend={vi.fn()}
        onClear={vi.fn()}
        onConfirmReplace={vi.fn()}
        onCancelReplace={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Enviar para fila de QA' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Select cards from one project to send to the QA queue.'),
    ).toBeInTheDocument();
  });

  it('asks to trocar de projeto after a 409 project switch', async () => {
    const onConfirmReplace = vi.fn();
    const user = userEvent.setup();
    render(
      <QaQueueBulkBar
        selectedCount={1}
        mixedProjects={false}
        sending={false}
        sendError={null}
        replaceOpen
        onSend={vi.fn()}
        onClear={vi.fn()}
        onConfirmReplace={onConfirmReplace}
        onCancelReplace={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'trocar de projeto' }));
    expect(onConfirmReplace).toHaveBeenCalled();
  });
});
