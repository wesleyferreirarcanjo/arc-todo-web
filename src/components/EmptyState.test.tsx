import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

afterEach(cleanup);

describe('EmptyState', () => {
  it('renders title, body, and an action slot', () => {
    render(
      <EmptyState
        title="No diagrams yet"
        body="Create the first whiteboard."
        action={<button type="button">New diagram</button>}
      />,
    );
    expect(screen.getByText('No diagrams yet')).toBeInTheDocument();
    expect(screen.getByText('Create the first whiteboard.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New diagram' }),
    ).toBeInTheDocument();
  });
});
