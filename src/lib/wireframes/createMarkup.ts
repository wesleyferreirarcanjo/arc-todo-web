import { createProjectDiagram } from '../api/diagrams';
import type { ProjectDiagram } from '../../types/diagram';
import { captureWireframePages } from './capturePreview';
import { buildMarkupScene, buildMarkupThumbnail } from './markupScene';

export async function createWireframeMarkupDiagram(
  orgId: string,
  projectId: string,
  wireframe: { id: string; title: string; html: string },
): Promise<ProjectDiagram> {
  const pages = await captureWireframePages(wireframe.html);
  const sceneJson = buildMarkupScene(pages);
  const thumbnail = pages[0]
    ? await buildMarkupThumbnail(pages[0].dataURL)
    : null;

  return createProjectDiagram(orgId, projectId, {
    title: `${wireframe.title} — markup`,
    sceneJson,
    ...(thumbnail ? { thumbnail } : {}),
    wireframeId: wireframe.id,
  });
}
