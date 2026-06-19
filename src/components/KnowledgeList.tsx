import type {
  KnowledgeEntry,
  KnowledgeScopeContext,
  UpdateKnowledgeInput,
} from '../types/knowledge';
import { KnowledgeCard } from './KnowledgeCard';

interface KnowledgeListProps {
  entries: KnowledgeEntry[];
  scope: KnowledgeScopeContext;
  getScopeLabel?: (entry: KnowledgeEntry) => string | undefined;
  onUpdate: (id: string, input: UpdateKnowledgeInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function KnowledgeList({
  entries,
  scope,
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
          scope={scope}
          scopeLabel={getScopeLabel?.(entry)}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
