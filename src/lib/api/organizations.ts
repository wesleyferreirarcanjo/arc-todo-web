import { apiRequest } from './client';
import type {
  AddOrganizationMemberInput,
  CreateOrganizationInput,
  Organization,
  OrganizationMember,
  UpdateOrganizationInput,
  UpdateOrganizationMemberInput,
} from '../../types/organization';

export function fetchOrganizations(): Promise<Organization[]> {
  return apiRequest<Organization[]>('/organizations');
}

export function createOrganization(
  input: CreateOrganizationInput,
): Promise<Organization> {
  return apiRequest<Organization>('/organizations', {
    method: 'POST',
    body: input,
  });
}

export function fetchOrganization(orgId: string): Promise<Organization> {
  return apiRequest<Organization>(`/organizations/${orgId}`);
}

export function updateOrganization(
  orgId: string,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  return apiRequest<Organization>(`/organizations/${orgId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteOrganization(orgId: string): Promise<void> {
  return apiRequest<void>(`/organizations/${orgId}`, {
    method: 'DELETE',
  });
}

export function fetchOrganizationMembers(
  orgId: string,
): Promise<OrganizationMember[]> {
  return apiRequest<OrganizationMember[]>(`/organizations/${orgId}/members`);
}

export function addOrganizationMember(
  orgId: string,
  input: AddOrganizationMemberInput,
): Promise<OrganizationMember> {
  return apiRequest<OrganizationMember>(`/organizations/${orgId}/members`, {
    method: 'POST',
    body: input,
  });
}

export function updateOrganizationMember(
  orgId: string,
  userId: string,
  input: UpdateOrganizationMemberInput,
): Promise<OrganizationMember> {
  return apiRequest<OrganizationMember>(
    `/organizations/${orgId}/members/${userId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export function removeOrganizationMember(
  orgId: string,
  userId: string,
): Promise<void> {
  return apiRequest<void>(`/organizations/${orgId}/members/${userId}`, {
    method: 'DELETE',
  });
}
