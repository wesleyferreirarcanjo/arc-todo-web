import { describe, expect, it } from 'vitest';
import { UNASSIGNED_VALUE, assigneeCreatePayload } from './assigneeDisplay';

describe('assigneeDisplay', () => {
  it('omits create payload when the selection matches the project default', () => {
    expect(assigneeCreatePayload('user-1', 'user-1')).toEqual({});
    expect(assigneeCreatePayload(UNASSIGNED_VALUE, null)).toEqual({});
    expect(assigneeCreatePayload(UNASSIGNED_VALUE, 'user-1')).toEqual({
      assigneeId: null,
    });
    expect(assigneeCreatePayload('user-2', 'user-1')).toEqual({
      assigneeId: 'user-2',
    });
  });
});
