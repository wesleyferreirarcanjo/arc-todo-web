import { describe, expect, it } from 'vitest';
import { getAdjacentStatus } from './adjacentStatus';

describe('getAdjacentStatus', () => {
  it('advances to the next status', () => {
    expect(getAdjacentStatus('todo', 'next')).toEqual({
      status: 'in_progress',
      clamped: false,
    });
  });

  it('retreats to the previous status', () => {
    expect(getAdjacentStatus('in_progress', 'previous')).toEqual({
      status: 'todo',
      clamped: false,
    });
  });

  it('clamps at the start and end of the pipeline', () => {
    expect(getAdjacentStatus('todo', 'previous')).toEqual({
      status: 'todo',
      clamped: true,
    });
    expect(getAdjacentStatus('done', 'next')).toEqual({
      status: 'done',
      clamped: true,
    });
  });
});
