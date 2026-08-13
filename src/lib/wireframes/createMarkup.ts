import { createProjectDiagram } from '../api/diagrams';
import type { ProjectDiagram } from '../../types/diagram';
import { captureWireframePages } from './capturePreview';
import { buildMarkupScene, buildMarkupThumbnail } from './markupScene';

export async function createWireframeMarkupDiagram(
  orgId: string,
  projectId: string,
  wireframe: { id: string; title: string; html: string },
  options?: { title?: string },
): Promise<ProjectDiagram> {
  const pages = await captureWireframePages(wireframe.html);
  const sceneJson = buildMarkupScene(pages);
  const thumbnail = pages[0]
    ? await buildMarkupThumbnail(
        pages[0].dataURL,
        640,
        pages[0].backgroundColor,
      )
    : null;
  const title = options?.title?.trim() || `${wireframe.title} — markup`;

  return createProjectDiagram(orgId, projectId, {
    title,
    sceneJson,
    ...(thumbnail ? { thumbnail } : {}),
    wireframeId: wireframe.id,
  });
}
