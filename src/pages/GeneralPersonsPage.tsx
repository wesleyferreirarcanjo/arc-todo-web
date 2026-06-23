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

  const personCount = persons.length;

  return (
    <div className="page-shell people-page">
      <header className="page-header">
        <h2>People</h2>
        <p className="page-subtitle">
          Keep personal contacts, profile notes, and person-specific knowledge in one place.
        </p>
        <div className="people-page-summary" aria-label="People page summary">
          <span>Private to you</span>
          <span>
            {personCount} {personCount === 1 ? 'person' : 'people'}
          </span>
        </div>
        <div className="page-links people-page-links">
          <Link to="/knowledge" className="text-link">
            General knowledge
          </Link>
        </div>
      </header>

      <section className="people-create-section" aria-labelledby="people-create-heading">
        <PersonForm onSubmit={handleCreate} />
      </section>

      <section className="people-list-section" aria-labelledby="people-list-heading">
        <div className="people-list-header">
          <h3 id="people-list-heading">Your contacts</h3>
          <p className="people-list-count">
            {personCount} {personCount === 1 ? 'profile' : 'profiles'}
          </p>
        </div>

        {loading && (
          <div className="people-state-card" role="status">
            <p className="people-state-title">Loading people...</p>
            <p className="people-state-detail">Fetching your personal contacts.</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && personCount === 0 && (
          <div className="people-state-card">
            <p className="people-state-title">No people yet</p>
            <p className="people-state-detail">
              Add your first person to keep contact details and profile knowledge easy to find.
            </p>
          </div>
        )}

        {!loading && !error && personCount > 0 && (
          <PersonList persons={persons} scope="general" />
        )}
      </section>
    </div>
  );
}
