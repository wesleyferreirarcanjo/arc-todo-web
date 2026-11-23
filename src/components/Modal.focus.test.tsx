import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';

function stubMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
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
  cleanup();
  vi.restoreAllMocks();
});

describe('Modal focus management (#arc-765)', () => {
  it('closes on Escape and returns focus to the trigger', () => {
    stubMatchMedia();
    const onClose = vi.fn();
    function Host({ open }: { open: boolean }) {
      return (
        <>
          <button type="button" data-testid="trigger">
            Open
          </button>
          <Modal open={open} onClose={onClose} title="Test dialog">
            <button type="button" autoFocus>
              Inside
            </button>
          </Modal>
        </>
      );
    }
    const { rerender } = render(<Host open={false} />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    rerender(<Host open={true} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<Host open={false} />);
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps Tab cycling inside the dialog', () => {
    stubMatchMedia();
    render(
      <Modal open onClose={() => undefined} title="Test dialog">
        <button type="button" data-testid="first">
          First
        </button>
        <button type="button" data-testid="last">
          Last
        </button>
      </Modal>,
    );
    const first = screen.getByRole('button', { name: 'Close' });
    const last = screen.getByTestId('last');

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('focuses Cancel first in a destructive ConfirmDialog', () => {
    stubMatchMedia();
    render(
      <ConfirmDialog
        open
        variant="danger"
        title="Delete diagram"
        description="Delete this diagram? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
