import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { Select } from './Select';

export function OrgSwitcher() {
  const navigate = useNavigate();
  const { organizations, currentOrgId } = useWorkspace();

  return (
    <label className="sidebar-field">
      Organization
      <Select
        value={currentOrgId ?? ''}
        placeholder="Select organization"
        onChange={(nextOrgId) => {
          if (nextOrgId) {
            navigate(`/organizations/${nextOrgId}`);
          } else {
            navigate('/organizations');
          }
        }}
        options={[
          { value: '', label: 'Select organization' },
          ...organizations.map((organization) => ({
            value: organization.id,
            label: organization.name,
          })),
        ]}
      />
    </label>
  );
}
