import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminRoute } from '../components/AdminRoute';
import { isRemoteAction } from '../lib/api/deviceControl';
import { DeviceControlPage } from './DeviceControlPage';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, isAdmin: false, logout: () => undefined }),
}));

vi.mock('../lib/api/deviceControl', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/deviceControl')>('../lib/api/deviceControl');
  return {
    ...actual,
    fetchDevices: vi.fn().mockResolvedValue([]),
    fetchDeviceAudit: vi.fn().mockResolvedValue([]),
  };
});

describe('DeviceControlPage', () => {
  afterEach(() => cleanup());

  it('refuses actions outside the allowlist', () => {
    expect(isRemoteAction('notify')).toBe(true);
    expect(isRemoteAction('shell')).toBe(false);
    expect(isRemoteAction('read_file')).toBe(false);
  });

  it('hides the page from a member', () => {
    render(
      <MemoryRouter initialEntries={['/admin/devices']}>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route path="/admin/devices" element={<DeviceControlPage />} />
          </Route>
          <Route path="/board" element={<h1>Board</h1>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Board' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Machines' })).not.toBeInTheDocument();
  });
});
