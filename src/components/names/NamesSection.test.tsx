import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NameCandidate, ProjectNameSession } from '../../types/name-session';
import { NamesSection } from './NamesSection';

afterEach(cleanup);

function candidate(partial: Partial<NameCandidate> = {}): NameCandidate {
  return {
    id: partial.id ?? 'n1',
    name: partial.name ?? 'Nova',
    status: 'active',
    sources: ['human'],
    domainChecks: partial.domainChecks ?? [],
    googleQueryUrl: '',
    ...partial,
  };
}

const item = candidate({
  id: 'kept',
  name: 'Nova',
  domainChecks: [
    {
      host: 'nova.com',
      tld: 'com',
      dnsStatus: 'available',
      rdapStatus: 'available',
      availability: 'available',
      checkedAt: '2026-09-02',
    },
  ],
});

const session: ProjectNameSession = {
  id: 's1',
  projectId: 'p1',
  title: 'Session',
  brief: '',
  namingGoal: 'public_product',
  productDescription: {},
  lanes: [],
  candidates: [item],
  shortlistIds: ['kept'],
  recommendedCandidateId: null,
  runnerUpCandidateId: null,
  decisionNote: null,
  createdById: 'u1',
  createdAt: '2026-09-02',
  updatedAt: '2026-09-02',
  canManageFeedback: true,
  feedback: [],
};

describe('NamesSection', () => {
  it('uses one add field plus Generate with AI and does not revive Suggest names', async () => {
    const user = userEvent.setup();
    const onCheckName = vi.fn();
    render(
      <NamesSection
        session={session}
        typedName=""
        onTypedName={() => undefined}
        busy={null}
        resolvingKeys={[]}
        isBlind={false}
        openRound={undefined}
        emptyCopy="Needs AI"
        raterName="wesley"
        onCheckName={onCheckName}
        onGenerate={() => undefined}
        onCopyPrompt={() => undefined}
        onPasteAi={() => undefined}
        onPastePacket={() => undefined}
        onKeep={() => undefined}
        onReject={() => undefined}
        onPick={() => undefined}
        onOpen={() => undefined}
        onRate={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Check this name' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generate with AI' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy prompt for external AI' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Paste AI response' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Smart copy' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Suggest names' })).toBeNull();
    expect(screen.queryByText('Generate more')).toBeNull();
    expect(screen.getByLabelText('Name candidates')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Check this name' }));
    expect(onCheckName).toHaveBeenCalled();
  });

  it('shows Needs AI when the session has no names', () => {
    render(
      <NamesSection
        session={{ ...session, candidates: [], shortlistIds: [] }}
        typedName=""
        onTypedName={() => undefined}
        busy={null}
        resolvingKeys={[]}
        isBlind={false}
        openRound={undefined}
        emptyCopy="Needs AI"
        raterName="wesley"
        onCheckName={() => undefined}
        onGenerate={() => undefined}
        onCopyPrompt={() => undefined}
        onPasteAi={() => undefined}
        onPastePacket={() => undefined}
        onKeep={() => undefined}
        onReject={() => undefined}
        onPick={() => undefined}
        onOpen={() => undefined}
        onRate={() => undefined}
      />,
    );
    expect(screen.getByText('Needs AI')).toBeTruthy();
  });
});
