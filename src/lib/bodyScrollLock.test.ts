import { afterEach, describe, expect, it } from 'vitest';
import {
  acquireBodyScrollLock,
  getBodyScrollLockCountForTests,
  releaseBodyScrollLock,
  resetBodyScrollLockForTests,
} from './bodyScrollLock';

describe('bodyScrollLock', () => {
  afterEach(() => {
    resetBodyScrollLockForTests();
  });

  it('locks body overflow on first acquire and clears on last release', () => {
    acquireBodyScrollLock();
    expect(document.body.style.overflow).toBe('hidden');
    expect(getBodyScrollLockCountForTests()).toBe(1);

    releaseBodyScrollLock();
    expect(document.body.style.overflow).toBe('');
    expect(getBodyScrollLockCountForTests()).toBe(0);
  });

  it('keeps overflow locked until nested locks are fully released', () => {
    acquireBodyScrollLock(); // A
    acquireBodyScrollLock(); // B
    expect(document.body.style.overflow).toBe('hidden');
    expect(getBodyScrollLockCountForTests()).toBe(2);

    releaseBodyScrollLock(); // close B
    expect(document.body.style.overflow).toBe('hidden');
    expect(getBodyScrollLockCountForTests()).toBe(1);

    releaseBodyScrollLock(); // close A
    expect(document.body.style.overflow).toBe('');
    expect(getBodyScrollLockCountForTests()).toBe(0);
  });

  it('ignores release when nothing is locked', () => {
    releaseBodyScrollLock();
    expect(getBodyScrollLockCountForTests()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });
});
