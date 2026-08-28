export type QaQueueListItem = {
  id: string;
  taskId: string;
  position: number;
  displayId: string;
  title: string;
  status: string;
};

export type QaQueueListResponse = {
  projectId: string | null;
  organizationId: string | null;
  items: QaQueueListItem[];
};

export type AddQaQueueItemsInput = {
  taskId?: string;
  taskIds?: string[];
  replaceProject?: boolean;
};
