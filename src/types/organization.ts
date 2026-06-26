export type OrganizationRole = 'owner' | 'admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
  user?: {
    id: string;
    username: string;
  };
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  color?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  color?: string;
}

export interface AddOrganizationMemberInput {
  username: string;
  role?: OrganizationRole;
}

export interface UpdateOrganizationMemberInput {
  role: OrganizationRole;
}

export interface CreateOrganizationUserInput {
  username: string;
  password: string;
  role?: OrganizationRole;
}

export interface OrganizationMembership {
  role: OrganizationRole;
}
