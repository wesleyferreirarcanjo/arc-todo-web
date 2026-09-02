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
  it('shows the recommended name as the subtitle', () => {
    renderRow();
    expect(screen.getByRole('link', { name: 'Project G' })).toHaveAttribute(
      'href',
      '/organizations/o/projects/p/names/s',
    );
    expect(screen.getByText('Recommended: Arc Todo')).toBeTruthy();
    expect(screen.getByText(/Public product\/app/)).toBeTruthy();
  });

  it('falls back when there is no recommendation yet', () => {
    renderRow({ recommendedName: null });
    expect(screen.getByText('No recommendation yet')).toBeTruthy();
  });

  it('keeps rename and delete as one action each', async () => {
    const user = userEvent.setup();
    const { onRename, onDelete } = renderRow();
    await user.click(screen.getByRole('button', { name: 'Rename' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
