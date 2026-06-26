export interface UserActivityEntry {
  id: string;
  organizationId: string;
  actorUserId: string;
  actorUsername: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ListUserActivityQuery {
  userId?: string;
  limit?: number;
  offset?: number;
}
