import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogMessage, WEB_ERROR } from '../lib/errors/messages';
import { SeoSettingsPage } from './SeoSettingsPage';

const fetchSeoSettings = vi.fn();
const updateSeoSettings = vi.fn();

vi.mock('../lib/api/seo', () => ({
  fetchSeoSettings: (...args: unknown[]) => fetchSeoSettings(...args),
  updateSeoSettings: (...args: unknown[]) => updateSeoSettings(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/seo']}>
      <SeoSettingsPage />
    </MemoryRouter>,
  );
}

describe('SeoSettingsPage (#arc-710)', () => {
  beforeEach(() => {
    fetchSeoSettings.mockReset();
    updateSeoSettings.mockReset();
    fetchSeoSettings.mockResolvedValue({ maxPagesPerAudit: 200 });
    updateSeoSettings.mockResolvedValue({ maxPagesPerAudit: 200 });
  });

  afterEach(() => {
    cleanup();
  });

  it('refuses max pages below 1 with catalog ERR-ARC-SEO-13', async () => {
    renderPage();
    const input = await screen.findByLabelText('Max pages per audit');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-error-code', WEB_ERROR.VAL_SEO_MAX_PAGES);
    expect(alert).toHaveTextContent(catalogMessage(WEB_ERROR.VAL_SEO_MAX_PAGES));
    expect(updateSeoSettings).not.toHaveBeenCalled();
  });

  it('announces a successful save with role=status', async () => {
    renderPage();
    const input = await screen.findByLabelText('Max pages per audit');
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Saved 200 pages per audit.');
    expect(updateSeoSettings).toHaveBeenCalledWith({ maxPagesPerAudit: 200 });
  });
});
