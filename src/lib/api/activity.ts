import { apiRequest } from './client';
import type { ListUserActivityQuery, UserActivityEntry } from '../../types/activity';

function buildActivityQueryString(query?: ListUserActivityQuery): string {
  if (!query) return '';

  const params = new URLSearchParams();
  if (query.userId) params.set('userId', query.userId);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function fetchOrganizationActivity(
  orgId: string,
  query?: ListUserActivityQuery,
): Promise<UserActivityEntry[]> {
  return apiRequest<UserActivityEntry[]>(
    `/organizations/${orgId}/activity${buildActivityQueryString(query)}`,
  );
}
