import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createGeneralPerson, fetchGeneralPersons } from '../lib/api/persons';
import { PersonForm } from '../components/PersonForm';
import { PersonList } from '../components/PersonList';
import { PeopleIcon } from '../components/icons';
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
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'people' }));
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

        {loading && <p className="status-message">Loading people...</p>}

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && personCount === 0 && (
          <div className="diagrams-empty">
            <span className="hub-empty-glyph" aria-hidden="true">
              <PeopleIcon className="arc-icon-empty" />
            </span>
            <p className="status-message">
              No people yet. Add your first person above to keep contact details
              and profile knowledge easy to find.
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
