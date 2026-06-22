import { useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import type {
  KnowledgeEntry,
  KnowledgeEntryWithContext,
  UpdateKnowledgeInput,
} from '../types/knowledge';
import { entryToScopeContext } from '../lib/knowledge/scope';
import { getKnowledgeAccentColor } from '../lib/color/entityColor';
import { KnowledgeCard } from './KnowledgeCard';
import { KnowledgeDetailModal } from './KnowledgeDetailModal';

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
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);

  if (entries.length === 0) {
    return null;
  }

  const openEntry = entries.find((entry) => entry.id === openEntryId);
  const resolveAccentColor =
    getAccentColor ??
    ((entry: KnowledgeEntryWithContext) => getKnowledgeAccentColor(entry));

  return (
    <>
      <LayoutGroup id="knowledge-list">
        <div className="entity-list knowledge-list">
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => (
              <KnowledgeCard
                key={entry.id}
                entry={entry}
                scopeLabel={getScopeLabel?.(entry)}
                accentColor={resolveAccentColor(entry as KnowledgeEntryWithContext)}
                onOpen={() => setOpenEntryId(entry.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </LayoutGroup>

      {openEntry && (
        <KnowledgeDetailModal
          key={openEntry.id}
          open
          entry={openEntry}
          scope={scope ?? entryToScopeContext(openEntry)}
          scopeLabel={getScopeLabel?.(openEntry)}
          accentColor={resolveAccentColor(openEntry as KnowledgeEntryWithContext)}
          onClose={() => setOpenEntryId(null)}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
