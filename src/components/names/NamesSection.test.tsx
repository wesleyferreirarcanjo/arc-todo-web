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

describe('NamesSection density', () => {
  it('makes check-name the hero and does not stack kept cards', async () => {
    const user = userEvent.setup();
    const onCheckName = vi.fn();
    render(
      <NamesSection
        session={session}
        orgId="o"
        projectId="p"
        sessionId="s"
        typedName=""
        onTypedName={() => undefined}
        busy={null}
        families={[]}
        onFamilies={() => undefined}
        filterLane=""
        onFilterLane={() => undefined}
        filterFamily=""
        onFilterFamily={() => undefined}
        filterSource=""
        onFilterSource={() => undefined}
        visibleCandidates={[item]}
        resolvingKeys={[]}
        isBlind={false}
        openRound={undefined}
        onCheckName={onCheckName}
        onSuggestNames={() => undefined}
        onGenerateFamilies={() => undefined}
        readinessHint={null}
        emptyCopy="empty"
        onUpdateCandidate={() => undefined}
        onExplore={() => undefined}
        onKeep={() => undefined}
        onReject={() => undefined}
        onBusy={() => undefined}
        onSession={() => undefined}
        lastCheckedId="kept"
        expandedId={null}
        onExpandedId={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Check this name' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suggest names' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try variations of this name' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Kept' })).toBeNull();
    expect(screen.getByLabelText('Name candidates')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Check this name' }));
    expect(onCheckName).toHaveBeenCalled();
  });
});
