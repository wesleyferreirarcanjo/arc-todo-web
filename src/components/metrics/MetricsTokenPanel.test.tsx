import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOARD_MOBILE_QUERY } from '../../hooks/useMediaQuery';
import type { MetricsAgentToken } from '../../types/metrics';
import { MetricsTokenPanel } from './MetricsTokenPanel';

const token: MetricsAgentToken = {
  id: 'tok-1',
  serverName: 'slave-1',
  createdAt: '2026-10-05T12:00:00.000Z',
  revokedAt: null,
  lastSeenAt: null,
};

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
  cleanup();
  vi.restoreAllMocks();
});

describe('MetricsTokenPanel', () => {
  it('shows a glyph empty state with the next-step copy', () => {
    const { container } = render(
      <MetricsTokenPanel tokens={[]} onCreate={vi.fn()} onRevoke={vi.fn()} />,
    );

    expect(container.querySelector('.hub-empty-glyph')).toBeTruthy();
    expect(
      screen.getByText(/Create an agent token and install the agent on a server\./),
    ).toBeInTheDocument();
  });

  it('shows form errors with ErrorAlert', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockRejectedValue(new Error('down'));

    render(<MetricsTokenPanel tokens={[]} onCreate={onCreate} onRevoke={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'New agent token' }));
    await user.type(screen.getByLabelText('Server name'), 'slave-1');
    await user.click(screen.getByRole('button', { name: 'Create token' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Metrics service is unavailable.',
    );
  });

  it('does not mount ConfirmDialog when revoking at a 1023 matchMedia', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    const onRevoke = vi.fn();

    render(
      <MetricsTokenPanel tokens={[token]} onCreate={vi.fn()} onRevoke={onRevoke} />,
    );

    await user.click(screen.getByRole('button', { name: 'Revoke' }));

    expect(screen.queryByRole('dialog', { name: 'Revoke' })).not.toBeInTheDocument();
    expect(onRevoke).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
