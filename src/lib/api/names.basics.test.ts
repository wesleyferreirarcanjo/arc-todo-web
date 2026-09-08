import { describe, expect, it } from 'vitest';
import { createNameSessionBasics } from './names';
import { DEFAULT_NAMING_GOAL } from '../names/catalog';

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
