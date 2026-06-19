import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  createGeneralPersonKnowledge,
  deleteGeneralPersonKnowledge,
  fetchGeneralPersonKnowledge,
  updateGeneralPersonKnowledge,
  uploadKnowledgeAttachment,
} from '../lib/api/knowledge';
import { fetchGeneralPerson } from '../lib/api/persons';
import { KnowledgeForm } from '../components/KnowledgeForm';
import { KnowledgeList } from '../components/KnowledgeList';
import type {
  CreateKnowledgeInput,
  KnowledgeEntry,
  UpdateKnowledgeInput,
} from '../types/knowledge';
import type { Person } from '../types/person';

export function GeneralPersonKnowledgePage() {
  const { personId } = useParams();
  const [person, setPerson] = useState<Person | null>(null);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!personId) return;

    setLoading(true);
    setError(null);
    try {
      const [personData, knowledgeData] = await Promise.all([
        fetchGeneralPerson(personId),
        fetchGeneralPersonKnowledge(personId),
      ]);
      setPerson(personData);
      setEntries(knowledgeData);
    } catch {
      setError('Failed to load person knowledge.');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreate(input: CreateKnowledgeInput, files?: File[]) {
    if (!personId) return;
    const created = await createGeneralPersonKnowledge(personId, input);
    if (files?.length) {
      for (const file of files) {
        await uploadKnowledgeAttachment(
          { type: 'generalPerson', personId },
          created.id,
          file,
        );
      }
    }
    setEntries((prev) => [created, ...prev]);
  }

  async function handleUpdate(id: string, input: UpdateKnowledgeInput) {
    if (!personId) return;
    const updated = await updateGeneralPersonKnowledge(personId, id, input);
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? updated : entry)),
    );
  }

  async function handleDelete(id: string) {
    if (!personId) return;
    await deleteGeneralPersonKnowledge(personId, id);
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  if (!personId) {
    return <Navigate to="/people" replace />;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>{person?.name ?? 'Person'} knowledge</h2>
        <p className="page-subtitle">
          Private knowledge linked to this person in your workspace.
        </p>
        {person && (
          <div className="person-profile-meta">
            {person.title && <span>{person.title}</span>}
            {person.email && <span>{person.email}</span>}
          </div>
        )}
        <div className="page-links">
          <Link to="/people" className="text-link">
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
          scope={{ type: 'generalPerson', personId }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
