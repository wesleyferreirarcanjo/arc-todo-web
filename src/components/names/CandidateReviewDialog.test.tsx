import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewNamingResponse } from '../../lib/names/smartCopy';
import { CandidateReviewDialog } from './CandidateReviewDialog';

afterEach(cleanup);

describe('CandidateReviewDialog', () => {
  it('lets the member edit, deselect, and cancel without confirming', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onRowChange = vi.fn();
    const review = previewNamingResponse('NAMES\n- Helio — sun\n- Luma', []);

    render(
      <CandidateReviewDialog
        open
        rows={review.rows}
        busy={false}
        onRowChange={onRowChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Review suggested names' })).toBeTruthy();
    expect(screen.getByDisplayValue('Helio')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows overflow and duplicate reasons instead of dropping rows', () => {
    const lines = Array.from({ length: 21 }, (_, index) => `- Name${index + 1}`);
    const review = previewNamingResponse(`NAMES\n${lines.join('\n')}\n- nova`, [
      { name: 'Nova' },
    ]);
    render(
      <CandidateReviewDialog
        open
        rows={review.rows}
        busy={false}
        onRowChange={() => undefined}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByText(/Over the 20-name add limit/)).toBeTruthy();
    expect(screen.getByText(/Already in this session as Nova/)).toBeTruthy();
  });
});
