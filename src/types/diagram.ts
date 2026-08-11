export interface ProjectDiagramSummary {
  id: string;
  title: string;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExcalidrawSceneJson {
  elements?: readonly unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProjectDiagram extends ProjectDiagramSummary {
  projectId: string;
  createdById: string;
  sceneJson: ExcalidrawSceneJson;
}

export interface CreateProjectDiagramInput {
  title: string;
  sceneJson?: ExcalidrawSceneJson;
  thumbnail?: string | null;
}

export interface UpdateProjectDiagramInput {
  title?: string;
  sceneJson?: ExcalidrawSceneJson;
  thumbnail?: string | null;
}
