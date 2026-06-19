import type { KnowledgeEntry, UpdateKnowledgeInput } from '../types/knowledge';
import { KnowledgeCard } from './KnowledgeCard';

interface KnowledgeListProps {
  entries: KnowledgeEntry[];
  getScopeLabel?: (entry: KnowledgeEntry) => string | undefined;
  onUpdate: (id: string, input: UpdateKnowledgeInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function KnowledgeList({
  entries,
  getScopeLabel,
  onUpdate,
  onDelete,
}: KnowledgeListProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="entity-list knowledge-list">
      {entries.map((entry) => (
        <KnowledgeCard
          key={entry.id}
          entry={entry}
          scopeLabel={getScopeLabel?.(entry)}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
