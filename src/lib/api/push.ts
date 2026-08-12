import { apiRequest } from './client';

export interface PushVapidPublicKeyResponse {
  publicKey: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface PushPreferences {
  notifyComment: boolean;
  notifyStatusGate: boolean;
  notifyDueToday: boolean;
  optedIn: boolean;
  optedInAt: string | null;
}

export interface UpdatePushPreferencesInput {
  notifyComment?: boolean;
  notifyStatusGate?: boolean;
  notifyDueToday?: boolean;
  optedIn?: boolean;
}

export function getVapidPublicKey(): Promise<PushVapidPublicKeyResponse> {
  return apiRequest<PushVapidPublicKeyResponse>('/push/vapid-public-key');
}

export function createPushSubscription(
  input: PushSubscriptionInput,
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('/push/subscriptions', {
    method: 'POST',
    body: input,
  });
}

export function deletePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/push/subscriptions', {
    method: 'DELETE',
    body: { endpoint },
  });
}

export function getPushPreferences(): Promise<PushPreferences> {
  return apiRequest<PushPreferences>('/push/preferences');
}

export function updatePushPreferences(
  input: UpdatePushPreferencesInput,
): Promise<PushPreferences> {
  return apiRequest<PushPreferences>('/push/preferences', {
    method: 'PATCH',
    body: input,
  });
}
