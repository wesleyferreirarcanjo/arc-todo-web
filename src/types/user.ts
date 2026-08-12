export interface ManagedUser {
  id: string;
  username: string;
  ssoAssign: string | null;
  isAdmin: boolean;
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  username: string;
  password?: string;
  ssoAssign?: string;
  isAdmin?: boolean;
  projectIds?: string[];
}

export interface UpdateUserInput {
  password?: string;
  ssoAssign?: string | null;
  isAdmin?: boolean;
  projectIds?: string[];
}

export interface ProjectOption {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
}
