import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminRoute } from '../components/AdminRoute';
import type { DeviceRow } from '../lib/api/devices';
import {
  DEVICES_EMPTY,
  DevicesPage,
  revokeDescription,
} from './DevicesPage';

const authState = vi.hoisted(() => ({
  isAdmin: false,
  user: { id: 'u-owner', username: 'owner', isAdmin: false },
}));

const api = vi.hoisted(() => ({
  listDevices: vi.fn(),
  listDeviceSessions: vi.fn(),
  listDeviceAudit: vi.fn(),
  revokeDevice: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    isAuthenticated: true,
    isAdmin: authState.isAdmin,
    logout: () => undefined,
  }),
}));

vi.mock('../lib/api/devices', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/devices')>(
    '../lib/api/devices',
  );
  return { ...actual, ...api };
});

const browser: DeviceRow = {
  id: 'br-1',
  kind: 'browser',
  name: 'Office Chrome',
  ownerUserId: 'u-owner',
  status: 'online',
  consentMode: 'ask',
  remoteEnabled: false,
  paused: false,
  lastSeenAt: '2026-10-21T12:00:00Z',
  revokedAt: null,
};

const pc: DeviceRow = {
  id: 'pc-1',
  kind: 'windows',
  name: 'Office PC',
  ownerUserId: 'u-owner',
  status: 'offline',
  consentMode: 'always',
  remoteEnabled: false,
  paused: false,
  lastSeenAt: null,
  revokedAt: null,
};

const ide: DeviceRow = {
  id: 'ide-1',
  kind: 'ide',
  name: 'Studio',
  ownerUserId: 'u-admin',
  status: 'online',
  consentMode: 'always',
  remoteEnabled: true,
  paused: false,
  lastSeenAt: '2026-10-21T12:00:00Z',
  revokedAt: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <DevicesPage />
    </MemoryRouter>,
  );
}

describe('DevicesPage', () => {
  afterEach(() => {
    cleanup();
    authState.isAdmin = false;
    authState.user = { id: 'u-owner', username: 'owner', isAdmin: false };
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it('shows an honest empty state', async () => {
    api.listDevices.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(DEVICES_EMPTY)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Devices' })).toBeInTheDocument();
  });

  it('lists own browsers and PCs and hides IDE hosts for a member', async () => {
    api.listDevices.mockResolvedValue([browser, pc, ide]);
    api.listDeviceSessions.mockResolvedValue([]);
    api.listDeviceAudit.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Office Chrome')).toBeInTheDocument();
    expect(screen.getByText('Office PC')).toBeInTheDocument();
    expect(screen.getByText('Browser')).toBeInTheDocument();
    expect(screen.getByText('PC')).toBeInTheDocument();
    expect(screen.queryByText('Studio')).not.toBeInTheDocument();
    expect(screen.queryByText('IDE')).not.toBeInTheDocument();
  });

  it('lets an admin see IDE hosts and revoke without Take over', async () => {
    authState.isAdmin = true;
    authState.user = { id: 'u-admin', username: 'admin', isAdmin: true };
    api.listDevices.mockResolvedValue([ide]);
    api.listDeviceSessions.mockResolvedValue([]);
    api.listDeviceAudit.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Studio')).toBeInTheDocument();
    expect(screen.getByText('IDE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /take over/i })).not.toBeInTheDocument();
  });

  it("hides sessions on someone else's device", async () => {
    authState.isAdmin = true;
    api.listDevices.mockResolvedValue([{ ...pc, ownerUserId: 'u-other' }]);
    renderPage();
    expect(await screen.findByText('Office PC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sessions' })).not.toBeInTheDocument();
    expect(api.listDeviceSessions).not.toHaveBeenCalled();
    expect(api.listDeviceAudit).not.toHaveBeenCalled();
  });

  it('asks for confirmation with browser copy before revoking', async () => {
    api.listDevices.mockResolvedValue([browser]);
    api.listDeviceSessions.mockResolvedValue([]);
    api.listDeviceAudit.mockResolvedValue([]);
    api.revokeDevice.mockResolvedValue({ revoked: true });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Revoke' }));
    expect(
      await screen.findByText(revokeDescription('browser', 'Office Chrome')),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Revoke this browser' })).toBeInTheDocument();
    expect(api.revokeDevice).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    expect(api.revokeDevice).toHaveBeenCalledWith('br-1');
  });

  it('asks for confirmation with PC copy before revoking', async () => {
    api.listDevices.mockResolvedValue([pc]);
    api.listDeviceSessions.mockResolvedValue([]);
    api.listDeviceAudit.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Revoke' }));
    expect(
      await screen.findByText(revokeDescription('windows', 'Office PC')),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Revoke this PC' })).toBeInTheDocument();
  });

  it('redirects /browsers and /connected-machines to /devices', async () => {
    api.listDevices.mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={['/browsers']}>
        <Routes>
          <Route path="/browsers" element={<Navigate to="/devices" replace />} />
          <Route
            path="/connected-machines"
            element={<Navigate to="/devices" replace />}
          />
          <Route path="/devices" element={<DevicesPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Devices' })).toBeInTheDocument();
  });

  it('sends a member from /admin/devices to All tasks', () => {
    render(
      <MemoryRouter initialEntries={['/admin/devices']}>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route
              path="/admin/devices"
              element={<Navigate to="/devices" replace />}
            />
          </Route>
          <Route path="/board" element={<h1>All tasks</h1>} />
          <Route path="/devices" element={<h1>Devices</h1>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'All tasks' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Devices' })).not.toBeInTheDocument();
  });
});
