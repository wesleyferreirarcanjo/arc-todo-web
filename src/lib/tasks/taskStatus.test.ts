import { describe, expect, it } from 'vitest';
import { isSmartCopyStatus } from './taskStatus';

describe('isSmartCopyStatus', () => {
  it('is true only for To Do and In Progress', () => {
    expect(isSmartCopyStatus('todo')).toBe(true);
    expect(isSmartCopyStatus('in_progress')).toBe(true);
    expect(isSmartCopyStatus('dev_test')).toBe(false);
    expect(isSmartCopyStatus('qa_test')).toBe(false);
    expect(isSmartCopyStatus('done')).toBe(false);
  });
});
