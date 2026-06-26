export interface ManagedUser {
  id: string;
  username: string;
  isAdmin: boolean;
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  isAdmin?: boolean;
  projectIds?: string[];
}

export interface UpdateUserInput {
  password?: string;
  isAdmin?: boolean;
  projectIds?: string[];
}

export interface ProjectOption {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
}
