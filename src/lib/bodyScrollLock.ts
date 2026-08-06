/** Module-level refcount so nested modals share one body overflow lock. */

let lockCount = 0;

export function acquireBodyScrollLock(): void {
  lockCount += 1;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
}

export function releaseBodyScrollLock(): void {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}

/** Test-only: reset counter and body style between cases. */
export function resetBodyScrollLockForTests(): void {
  lockCount = 0;
  document.body.style.overflow = '';
}

export function getBodyScrollLockCountForTests(): number {
  return lockCount;
}
