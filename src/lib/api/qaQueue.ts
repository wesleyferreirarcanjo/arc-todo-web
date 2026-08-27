import { apiRequest } from './client';
import type {
  AddQaQueueItemsInput,
  QaQueueListResponse,
} from '../../types/qaQueue';

export function fetchQaQueue(): Promise<QaQueueListResponse> {
  return apiRequest<QaQueueListResponse>('/qa-queue');
}

export function addQaQueueItems(
  input: AddQaQueueItemsInput,
): Promise<QaQueueListResponse> {
  return apiRequest<QaQueueListResponse>('/qa-queue/items', {
    method: 'POST',
    body: input,
  });
}

export function removeQaQueueItem(taskId: string): Promise<QaQueueListResponse> {
  return apiRequest<QaQueueListResponse>(`/qa-queue/items/${taskId}`, {
    method: 'DELETE',
  });
}

export function reorderQaQueue(itemIds: string[]): Promise<QaQueueListResponse> {
  return apiRequest<QaQueueListResponse>('/qa-queue', {
    method: 'PATCH',
    body: { itemIds },
  });
}

export function clearQaQueue(): Promise<QaQueueListResponse> {
  return apiRequest<QaQueueListResponse>('/qa-queue', {
    method: 'DELETE',
  });
}
