import { useCallback, useEffect, useState } from 'react';
import {
  createGeneralKnowledge,
  deleteGeneralKnowledge,
  fetchGeneralKnowledge,
  updateGeneralKnowledge,
} from '../lib/api/knowledge';
import { KnowledgeForm } from '../components/KnowledgeForm';
import { KnowledgeList } from '../components/KnowledgeList';
import type {
  CreateKnowledgeInput,
  KnowledgeEntry,
  UpdateKnowledgeInput,
} from '../types/knowledge';

export function GeneralKnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGeneralKnowledge();
      setEntries(data);
    } catch {
      setError('Failed to load knowledge.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function handleCreate(input: CreateKnowledgeInput) {
    const created = await createGeneralKnowledge(input);
    setEntries((prev) => [created, ...prev]);
  }

  async function handleUpdate(id: string, input: UpdateKnowledgeInput) {
    const updated = await updateGeneralKnowledge(id, input);
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? updated : entry)),
    );
  }

  async function handleDelete(id: string) {
    await deleteGeneralKnowledge(id);
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>General knowledge</h2>
        <p className="page-subtitle">
          Private notes and knowledge visible only to you.
        </p>
      </header>

      <KnowledgeForm onSubmit={handleCreate} />

      {loading && <p className="status-message">Loading knowledge...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <p className="status-message">
          No knowledge entries yet. Create your first one above.
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
