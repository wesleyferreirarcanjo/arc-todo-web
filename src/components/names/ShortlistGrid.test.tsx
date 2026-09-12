import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NameCandidate } from '../../types/name-session';
import { ShortlistGrid } from './ShortlistGrid';

afterEach(cleanup);

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'nova',
    name: partial.name ?? 'Nova',
    status: partial.status ?? 'active',
    sources: ['human'],
    domainChecks: [],
    googleQueryUrl: '',
    rationale: 'Short enough to say once.',
    reaction: 'liked',
    ...partial,
  };
}

describe('ShortlistGrid', () => {
  it('toggles the heart without calling promote or remove', async () => {
    const user = userEvent.setup();
    const onFavorite = vi.fn();
    const onPromote = vi.fn();
    const onRemove = vi.fn();
    render(
      <ShortlistGrid
        candidates={[candidate()]}
        shortlistIds={[]}
        resolvingKeys={[]}
        canManage
        onRemove={onRemove}
        onPromote={onPromote}
        onFavorite={onFavorite}
        onScore={vi.fn()}
        onCheck={vi.fn()}
        onCheckHandles={vi.fn()}
        onVariations={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Add Nova to personal favorites' }),
    );
    expect(onFavorite).toHaveBeenCalledWith('nova', true);
    expect(onPromote).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
