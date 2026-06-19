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
            onClick={() =>
              navigate(
                scope === 'general'
                  ? `/people/${person.id}/knowledge`
                  : `/organizations/${orgId}/persons/${person.id}/knowledge`,
              )
            }
          >
            <h3>{person.name}</h3>
            {person.title && <p className="entity-meta">{person.title}</p>}
            {person.email && <p className="entity-meta">{person.email}</p>}
            {person.notes && (
              <p className="entity-description">{person.notes}</p>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
