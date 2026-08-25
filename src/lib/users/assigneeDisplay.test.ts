import { describe, expect, it } from 'vitest';
import {
  UNASSIGNED_VALUE,
  assigneeCreatePayload,
  assigneeHue,
  assigneeInitials,
} from './assigneeDisplay';

describe('assigneeDisplay', () => {
  it('builds initials from a username', () => {
    expect(assigneeInitials('wesley')).toBe('WE');
    expect(assigneeInitials('ada.lovelace')).toBe('AL');
    expect(assigneeInitials('a')).toBe('A');
  });

  it('hashes a stable hue', () => {
    expect(assigneeHue('wesley')).toBe(assigneeHue('wesley'));
    expect(assigneeHue('wesley')).not.toBe(assigneeHue('arthura'));
  });

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
