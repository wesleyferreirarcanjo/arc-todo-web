import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button } from './Button';

afterEach(cleanup);

describe('Button', () => {
  it('maps variants and sizes to the existing .btn classes', () => {
    render(
      <>
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger" size="sm">
          Danger small
        </Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Default' })).toHaveClass(
      'btn',
      'btn-primary',
    );
    expect(screen.getByRole('button', { name: 'Default' })).not.toHaveClass(
      'btn-sm',
    );
    expect(screen.getByRole('button', { name: 'Secondary' })).toHaveClass(
      'btn',
      'btn-secondary',
    );
    expect(screen.getByRole('button', { name: 'Danger small' })).toHaveClass(
      'btn',
      'btn-danger',
      'btn-sm',
    );
  });

  it('defaults type to button and forwards native props', () => {
    render(
      <Button type="submit" disabled aria-busy>
        Saving
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Saving' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
