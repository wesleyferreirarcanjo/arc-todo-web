export type QaEnvironment = {
  name: string;
  url: string;
  notes?: string;
};

export type QaUser = {
  label: string;
  email?: string;
  howToSignIn?: string;
  notes?: string;
};

export type ProjectQaInfo = {
  id: string | null;
  projectId: string;
  environments: QaEnvironment[];
  users: QaUser[];
  notes: string | null;
  updatedById: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UpdateProjectQaInfoInput = {
  environments?: QaEnvironment[];
  users?: QaUser[];
  notes?: string | null;
};
