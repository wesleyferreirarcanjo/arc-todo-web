import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectNameSession } from '../../types/name-session';
import { TeamViewsMode } from './TeamViewsMode';

function session(partial: Partial<ProjectNameSession> = {}): ProjectNameSession {
  return {
    id: 'sess-1',
    projectId: 'proj-1',
    title: 'Project G',
    brief: '',
    namingGoal: 'public_product',
    participationMode: 'team',
    productDescription: {},
    lanes: [],
    candidates: [],
    shortlistIds: [],
    recommendedCandidateId: null,
    runnerUpCandidateId: null,
    decisionNote: null,
    createdById: 'user-1',
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    canManageFeedback: true,
    feedback: [],
    ...partial,
  };
}

describe('TeamViewsMode', () => {
  afterEach(() => {
    cleanup();
  });

  it('lists other members’ liked/loved names and 1–10 scores as read-only text', () => {
    render(
      <TeamViewsMode
        session={session({
          memberShortlists: [
            {
              userId: 'user-2',
              displayName: 'arthura',
              likedLoved: [
                { candidateId: 'nova', name: 'Nova', reaction: 'loved' },
                { candidateId: 'rift', name: 'Rift', reaction: 'liked' },
              ],
              ratings: [
                {
                  candidateId: 'nova',
                  name: 'Nova',
                  overall: 8,
                  notes: 'Fits',
                },
              ],
            },
          ],
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'arthura' })).toBeTruthy();
    expect(screen.getByText('Nova · Love')).toBeTruthy();
    expect(screen.getByText('Rift · Like')).toBeTruthy();
    expect(screen.getByText('Nova · 8/10 — Fits')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Like' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Love' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Promote/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /heart/i })).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByText(/ballot/i)).toBeNull();
    expect(screen.queryByText(/first impression/i)).toBeNull();
  });

  it('shows an empty state when no other member has rated', () => {
    render(<TeamViewsMode session={session()} />);
    expect(
      screen.getByText('No one else has liked, loved, or scored a name yet.'),
    ).toBeTruthy();
  });
});
