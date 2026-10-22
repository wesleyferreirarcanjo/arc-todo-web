import { apiDownload, apiRequest, apiUpload } from './client';
import type {
  ProjectVideo,
  ProjectVideoSummary,
  VideoEditState,
  VideoFileKind,
} from '../../types/video';

export interface CreateProjectVideoInput {
  title: string;
}

export interface UpdateProjectVideoInput {
  title?: string;
  editState?: VideoEditState;
}

export function videosBasePath(orgId: string, projectId: string): string {
  return `/organizations/${orgId}/projects/${projectId}/videos`;
}

export function fetchProjectVideos(
  orgId: string,
  projectId: string,
): Promise<ProjectVideoSummary[]> {
  return apiRequest<ProjectVideoSummary[]>(videosBasePath(orgId, projectId));
}

export function fetchProjectVideo(
  orgId: string,
  projectId: string,
  videoId: string,
): Promise<ProjectVideo> {
  return apiRequest<ProjectVideo>(
    `${videosBasePath(orgId, projectId)}/${videoId}`,
  );
}

export function createProjectVideo(
  orgId: string,
  projectId: string,
  input: CreateProjectVideoInput,
): Promise<ProjectVideo> {
  return apiRequest<ProjectVideo>(videosBasePath(orgId, projectId), {
    method: 'POST',
    body: input,
  });
}

export function updateProjectVideo(
  orgId: string,
  projectId: string,
  videoId: string,
  input: UpdateProjectVideoInput,
): Promise<ProjectVideo> {
  return apiRequest<ProjectVideo>(
    `${videosBasePath(orgId, projectId)}/${videoId}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export function deleteProjectVideo(
  orgId: string,
  projectId: string,
  videoId: string,
): Promise<void> {
  return apiRequest<void>(`${videosBasePath(orgId, projectId)}/${videoId}`, {
    method: 'DELETE',
  });
}

export function uploadProjectVideoFile(
  orgId: string,
  projectId: string,
  videoId: string,
  kind: VideoFileKind,
  blob: Blob,
  filename: string,
  extra?: { durationMs?: number },
): Promise<ProjectVideo> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  if (extra?.durationMs != null) {
    formData.append('durationMs', String(extra.durationMs));
  }
  return apiUpload<ProjectVideo>(
    `${videosBasePath(orgId, projectId)}/${videoId}/files/${kind}`,
    formData,
  );
}

export function downloadProjectVideoFile(
  orgId: string,
  projectId: string,
  videoId: string,
  kind: VideoFileKind,
): Promise<{ blob: Blob; filename: string }> {
  return apiDownload(
    `${videosBasePath(orgId, projectId)}/${videoId}/files/${kind}`,
  );
}
