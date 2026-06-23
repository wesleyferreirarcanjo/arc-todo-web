export function knowledgeDeleteCopy(title: string): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  return {
    title: `Delete "${title}"?`,
    description:
      'This permanently removes this knowledge entry, all attached files, and their search index chunks. This cannot be undone.',
    confirmLabel: 'Delete knowledge',
  };
}

export function attachmentDeleteCopy(
  filename: string,
  chunkCount: number,
): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  const chunkLabel = chunkCount === 1 ? '1 indexed chunk' : `${chunkCount} indexed chunks`;
  return {
    title: `Delete "${filename}"?`,
    description: `Removes this file and ${chunkLabel} from search. The knowledge entry text is not affected.`,
    confirmLabel: 'Delete file',
  };
}

export function attachmentResyncCopy(filename: string): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  return {
    title: `Resync "${filename}"?`,
    description:
      'Old chunks for this file will be replaced with fresh chunks from the current file content.',
    confirmLabel: 'Resync file',
  };
}

export function chunkDeleteCopy(sourceLabel: string): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  return {
    title: 'Delete this chunk?',
    description: `Removes one searchable chunk from ${sourceLabel}. The source file remains and other chunks are not affected.`,
    confirmLabel: 'Delete chunk',
  };
}

export function ragSyncCopy(): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  return {
    title: 'Reconcile search index?',
    description:
      'Queues a full index sync for all knowledge entries and attachments. Existing indexed content may be re-processed in the background.',
    confirmLabel: 'Queue sync',
  };
}
