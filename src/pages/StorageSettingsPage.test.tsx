import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EvidenceStorageUsage } from '../types/storage';
import { StorageSettingsPage } from './StorageSettingsPage';

const fetchEvidenceStorageUsage = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/storage', () => ({
  fetchEvidenceStorageUsage,
}));

function usage(
  partial: Partial<EvidenceStorageUsage> = {},
): EvidenceStorageUsage {
  return {
    fileCount: 0,
    totalBytes: 0,
    retentionDays: 30,
    oldestCreatedAt: null,
    ...partial,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/storage']}>
      <StorageSettingsPage />
    </MemoryRouter>,
  );
}

describe('StorageSettingsPage', () => {
  afterEach(() => {
    cleanup();
    fetchEvidenceStorageUsage.mockReset();
  });

  it('shows an empty state when fileCount is 0 instead of 0 B cards', async () => {
    fetchEvidenceStorageUsage.mockResolvedValue(usage());
    renderPage();

    expect(
      await screen.findByText(/no evidence files yet/i),
    ).toBeInTheDocument();
    expect(document.querySelector('.diagrams-empty')).toBeInTheDocument();
    expect(document.querySelector('.hub-empty-glyph')).toBeInTheDocument();
    expect(screen.queryByText('0 B')).not.toBeInTheDocument();
    expect(screen.queryByText('Files')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('announces loading with role=status instead of a subtitle loader', () => {
    fetchEvidenceStorageUsage.mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading storage usage…',
    );
    expect(document.querySelector('.subtitle')).toBeNull();
  });

  it('surfaces load failures in ErrorAlert instead of form-error', async () => {
    fetchEvidenceStorageUsage.mockRejectedValue(new Error('boom'));
    renderPage();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(document.querySelector('.form-error')).toBeNull();
  });
});
