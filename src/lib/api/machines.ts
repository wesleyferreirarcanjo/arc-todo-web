import { apiRequest } from './client';

export type MachineStatus = 'online' | 'paused' | 'offline';

export interface ConnectedMachine {
  id: string;
  name: string;
  ownerUserId: string;
  ownerUsername?: string;
  status: MachineStatus;
  remoteEnabled: boolean;
  paused: boolean;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

export interface ControlSessionRow {
  id: string;
  machineId: string;
  callerUserId: string;
  openedAt: string;
  lastActivityAt: string;
  closedAt: string | null;
  closeReason: string | null;
}

export interface ControlToolCallRow {
  id: string;
  sessionId: string;
  tool: string;
  durationMs: number | null;
  success: boolean;
  error: string | null;
  inputsRedacted: Record<string, unknown> | null;
  createdAt: string;
}

export interface TokenUsageRow {
  id: string;
  turnId: string;
  controlSessionId: string | null;
  estimatedInputTokens: number | null;
  estimatedOutputTokens: number | null;
  reportedInputTokens: number | null;
  reportedOutputTokens: number | null;
  costDelta: number | null;
  costCurrency: string | null;
  source: string;
  createdAt: string;
}

export function machineStatusLabel(machine: ConnectedMachine): string {
  if (machine.revokedAt) return 'revoked';
  return machine.status;
}

export function authorizeMachineConnect(body: {
  state: string;
  codeChallenge: string;
  name?: string;
}) {
  return apiRequest<{ callbackUrl: string }>('/auth/machine/authorize', {
    method: 'POST',
    body,
  });
}

export function fetchMachines(): Promise<ConnectedMachine[]> {
  return apiRequest<ConnectedMachine[]>('/machines');
}

export function renameMachine(
  machineId: string,
  name: string,
): Promise<ConnectedMachine> {
  return apiRequest(`/machines/${encodeURIComponent(machineId)}`, {
    method: 'PATCH',
    body: { name },
  });
}

export function setMachineRemote(
  machineId: string,
  on: boolean,
): Promise<ConnectedMachine> {
  return apiRequest(`/machines/${encodeURIComponent(machineId)}`, {
    method: 'PATCH',
    body: { remoteEnabled: on },
  });
}

export function revokeMachine(machineId: string): Promise<{ revoked: boolean }> {
  return apiRequest(`/machines/${encodeURIComponent(machineId)}/revoke`, {
    method: 'POST',
    body: {},
  });
}

export function fetchMachineSessions(
  machineId: string,
): Promise<ControlSessionRow[]> {
  return apiRequest(`/machines/${encodeURIComponent(machineId)}/sessions`);
}

export function fetchMachineToolCalls(
  machineId: string,
): Promise<ControlToolCallRow[]> {
  return apiRequest(`/machines/${encodeURIComponent(machineId)}/tool-calls`);
}

export function fetchMachineUsage(
  machineId: string,
): Promise<TokenUsageRow[]> {
  return apiRequest(`/machines/${encodeURIComponent(machineId)}/usage`);
}
