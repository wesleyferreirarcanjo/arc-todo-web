import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchRagChunkAggregate = vi.hoisted(() => vi.fn());
const fetchRagIndexStatus = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());

vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuth(),
}));

vi.mock('../lib/api/rag', () => ({
  fetchRagChunkAggregate,
  fetchRagIndexStatus,
  syncRagIndex: vi.fn(),
}));

import { KnowledgeIndexOverview } from './KnowledgeIndexOverview';

describe('KnowledgeIndexOverview', () => {
  beforeEach(() => {
    fetchRagChunkAggregate.mockReset();
    fetchRagIndexStatus.mockReset();
    useAuth.mockReset();
  });

  it('does not call admin RAG routes for members', () => {
    useAuth.mockReturnValue({ isAdmin: false });
    const { container } = render(
      <MemoryRouter>
        <KnowledgeIndexOverview />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(fetchRagIndexStatus).not.toHaveBeenCalled();
    expect(fetchRagChunkAggregate).not.toHaveBeenCalled();
  });

  it('loads chunk totals for admins', async () => {
    useAuth.mockReturnValue({ isAdmin: true });
    fetchRagChunkAggregate.mockResolvedValue({
      totalChunks: 12,
      totalTokens: 3400,
    });
    fetchRagIndexStatus.mockResolvedValue({
      totalChunks: 12,
      queuedJobs: 0,
      processingJobs: 0,
      failedJobs: 0,
      lastReconcileAt: null,
      activeJobs: [],
      processingJob: null,
      recentJobs: [],
    });

    render(
      <MemoryRouter>
        <KnowledgeIndexOverview />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Indexing overview')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('All indexed')).toBeInTheDocument();
    });
    expect(
      screen.queryByText('Failed to load indexing overview.'),
    ).not.toBeInTheDocument();
  });
});
