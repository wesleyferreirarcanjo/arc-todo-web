import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  createOrganizationKnowledge,
  deleteOrganizationKnowledge,
  fetchOrganizationKnowledge,
  updateOrganizationKnowledge,
  uploadKnowledgeAttachment,
} from '../lib/api/knowledge';
import { KnowledgeForm } from '../components/KnowledgeForm';
import { KnowledgeList } from '../components/KnowledgeList';
import { useWorkspace } from '../context/WorkspaceContext';
import type {
  CreateKnowledgeInput,
  KnowledgeEntry,
  UpdateKnowledgeInput,
} from '../types/knowledge';

export function OrganizationKnowledgePage() {
  const { orgId } = useParams();
  const { currentOrganization } = useWorkspace();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrganizationKnowledge(orgId);
      setEntries(data);
    } catch {
      setError('Failed to load organization knowledge.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function handleCreate(input: CreateKnowledgeInput, files?: File[]) {
    if (!orgId) return;
    const created = await createOrganizationKnowledge(orgId, input);
    if (files?.length) {
      for (const file of files) {
        await uploadKnowledgeAttachment(
          { type: 'organization', orgId },
          created.id,
          file,
        );
      }
    }
    setEntries((prev) => [created, ...prev]);
  }

  async function handleUpdate(id: string, input: UpdateKnowledgeInput) {
    if (!orgId) return;
    const updated = await updateOrganizationKnowledge(orgId, id, input);
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? updated : entry)),
    );
  }

  async function handleDelete(id: string) {
    if (!orgId) return;
    await deleteOrganizationKnowledge(orgId, id);
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  if (!orgId) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>{currentOrganization?.name ?? 'Organization'} knowledge</h2>
        <p className="page-subtitle">
          Shared knowledge for everyone in this organization.
        </p>
        <div className="page-links">
          <Link to={`/organizations/${orgId}`} className="text-link">
            Back to projects
          </Link>
          <Link to={`/organizations/${orgId}/persons`} className="text-link">
            People
          </Link>
        </div>
      </header>

      <KnowledgeForm onSubmit={handleCreate} />

      {loading && <p className="status-message">Loading knowledge...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <p className="status-message">
          No organization knowledge yet. Create your first entry above.
        </p>
      )}

      {!loading && !error && entries.length > 0 && (
        <KnowledgeList
          entries={entries}
          scope={{ type: 'organization', orgId }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
