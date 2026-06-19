import { useNavigate } from 'react-router-dom';
import { getEntityAccent } from '../lib/color/entityColor';
import type { Organization } from '../types/organization';

interface OrganizationListProps {
  organizations: Organization[];
}

export function OrganizationList({ organizations }: OrganizationListProps) {
  const navigate = useNavigate();

  return (
    <div className="entity-list">
      {organizations.map((organization) => (
        <button
          key={organization.id}
          type="button"
          className="entity-card has-accent"
          style={
            {
              '--entity-accent': getEntityAccent(organization.id),
            } as React.CSSProperties
          }
          onClick={() => navigate(`/organizations/${organization.id}`)}
        >
          <h3>{organization.name}</h3>
          <p className="entity-meta">{organization.slug}</p>
        </button>
      ))}
    </div>
  );
}
