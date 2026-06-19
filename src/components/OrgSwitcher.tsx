import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';

export function OrgSwitcher() {
  const navigate = useNavigate();
  const { organizations, currentOrgId } = useWorkspace();

  return (
    <label className="sidebar-field">
      Organization
      <select
        value={currentOrgId ?? ''}
        onChange={(event) => {
          const nextOrgId = event.target.value;
          if (nextOrgId) {
            navigate(`/organizations/${nextOrgId}`);
          } else {
            navigate('/organizations');
          }
        }}
      >
        <option value="">Select organization</option>
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
    </label>
  );
}
