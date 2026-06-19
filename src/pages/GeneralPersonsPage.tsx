import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createGeneralPerson, fetchGeneralPersons } from '../lib/api/persons';
import { PersonForm } from '../components/PersonForm';
import { PersonList } from '../components/PersonList';
import type { CreatePersonInput, Person } from '../types/person';

export function GeneralPersonsPage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPersons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGeneralPersons();
      setPersons(data);
    } catch {
      setError('Failed to load people.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPersons();
  }, [loadPersons]);

  async function handleCreate(input: CreatePersonInput) {
    const created = await createGeneralPerson(input);
    setPersons((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h2>People</h2>
        <p className="page-subtitle">
          Your personal contacts and profiles, visible only to you.
        </p>
        <div className="page-links">
          <Link to="/knowledge" className="text-link">
            General knowledge
          </Link>
        </div>
      </header>

      <PersonForm onSubmit={handleCreate} />

      {loading && <p className="status-message">Loading people...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && persons.length === 0 && (
        <p className="status-message">
          No people yet. Add your first person above.
        </p>
      )}

      {!loading && !error && persons.length > 0 && (
        <PersonList persons={persons} scope="general" />
      )}
    </div>
  );
}
