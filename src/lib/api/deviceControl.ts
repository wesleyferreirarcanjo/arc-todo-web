import { apiRequest } from './client';

export const REMOTE_ACTIONS = [
  'notify',
  'open_ui',
  'pause_new_sessions',
  'request_cancel_session',
] as const;

export type RemoteAction = (typeof REMOTE_ACTIONS)[number];

export interface DevicePresence {
  id: string;
  name: string;
  lastSeen: string;
  remoteEnabled: boolean;
  revoked: boolean;
  paused: boolean;
  paired: boolean;
  activeSessions: number;
}

export interface DeviceAuditRow {
  commandId: string;
  action: string;
  event: string;
  actor: string;
  at: string;
}

export function isRemoteAction(action: string): action is RemoteAction {
  return (REMOTE_ACTIONS as readonly string[]).includes(action);
}

export function fetchDevices(): Promise<DevicePresence[]> {
  return apiRequest<DevicePresence[]>('/device-control/devices');
}

export function fetchDeviceAudit(deviceId: string): Promise<DeviceAuditRow[]> {
  return apiRequest<DeviceAuditRow[]>(`/device-control/devices/${encodeURIComponent(deviceId)}/audit`);
}

export function sendDeviceCommand(
  deviceId: string,
  action: RemoteAction,
  idempotencyKey: string,
  payload: Record<string, unknown> = {},
): Promise<{ id: string; status: string }> {
  if (!isRemoteAction(action)) {
    return Promise.reject(new Error('That machine action is not allowed.'));
  }
  return apiRequest(`/device-control/devices/${encodeURIComponent(deviceId)}/commands`, {
    method: 'POST',
    body: { action, payload, idempotencyKey },
  });
}

export function revokeDevice(deviceId: string): Promise<{ revoked: boolean }> {
  return apiRequest(`/device-control/devices/${encodeURIComponent(deviceId)}/revoke`, {
    method: 'POST',
    body: {},
  });
}
