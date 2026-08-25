import { useEffect, useState } from 'react';
import { fetchAssignableUsers } from '../lib/api/projects';
import type { AssigneeRef } from '../lib/users/assigneeDisplay';

export function useAssignableUsers(
  orgId?: string | null,
  projectId?: string | null,
): AssigneeRef[] {
  const [users, setUsers] = useState<AssigneeRef[]>([]);

  useEffect(() => {
    if (!orgId || !projectId) {
      setUsers([]);
      return;
    }

    let cancelled = false;
    void fetchAssignableUsers(orgId, projectId)
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId, projectId]);

  return users;
}
