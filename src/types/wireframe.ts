export interface ProjectWireframeSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWireframe extends ProjectWireframeSummary {
  projectId: string;
  createdById: string;
  html: string;
}

export interface CreateProjectWireframeInput {
  title: string;
  html?: string;
}

export interface UpdateProjectWireframeInput {
  title?: string;
  html?: string;
}
