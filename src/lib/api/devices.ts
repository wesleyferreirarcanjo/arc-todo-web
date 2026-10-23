import { apiRequest } from './client';

export type DeviceKind = 'browser' | 'windows' | 'ide';
export type DeviceStatus = 'online' | 'paused' | 'offline';

export interface DeviceRow {
  id: string;
  kind: DeviceKind;
  name: string;
  ownerUserId: string;
  ownerUsername?: string;
  status: DeviceStatus;
  consentMode: string;
  remoteEnabled: boolean;
  paused: boolean;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

export interface DeviceSessionRow {
  id: string;
  deviceId: string;
  callerUserId: string;
  openedAt: string;
  lastActivityAt: string;
  closedAt: string | null;
  closeReason: string | null;
}

export interface DeviceAuditRow {
  id: string;
  sessionId: string;
  tool: string;
  durationMs: number | null;
  success: boolean;
  error: string | null;
  inputsRedacted: Record<string, unknown> | null;
  createdAt: string;
}

export function deviceStatusLabel(device: DeviceRow): string {
  if (device.revokedAt) return 'revoked';
  return device.status;
}

export function listDevices(): Promise<DeviceRow[]> {
  return apiRequest<DeviceRow[]>('/devices');
}

export function listDeviceSessions(deviceId: string): Promise<DeviceSessionRow[]> {
  return apiRequest(`/devices/${encodeURIComponent(deviceId)}/sessions`);
}

export function listDeviceAudit(deviceId: string): Promise<DeviceAuditRow[]> {
  return apiRequest(`/devices/${encodeURIComponent(deviceId)}/audit`);
}

export function revokeDevice(deviceId: string): Promise<{ revoked: boolean }> {
  return apiRequest(`/devices/${encodeURIComponent(deviceId)}/revoke`, {
    method: 'POST',
    body: {},
  });
}
