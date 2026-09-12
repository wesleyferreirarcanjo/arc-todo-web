import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NameCandidate } from '../../types/name-session';
import { RejectedNamesList } from './RejectedNamesList';

afterEach(cleanup);

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'rift',
    name: partial.name ?? 'Rift',
    status: partial.status ?? 'active',
    sources: ['human'],
    domainChecks: [],
    googleQueryUrl: '',
    rationale: 'Short enough to say once.',
    ...partial,
  };
}

describe('RejectedNamesList', () => {
  it('lists passed and table-rejected names and restores on Undo', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    render(
      <RejectedNamesList
        candidates={[
          candidate({ reaction: 'passed' }),
          candidate({
            id: 'wave',
            name: 'Wave',
            status: 'rejected',
          }),
        ]}
        onRestore={onRestore}
      />,
    );

    expect(screen.getByText('Rift')).toBeTruthy();
    expect(screen.getByText('Passed')).toBeTruthy();
    expect(screen.getByText('Wave')).toBeTruthy();
    expect(screen.getByText('Rejected')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Add Rift to personal favorites' }),
    ).toBeNull();

    await user.click(
      screen.getByRole('button', { name: 'Restore Rift to Explore' }),
    );
    expect(onRestore).toHaveBeenCalledWith('rift');
  });

  it('shows an empty hint when there are no rejected names', () => {
    render(<RejectedNamesList candidates={[]} onRestore={vi.fn()} />);
    expect(
      screen.getByText(
        'No rejected names yet. Pass a name in Explore or reject it from the table.',
      ),
    ).toBeTruthy();
  });
});
