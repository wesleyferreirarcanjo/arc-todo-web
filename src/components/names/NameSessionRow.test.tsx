import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NameSessionRow } from './NameSessionRow';

afterEach(cleanup);

function renderRow(props: Partial<ComponentProps<typeof NameSessionRow>> = {}) {
  const onRename = vi.fn();
  const onDelete = vi.fn();
  render(
    <MemoryRouter>
      <ul>
        <NameSessionRow
          title="Project G"
          href="/organizations/o/projects/p/names/s"
          recommendedName="Arc Todo"
          candidateCount={2}
          updatedAt="2026-09-02T12:00:00.000Z"
          namingGoal="public_product"
          onRename={onRename}
          onDelete={onDelete}
          {...props}
        />
      </ul>
    </MemoryRouter>,
  );
  return { onRename, onDelete };
}

describe('NameSessionRow', () => {
  it('makes the whole card a link and shows the human pick', () => {
    renderRow();
    const link = screen.getByRole('link', { name: /Project G/ });
    expect(link).toHaveAttribute(
      'href',
      '/organizations/o/projects/p/names/s',
    );
    expect(link).toHaveTextContent('Your pick: Arc Todo');
    expect(screen.queryByText(/Public product\/app/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('shows Needs AI when the session has no names yet', () => {
    renderRow({ recommendedName: null, candidateCount: 0 });
    expect(screen.getByText('Needs AI')).toBeTruthy();
  });

  it('falls back when names exist but there is no pick', () => {
    renderRow({ recommendedName: null, candidateCount: 1 });
    expect(screen.getByText('No pick yet')).toBeTruthy();
  });

  it('keeps rename and delete behind the kebab menu', async () => {
    const user = userEvent.setup();
    const { onRename, onDelete } = renderRow();
    await user.click(screen.getByRole('button', { name: 'Session actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    expect(onRename).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Session actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
