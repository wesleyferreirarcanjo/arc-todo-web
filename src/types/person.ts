export interface Person {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  title: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonInput {
  name: string;
  email?: string;
  title?: string;
  notes?: string;
}

export interface UpdatePersonInput {
  name?: string;
  email?: string | null;
  title?: string | null;
  notes?: string | null;
}
