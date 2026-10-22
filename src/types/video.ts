export type VideoFileKind = 'recording' | 'cursor' | 'export' | 'background';

export interface VideoClip {
  id: string;
  sourceStartMs: number;
  sourceEndMs: number;
  speed: number;
  timelineStartMs: number;
  timelineEndMs: number;
}

export interface ZoomRegion {
  id: string;
  clipId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  scale: number;
  focus: { x: number; y: number };
  followCursor: boolean;
  origin: 'manual' | 'suggested';
}

export type FrameBackground =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string; angleDeg: number }
  | { kind: 'image' };

export type FrameAspect = 'source' | '16:9' | '9:16' | '1:1' | '4:3';

export interface FrameStyle {
  background: FrameBackground;
  paddingPct: number;
  cornerRadiusPx: number;
  shadow: number;
  crop: { x: number; y: number; width: number; height: number };
  aspect: FrameAspect;
}

export interface VideoEditState {
  version: 1;
  sourceDurationMs: number;
  clips: VideoClip[];
  zooms: ZoomRegion[];
  frame: FrameStyle;
  cursor: { visible: boolean; scale: number };
}

export interface CursorTrack {
  version: 1;
  viewport: { width: number; height: number };
  samples: Array<[tMs: number, x: number, y: number]>;
  clicks: Array<[tMs: number, x: number, y: number]>;
}

export interface VideoFileMeta {
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface ProjectVideoSummary {
  id: string;
  title: string;
  durationMs: number | null;
  hasRecording: boolean;
  hasExport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVideo extends ProjectVideoSummary {
  editState: VideoEditState | null;
  files: Partial<Record<VideoFileKind, VideoFileMeta>>;
}
