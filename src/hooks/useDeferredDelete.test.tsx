import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOARD_MOBILE_QUERY } from './useMediaQuery';
import { useDeferredDelete } from './useDeferredDelete';

function stubMatchMedia(mobile: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mobile && query === BOARD_MOBILE_QUERY,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useDeferredDelete', () => {
  it('does not commit on mobile until dismiss', async () => {
    stubMatchMedia(true);
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDeferredDelete(onCommit));

    act(() => {
      result.current.requestDelete();
    });

    expect(onCommit).not.toHaveBeenCalled();
    expect(result.current.toastOpen).toBe(true);
    expect(result.current.confirmOpen).toBe(false);

    await act(async () => {
      result.current.dismiss();
    });

    expect(onCommit).toHaveBeenCalledOnce();
  });

  it('never commits on mobile undo', () => {
    stubMatchMedia(true);
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDeferredDelete(onCommit));

    act(() => {
      result.current.requestDelete();
    });
    act(() => {
      result.current.undo();
    });

    expect(onCommit).not.toHaveBeenCalled();
    expect(result.current.toastOpen).toBe(false);
  });

  it('does not commit on desktop until confirm', async () => {
    stubMatchMedia(false);
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDeferredDelete(onCommit));

    act(() => {
      result.current.requestDelete();
    });

    expect(onCommit).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(true);
    expect(result.current.toastOpen).toBe(false);

    await act(async () => {
      result.current.confirm();
    });

    expect(onCommit).toHaveBeenCalledOnce();
  });
});
