import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchSeoOfferings = vi.hoisted(() => vi.fn());
const saveSeoOfferings = vi.hoisted(() => vi.fn());
const createNameSession = vi.hoisted(() => vi.fn());

vi.mock('../../lib/api/seo', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api/seo')>(
    '../../lib/api/seo',
  );
  return {
    ...actual,
    fetchSeoOfferings,
    saveSeoOfferings,
  };
});

vi.mock('../../lib/api/names', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api/names')>(
    '../../lib/api/names',
  );
  return {
    ...actual,
    createNameSession,
  };
});

import { SeoKeywordsResearch } from './SeoKeywordsResearch';

describe('SeoKeywordsResearch save status', () => {
  afterEach(() => {
    cleanup();
  });

  it('announces a successful save with role=status', async () => {
    fetchSeoOfferings.mockResolvedValue({ offerings: ['automate leads'] });
    saveSeoOfferings.mockResolvedValue({ offerings: ['automate leads'] });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SeoKeywordsResearch
          orgId="org-1"
          projectId="proj-1"
          siteId="site-1"
          siteTitle="Example"
        />
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('automate leads');
    await user.click(screen.getByRole('button', { name: 'Find keywords' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
  });
});
