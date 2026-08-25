export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string;
  acronym?: string;
  defaultAssigneeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  defaultAssigneeId?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  color?: string;
  defaultAssigneeId?: string | null;
}
