import { useNavigate } from 'react-router-dom';
import type { Person } from '../types/person';

interface PersonListProps {
  persons: Person[];
  scope?: 'general' | 'organization';
  orgId?: string;
}

export function PersonList({
  persons,
  scope = 'organization',
  orgId,
}: PersonListProps) {
  const navigate = useNavigate();

  if (scope === 'organization' && !orgId) {
    return null;
  }

  return (
    <div className="entity-list">
      {persons.map((person) => (
        <div key={person.id} className="entity-card person-card">
          <button
            type="button"
            className="entity-card-main"
            aria-label={`Open knowledge for ${person.name}`}
            onClick={() =>
              navigate(
                scope === 'general'
                  ? `/people/${person.id}/knowledge`
                  : `/organizations/${orgId}/persons/${person.id}/knowledge`,
              )
            }
          >
            <div className="person-card-header">
              <div className="person-avatar" aria-hidden="true">
                {person.name.trim().charAt(0).toUpperCase()}
              </div>
              <div className="person-card-identity">
                <h3>{person.name}</h3>
                <p className="person-card-scope">
                  {scope === 'general' ? 'Personal contact' : 'Organization contact'}
                </p>
              </div>
            </div>

            <div className="person-card-details">
              {person.title && (
                <p className="entity-meta person-card-detail">
                  <span>Role</span>
                  {person.title}
                </p>
              )}
              {person.email && (
                <p className="entity-meta person-card-detail">
                  <span>Email</span>
                  {person.email}
                </p>
              )}
            </div>

            {person.notes && (
              <p className="entity-description person-card-notes">{person.notes}</p>
            )}

            <span className="person-card-knowledge-link">Open knowledge</span>
          </button>
        </div>
      ))}
    </div>
  );
}
