import { AnimatePresence, LayoutGroup } from 'framer-motion';
import type {
  KnowledgeEntry,
  KnowledgeEntryWithContext,
  UpdateKnowledgeInput,
} from '../types/knowledge';
import { entryToScopeContext } from '../lib/knowledge/scope';
import { KnowledgeCard } from './KnowledgeCard';

interface KnowledgeListProps {
  entries: KnowledgeEntry[];
  scope?: import('../types/knowledge').KnowledgeScopeContext;
  getScopeLabel?: (entry: KnowledgeEntry) => string | undefined;
  getAccentColor?: (entry: KnowledgeEntryWithContext) => string | undefined;
  onUpdate: (id: string, input: UpdateKnowledgeInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function KnowledgeList({
  entries,
  scope,
  getScopeLabel,
  getAccentColor,
  onUpdate,
  onDelete,
}: KnowledgeListProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <LayoutGroup id="knowledge-list">
      <div className="entity-list knowledge-list">
        <AnimatePresence mode="popLayout">
          {entries.map((entry) => (
            <KnowledgeCard
              key={entry.id}
              entry={entry}
              scope={scope ?? entryToScopeContext(entry)}
              scopeLabel={getScopeLabel?.(entry)}
              accentColor={getAccentColor?.(entry as KnowledgeEntryWithContext)}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
