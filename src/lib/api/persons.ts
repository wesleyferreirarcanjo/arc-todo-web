import { apiRequest } from './client';
import type {
  CreatePersonInput,
  Person,
  UpdatePersonInput,
} from '../../types/person';

export function fetchGeneralPersons(): Promise<Person[]> {
  return apiRequest<Person[]>('/persons');
}

export function createGeneralPerson(input: CreatePersonInput): Promise<Person> {
  return apiRequest<Person>('/persons', {
    method: 'POST',
    body: input,
  });
}

export function fetchGeneralPerson(personId: string): Promise<Person> {
  return apiRequest<Person>(`/persons/${personId}`);
}

export function updateGeneralPerson(
  personId: string,
  input: UpdatePersonInput,
): Promise<Person> {
  return apiRequest<Person>(`/persons/${personId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteGeneralPerson(personId: string): Promise<void> {
  return apiRequest<void>(`/persons/${personId}`, {
    method: 'DELETE',
  });
}

export function fetchPersons(orgId: string): Promise<Person[]> {
  return apiRequest<Person[]>(`/organizations/${orgId}/persons`);
}

export function createPerson(
  orgId: string,
  input: CreatePersonInput,
): Promise<Person> {
  return apiRequest<Person>(`/organizations/${orgId}/persons`, {
    method: 'POST',
    body: input,
  });
}

export function fetchPerson(orgId: string, personId: string): Promise<Person> {
  return apiRequest<Person>(`/organizations/${orgId}/persons/${personId}`);
}

export function updatePerson(
  orgId: string,
  personId: string,
  input: UpdatePersonInput,
): Promise<Person> {
  return apiRequest<Person>(`/organizations/${orgId}/persons/${personId}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deletePerson(orgId: string, personId: string): Promise<void> {
  return apiRequest<void>(`/organizations/${orgId}/persons/${personId}`, {
    method: 'DELETE',
  });
}
