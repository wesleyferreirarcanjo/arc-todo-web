import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  createProjectKnowledge,
  deleteProjectKnowledge,
  fetchProjectKnowledge,
  updateProjectKnowledge,
} from '../lib/api/knowledge';
import { KnowledgeForm } from '../components/KnowledgeForm';
import { KnowledgeList } from '../components/KnowledgeList';
import { useWorkspace } from '../context/WorkspaceContext';
import type {
  CreateKnowledgeInput,
  KnowledgeEntry,
  UpdateKnowledgeInput,
} from '../types/knowledge';

export function ProjectKnowledgePage() {
  const { orgId, projectId } = useParams();
  const { currentProject } = useWorkspace();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    if (!orgId || !projectId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjectKnowledge(orgId, projectId);
      setEntries(data);
    } catch {
      setError('Failed to load project knowledge.');
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function handleCreate(input: CreateKnowledgeInput) {
    if (!orgId || !projectId) return;
    const created = await createProjectKnowledge(orgId, projectId, input);
    setEntries((prev) => [created, ...prev]);
  }

  async function handleUpdate(id: string, input: UpdateKnowledgeInput) {
    if (!orgId || !projectId) return;
    const updated = await updateProjectKnowledge(orgId, projectId, id, input);
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? updated : entry)),
    );
  }

  async function handleDelete(id: string) {
    if (!orgId || !projectId) return;
    await deleteProjectKnowledge(orgId, projectId, id);
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  if (!orgId || !projectId) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>{currentProject?.name ?? 'Project'} knowledge</h2>
        <p className="page-subtitle">
          Knowledge specific to this project.
        </p>
        <div className="page-links">
          <Link
            to={`/organizations/${orgId}/projects/${projectId}`}
            className="text-link"
          >
            Back to tasks
          </Link>
        </div>
      </header>

      <KnowledgeForm onSubmit={handleCreate} />

      {loading && <p className="status-message">Loading knowledge...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && entries.length === 0 && (
        <p className="status-message">
          No project knowledge yet. Create your first entry above.
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
