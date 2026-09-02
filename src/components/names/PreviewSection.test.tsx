import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NameCandidate } from '../../types/name-session';
import { PreviewSection } from './PreviewSection';

afterEach(cleanup);

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'n1',
    name: partial.name ?? 'Nova',
    status: 'active',
    sources: ['human'],
    domainChecks: [],
    googleQueryUrl: '',
    ...partial,
  };
}

const noop = {
  onWide: vi.fn(),
  onDark: vi.fn(),
  onCustom: vi.fn(),
  onSave: vi.fn(),
};

describe('PreviewSection', () => {
  it('renders the session description and not the hardcoded string', () => {
    render(
      <PreviewSection
        candidate={candidate()}
        productDescription={{ oneLine: 'A private task board for a small team.' }}
        wide={false}
        dark={false}
        customExtension=""
        {...noop}
      />,
    );

    expect(
      screen.getByText('A private task board for a small team.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Project planning for small teams'),
    ).not.toBeInTheDocument();
  });

  it('falls back to short copy, then a clearly neutral placeholder', () => {
    const { rerender } = render(
      <PreviewSection
        candidate={candidate()}
        productDescription={{ short: 'Short product sentence.' }}
        wide={false}
        dark={false}
        customExtension=""
        {...noop}
      />,
    );
    expect(screen.getByText('Short product sentence.')).toBeInTheDocument();
    expect(
      screen.queryByText('Project planning for small teams'),
    ).not.toBeInTheDocument();

    rerender(
      <PreviewSection
        candidate={candidate()}
        wide={false}
        dark={false}
        customExtension=""
        {...noop}
      />,
    );
    expect(screen.getByText('No product description yet')).toBeInTheDocument();
    expect(
      screen.queryByText('Project planning for small teams'),
    ).not.toBeInTheDocument();
  });

  it('exposes aria-pressed on the compact/wide and light/dark controls', () => {
    render(
      <PreviewSection
        candidate={candidate()}
        wide={true}
        dark={false}
        customExtension=""
        {...noop}
      />,
    );

    expect(screen.getByRole('button', { name: 'Compact' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Wide' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
