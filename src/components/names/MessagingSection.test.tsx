import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NameCandidate, ProjectNameSession } from '../../types/name-session';
import { MessagingSection } from './MessagingSection';

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

function session(partial: Partial<ProjectNameSession> = {}): ProjectNameSession {
  return {
    id: 's1',
    projectId: 'p1',
    title: 'Session',
    brief: '',
    namingGoal: 'public_product',
    productDescription: {},
    lanes: [],
    candidates: [candidate()],
    shortlistIds: ['n1'],
    recommendedCandidateId: null,
    runnerUpCandidateId: null,
    decisionNote: null,
    createdById: 'u1',
    createdAt: '2026-09-02',
    updatedAt: '2026-09-02',
    canManageFeedback: true,
    feedback: [],
    ...partial,
  };
}

describe('MessagingSection', () => {
  it('renders its group headings', () => {
    render(
      <MessagingSection
        session={session()}
        orgId="o1"
        projectId="p1"
        onSave={vi.fn()}
        onNotice={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Positioning and descriptor' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Taglines' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Store copy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Search copy' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Plain-language explanation' }),
    ).toBeInTheDocument();
  });

  it('saves on blur so typed copy is not silently lost', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <MessagingSection
        session={session()}
        orgId="o1"
        projectId="p1"
        onSave={onSave}
        onNotice={vi.fn()}
      />,
    );

    await user.type(
      screen.getByRole('textbox', { name: 'Category descriptor' }),
      'task board',
    );
    await user.tab();

    expect(onSave).toHaveBeenCalled();
    const next = onSave.mock.calls.at(-1)?.[0] as NameCandidate[];
    expect(next[0].messaging?.categoryDescriptor).toBe('task board');
  });
});
