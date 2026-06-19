import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  createPersonKnowledge,
  deletePersonKnowledge,
  fetchPersonKnowledge,
  updatePersonKnowledge,
} from '../lib/api/knowledge';
import { fetchPerson } from '../lib/api/persons';
import { KnowledgeForm } from '../components/KnowledgeForm';
import { KnowledgeList } from '../components/KnowledgeList';
import type {
  CreateKnowledgeInput,
  KnowledgeEntry,
  UpdateKnowledgeInput,
} from '../types/knowledge';
import type { Person } from '../types/person';

export function PersonKnowledgePage() {
  const { orgId, personId } = useParams();
  const [person, setPerson] = useState<Person | null>(null);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!orgId || !personId) return;

    setLoading(true);
    setError(null);
    try {
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
  }, [orgId, personId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreate(input: CreateKnowledgeInput) {
    if (!orgId || !personId) return;
    const created = await createPersonKnowledge(orgId, personId, input);
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

  return (
    <div className="page-shell">
      <header className="page-header">
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
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
