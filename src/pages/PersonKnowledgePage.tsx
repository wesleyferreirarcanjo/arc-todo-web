import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  createPersonKnowledge,
  deletePersonKnowledge,
  fetchOrganizationKnowledgeAccess,
  fetchPersonKnowledge,
  updatePersonKnowledge,
  uploadKnowledgeAttachment,
} from '../lib/api/knowledge';
import { fetchPerson } from '../lib/api/persons';
import { KnowledgeForm } from '../components/KnowledgeForm';
import { KnowledgeList } from '../components/KnowledgeList';
import {
  entityAccentStyle,
  useWorkspaceAccent,
  WorkspaceEyebrow,
} from '../components/WorkspaceChrome';
import { useAuth } from '../context/AuthContext';
import type {
  CreateKnowledgeInput,
  KnowledgeEntry,
  UpdateKnowledgeInput,
} from '../types/knowledge';
import type { Person } from '../types/person';

export function PersonKnowledgePage() {
  const { orgId, personId } = useParams();
  const { isAdmin } = useAuth();
  const { color } = useWorkspaceAccent();
  const [person, setPerson] = useState<Person | null>(null);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const loadData = useCallback(async () => {
    if (!orgId || !personId) return;

    setLoading(true);
    setError(null);
    setAccessDenied(false);
    try {
      if (!isAdmin) {
        const access = await fetchOrganizationKnowledgeAccess(orgId);
        if (!access.hasAccess) {
          setAccessDenied(true);
          setEntries([]);
          setPerson(null);
          return;
        }
      }

      const [personData, knowledgeData] = await Promise.all([
        fetchPerson(orgId, personId),
        fetchPersonKnowledge(orgId, personId),
      ]);
      setPerson(personData);
      setEntries(knowledgeData);
    } catch {
      setError('Failed to load person knowledge.');
    } finally {
      setLoading(false);
    }
  }, [orgId, personId, isAdmin]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreate(input: CreateKnowledgeInput, files?: File[]) {
    if (!orgId || !personId) return;
    const created = await createPersonKnowledge(orgId, personId, input);
    if (files?.length) {
      for (const file of files) {
        await uploadKnowledgeAttachment(
          { type: 'person', orgId, personId },
          created.id,
          file,
        );
      }
    }
    setEntries((prev) => [created, ...prev]);
  }

  async function handleUpdate(id: string, input: UpdateKnowledgeInput) {
    if (!orgId || !personId) return;
    const updated = await updatePersonKnowledge(orgId, personId, id, input);
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? updated : entry)),
    );
  }

  async function handleDelete(id: string) {
    if (!orgId || !personId) return;
    await deletePersonKnowledge(orgId, personId, id);
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  if (!orgId || !personId) {
    return <Navigate to="/organizations" replace />;
  }

  if (accessDenied) {
    return (
      <div className="page-shell">
        <div className="alert alert-error">
          You do not have access to this knowledge base. Ask an administrator
          to grant knowledge access.
        </div>
        <div className="page-links">
          <Link to={`/organizations/${orgId}/persons`} className="text-link">
            Back to people
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={entityAccentStyle(color)}>
      <header className={`page-header${color ? ' has-accent' : ''}`}>
        <WorkspaceEyebrow requireProject={false} />
        <h2>{person?.name ?? 'Person'} knowledge</h2>
        <p className="page-subtitle">
          Knowledge linked to this person in the organization.
        </p>
        {person && (
          <div className="person-profile-meta">
            {person.title && <span>{person.title}</span>}
            {person.email && <span>{person.email}</span>}
          </div>
        )}
        <div className="page-links">
          <Link to={`/organizations/${orgId}/persons`} className="text-link">
            Back to people
          </Link>
        </div>
      </header>

      <KnowledgeForm onSubmit={handleCreate} />

      {loading && <p className="status-message">Loading knowledge...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <p className="status-message">
          No person knowledge yet. Create your first entry above.
        </p>
      )}

      {!loading && !error && entries.length > 0 && (
        <KnowledgeList
          entries={entries}
          scope={{ type: 'person', orgId, personId }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
