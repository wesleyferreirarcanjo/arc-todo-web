import { describe, expect, it, vi } from 'vitest';
import { createNameSessionBasics, setNameCandidateFavorite } from './names';
import { DEFAULT_NAMING_GOAL } from '../names/catalog';

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  apiRequest,
}));

describe('createNameSessionBasics', () => {
  it('sends a working name and default goal without extra canvas fields', () => {
    expect(createNameSessionBasics('project-g')).toEqual({
      title: 'project-g',
      brief: 'project-g',
      namingGoal: DEFAULT_NAMING_GOAL,
      participationMode: 'solo',
      productDescription: {},
    });
  });

  it('includes a team participation choice when asked', () => {
    expect(
      createNameSessionBasics('project-g', '', DEFAULT_NAMING_GOAL, 'team'),
    ).toEqual({
      title: 'project-g',
      brief: 'project-g',
      namingGoal: DEFAULT_NAMING_GOAL,
      participationMode: 'team',
      productDescription: {},
    });
  });

  it('includes the product sentence when provided', () => {
    expect(
      createNameSessionBasics('project-g', ' A private task board. ', 'feature'),
    ).toEqual({
      title: 'project-g',
      brief: 'project-g',
      namingGoal: 'feature',
      participationMode: 'solo',
      productDescription: { whatItIs: 'A private task board.' },
    });
  });
});

describe('setNameCandidateFavorite', () => {
  it('PUTs favorited on the candidate favorite route', async () => {
    apiRequest.mockResolvedValue({});
    await setNameCandidateFavorite('org', 'proj', 'sess', 'cand', {
      favorited: true,
    });
    expect(apiRequest).toHaveBeenCalledWith(
      '/organizations/org/projects/proj/name-sessions/sess/candidates/cand/favorite',
      { method: 'PUT', body: { favorited: true } },
    );
  });
});
