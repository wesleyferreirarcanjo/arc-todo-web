import { Select } from './Select';
import { useAssignableUsers } from '../hooks/useAssignableUsers';
import {
  UNASSIGNED_LABEL,
  UNASSIGNED_VALUE,
  type AssigneeRef,
} from '../lib/users/assigneeDisplay';

interface AssigneeSelectProps {
  orgId?: string | null;
  projectId?: string | null;
  value: string;
  onChange: (value: string) => void;
  users?: AssigneeRef[];
  disabled?: boolean;
  id?: string;
}

export function AssigneeSelect({
  orgId,
  projectId,
  value,
  onChange,
  users,
  disabled,
  id,
}: AssigneeSelectProps) {
  const fetched = useAssignableUsers(users ? null : orgId, users ? null : projectId);
  const options = users ?? fetched;

  return (
    <Select
      id={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={[
        { value: UNASSIGNED_VALUE, label: UNASSIGNED_LABEL },
        ...options.map((user) => ({
          value: user.id,
          label: user.username,
        })),
      ]}
    />
  );
}
