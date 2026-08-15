import { ErrorAlert } from '../components/ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { createPerson, fetchPersons } from '../lib/api/persons';
import { PersonForm } from '../components/PersonForm';
import { PersonList } from '../components/PersonList';
import { PeopleIcon } from '../components/icons';
import {
  entityAccentStyle,
  useWorkspaceAccent,
} from '../components/WorkspaceChrome';
import { useWorkspace } from '../context/WorkspaceContext';
import type { CreatePersonInput, Person } from '../types/person';

export function OrganizationPersonsPage() {
  const { orgId } = useParams();
  const { currentOrganization } = useWorkspace();
  const { color } = useWorkspaceAccent();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPersons = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchPersons(orgId);
      setPersons(data);
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'people' }));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadPersons();
  }, [loadPersons]);

  async function handleCreate(input: CreatePersonInput) {
    if (!orgId) return;
    const created = await createPerson(orgId, input);
    setPersons((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  if (!orgId) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <div className="page-shell" style={entityAccentStyle(color)}>
      <header className={`page-header${color ? ' has-accent' : ''}`}>
        <h2>{currentOrganization?.name ?? 'Organization'} people</h2>
        <p className="page-subtitle">
          Manage people and open their knowledge profiles.
        </p>
        <div className="page-links">
          <Link to={`/organizations/${orgId}`} className="text-link">
            Back to projects
          </Link>
          <Link to={`/organizations/${orgId}/knowledge`} className="text-link">
            Organization knowledge
          </Link>
        </div>
      </header>

      <PersonForm onSubmit={handleCreate} />

      {loading && <p className="status-message">Loading people...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {!loading && !error && persons.length === 0 && (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <PeopleIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">
            No people yet. Add your first person above.
          </p>
        </div>
      )}

      {!loading && !error && persons.length > 0 && (
        <PersonList persons={persons} orgId={orgId} />
      )}
    </div>
  );
}
