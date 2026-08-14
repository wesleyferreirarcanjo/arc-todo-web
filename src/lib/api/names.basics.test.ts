import { describe, expect, it } from 'vitest';
import { createNameSessionBasics } from './names';
import { DEFAULT_NAMING_GOAL } from '../names/catalog';

describe('createNameSessionBasics', () => {
  it('sends a working name and default goal without extra canvas fields', () => {
    expect(createNameSessionBasics('project-g')).toEqual({
      title: 'project-g',
      brief: 'project-g',
      namingGoal: DEFAULT_NAMING_GOAL,
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
      productDescription: { whatItIs: 'A private task board.' },
    });
  });
});
