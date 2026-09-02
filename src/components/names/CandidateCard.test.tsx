import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NameCandidate, ProjectNameSession } from '../../types/name-session';

const checkNameHandles = vi.hoisted(() => vi.fn());
const checkNameHistory = vi.hoisted(() => vi.fn());
const fetchProjectNameSession = vi.hoisted(() => vi.fn());

vi.mock('../../lib/api/names', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api/names')>(
    '../../lib/api/names',
  );
  return {
    ...actual,
    checkNameHandles,
    checkNameHistory,
    fetchProjectNameSession,
  };
});

import { CandidateCard } from './CandidateCard';

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

function session(partial: Partial<ProjectNameSession> = {}): ProjectNameSession {
  return {
    id: 's1',
    projectId: 'p1',
    title: 'Session',
    brief: '',
    namingGoal: 'public_product',
    productDescription: {},
    lanes: [],
    candidates: [],
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

function renderCard(
  item: NameCandidate,
  onUpdate = vi.fn(),
) {
  return render(
    <CandidateCard
      candidate={item}
      session={session({ candidates: [item], shortlistIds: [item.id] })}
      orgId="org-1"
      projectId="proj-1"
      sessionId="sess-1"
      isBlind={false}
      busy={null}
      onBusy={() => undefined}
      onSession={() => undefined}
      onCheck={() => undefined}
      onPreview={() => undefined}
      onUpdate={onUpdate}
      onExplore={() => undefined}
      onReject={() => undefined}
    />,
  );
}

describe('CandidateCard verdict, evidence, judgment', () => {
  it('renders the verdict and weakest reason before the judgment group', () => {
    renderCard(candidate());

    const weakest = screen.getByText(/Weakest: Domain Unknown/);
    expect(weakest).toHaveTextContent('unresolved domain');
    const judgment = screen.getByRole('heading', { name: 'What you must judge' });
    expect(
      weakest.compareDocumentPosition(judgment) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'What we found' })).toBeInTheDocument();
    expect(screen.getByText(/Highest total is not auto-picked/)).toBeInTheDocument();
    expect(screen.queryByText(/pass\/fail/i)).toBeNull();
  });

  it('reads an unanswered brand row as Unknown', () => {
    renderCard(candidate());
    const google = screen.getByRole('link', { name: 'Google exact' }).closest('.names-brand-row');
    expect(google).toBeTruthy();
    expect(
      within(google as HTMLElement).getByRole('radio', { name: 'Unknown' }),
    ).toBeChecked();
  });

  it('saves extracted manual judgments through onUpdate', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    renderCard(candidate(), onUpdate);

    const google = screen.getByRole('link', { name: 'Google exact' }).closest('.names-brand-row');
    await user.click(
      within(google as HTMLElement).getByRole('radio', { name: 'Collision' }),
    );
    expect(onUpdate).toHaveBeenCalled();
    const brandCall = onUpdate.mock.calls[0][0] as NameCandidate;
    expect(brandCall.brandChecks?.some((item) => item.source === 'google_exact' && item.result === 'collision')).toBe(true);

    const languageGroup = screen.getByRole('radiogroup', { name: 'Português result' });
    await user.click(within(languageGroup).getByRole('radio', { name: 'Concern' }));
    const languageCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0] as NameCandidate;
    expect(
      languageCall.languageChecks?.manual?.some(
        (item) => item.language === 'Português' && item.result === 'concern',
      ),
    ).toBe(true);

    await user.type(
      screen.getByRole('textbox', { name: 'How you heard the spelling' }),
      'Nova',
    );
    await user.click(screen.getByRole('button', { name: 'Save heard spelling' }));
    const heardCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0] as NameCandidate;
    expect(heardCall.pronunciation?.heardSpelling).toBe('Nova');

    const notes = screen.getByRole('textbox', { name: 'Notes' });
    await user.type(notes, 'Keep this');
    await user.tab();
    const notesCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0] as NameCandidate;
    expect(notesCall.notes).toBe('Keep this');
  });

  it('reports handle recheck progress and an unknown outcome', async () => {
    const user = userEvent.setup();
    const item = candidate();
    checkNameHandles.mockResolvedValue(
      candidate({
        handleChecks: [
          {
            platform: 'instagram',
            handle: 'nova',
            profileUrl: 'https://instagram.com/nova',
            availability: 'unknown',
            checkedAt: '2026-09-02',
          },
        ],
      }),
    );
    fetchProjectNameSession.mockResolvedValue(
      session({ candidates: [item], shortlistIds: [item.id] }),
    );
    renderCard(item);
    await user.click(screen.getByRole('button', { name: 'Recheck handles' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Instagram Unknown');
  });
});
