import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  createOrganizationUser,
  fetchCurrentMembership,
  fetchOrganizationMembers,
} from '../lib/api/organizations';
import { MemberForm } from '../components/MemberForm';
import { MemberList } from '../components/MemberList';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type {
  CreateOrganizationUserInput,
  OrganizationMember,
  OrganizationRole,
} from '../types/organization';

function canManageMembers(role: OrganizationRole | null): boolean {
  return role === 'admin' || role === 'owner';
}

export function OrganizationMembersPage() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { currentOrganization } = useWorkspace();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [currentRole, setCurrentRole] = useState<OrganizationRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);
    try {
      const [memberList, membership] = await Promise.all([
        fetchOrganizationMembers(orgId),
        fetchCurrentMembership(orgId),
      ]);
      setMembers(memberList);
      setCurrentRole(membership.role);
    } catch {
      setError('Failed to load members or access denied.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const canManage = useMemo(
    () => canManageMembers(currentRole),
    [currentRole],
  );
  const canChangeRoles = currentRole === 'owner';

  async function handleCreate(input: CreateOrganizationUserInput) {
    if (!orgId) return;
    const created = await createOrganizationUser(orgId, input);
    setMembers((prev) =>
      [...prev, created].sort((a, b) =>
        (a.user?.username ?? '').localeCompare(b.user?.username ?? ''),
      ),
    );
  }

  if (!orgId) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>{currentOrganization?.name ?? 'Organization'} members</h2>
        <p className="page-subtitle">
          Manage login users and their roles in this organization.
        </p>
        <div className="page-links">
          <Link to={`/organizations/${orgId}`} className="text-link">
            Back to projects
          </Link>
          <Link to={`/organizations/${orgId}/activity`} className="text-link">
            Activity log
          </Link>
          <Link to={`/organizations/${orgId}/persons`} className="text-link">
            People (contacts)
          </Link>
        </div>
      </header>

      <MemberForm
        canManage={canManage}
        canAssignOwner={canChangeRoles}
        onSubmit={handleCreate}
      />

      {loading && <p className="status-message">Loading members...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && members.length === 0 && (
        <p className="status-message">No members yet.</p>
      )}

      {!loading && !error && members.length > 0 && user && (
        <MemberList
          orgId={orgId}
          members={members}
          currentUserId={user.id}
          canManage={canManage}
          canChangeRoles={canChangeRoles}
          onChanged={loadMembers}
        />
      )}
    </div>
  );
}
