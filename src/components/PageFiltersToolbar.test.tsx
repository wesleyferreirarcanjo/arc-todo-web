import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mediaState = vi.hoisted(() => ({ mobile: false }));

vi.mock('../hooks/useMediaQuery', () => ({
  SHELL_MOBILE_QUERY: '(max-width: 1023px)',
  useMediaQuery: () => mediaState.mobile,
}));

import { PageFiltersToolbar } from './PageFiltersToolbar';

afterEach(cleanup);

function Harness({
  initialOpen = false,
  activeFilterCount = 0,
  mobileOverlayOpen = false,
  mobileOverlayTitle,
}: {
  initialOpen?: boolean;
  activeFilterCount?: number;
  mobileOverlayOpen?: boolean;
  mobileOverlayTitle?: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [overlayOpen, setOverlayOpen] = useState(mobileOverlayOpen);
  return (
    <PageFiltersToolbar
      open={open}
      onOpenChange={setOpen}
      activeFilterCount={activeFilterCount}
      panel={<p>Filter tasks by title or ID</p>}
      mobileOverlayOpen={overlayOpen}
      onMobileOverlayOpenChange={setOverlayOpen}
      mobileOverlayTitle={mobileOverlayTitle}
    />
  );
}

describe('PageFiltersToolbar', () => {
  beforeEach(() => {
    mediaState.mobile = false;
  });

  it('stays closed by default with no panel', () => {
    render(<Harness />);

    const toggle = screen.getByRole('button', { name: 'Filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('region', { name: 'Filters' })).not.toBeInTheDocument();
    expect(document.getElementById('board-chrome-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('Filter tasks by title or ID')).not.toBeInTheDocument();
  });

  it('opens the in-flow panel and wires aria-controls', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Filters' }));

    const toggle = screen.getByRole('button', { name: 'Filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'board-chrome-panel');
    const panel = screen.getByRole('region', { name: 'Filters' });
    expect(panel).toHaveAttribute('id', 'board-chrome-panel');
    expect(panel).toHaveClass('board-filters', 'board-filters-inline');
    expect(screen.getByText('Filter tasks by title or ID')).toBeInTheDocument();
  });

  it('shows a count badge only when activeFilterCount is above zero', () => {
    const { rerender } = render(<Harness activeFilterCount={0} />);
    expect(document.querySelector('.board-chrome-count')).not.toBeInTheDocument();

    rerender(<Harness activeFilterCount={2} />);
    const badge = document.querySelector('.board-chrome-count');
    expect(badge).toHaveTextContent('2');
    expect(badge).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
  });

  it('hides the Filters button on mobile and uses the overlay title', async () => {
    mediaState.mobile = true;
    const user = userEvent.setup();
    render(<Harness mobileOverlayOpen mobileOverlayTitle="Board filters" />);

    expect(screen.queryByRole('button', { name: 'Filters' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Board filters' })).toBeInTheDocument();
    expect(screen.getByText('Board filters')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('defaults the mobile overlay title to Filters', () => {
    mediaState.mobile = true;
    render(<Harness mobileOverlayOpen />);

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    expect(document.querySelector('.mobile-filters-title')).toHaveTextContent('Filters');
  });
});
