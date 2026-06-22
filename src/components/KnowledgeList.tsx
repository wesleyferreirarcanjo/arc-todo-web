import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { fetchKnowledgeEntryIndex } from '../lib/api/knowledge';
import type {
  KnowledgeEntry,
  KnowledgeEntryWithContext,
  KnowledgeIndexMetadata,
  UpdateKnowledgeInput,
} from '../types/knowledge';
import { entryToScopeContext } from '../lib/knowledge/scope';
import { isActiveIndexStatus } from '../lib/knowledge/indexStatus';
import { getKnowledgeAccentColor } from '../lib/color/entityColor';
import { KnowledgeCard } from './KnowledgeCard';
import { KnowledgeDetailModal } from './KnowledgeDetailModal';

const INDEX_POLL_MS = 4000;

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
  const [indexByEntryId, setIndexByEntryId] = useState<
    Record<string, KnowledgeIndexMetadata>
  >({});
  const [indexLoading, setIndexLoading] = useState(false);

  const entryIds = useMemo(
    () => entries.map((entry) => entry.id),
    [entries],
  );

  const loadIndexMetadata = useCallback(
    async (ids: string[], options: { silent?: boolean } = {}) => {
      if (ids.length === 0) return;

      if (!options.silent) {
        setIndexLoading(true);
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const meta = await fetchKnowledgeEntryIndex(id);
            return [id, meta] as const;
          } catch {
            return null;
          }
        }),
      );

      setIndexByEntryId((current) => {
        const next = { ...current };
        for (const result of results) {
          if (result) {
            next[result[0]] = result[1];
          }
        }
        return next;
      });

      if (!options.silent) {
        setIndexLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadIndexMetadata(entryIds);
  }, [entryIds, loadIndexMetadata]);

  const hasActiveIndexWork = useMemo(
    () =>
      entryIds.some((id) => {
        const meta = indexByEntryId[id];
        return meta ? isActiveIndexStatus(meta.indexStatus) : false;
      }),
    [entryIds, indexByEntryId],
  );

  useEffect(() => {
    if (!hasActiveIndexWork) return;

    const timer = window.setInterval(() => {
      const activeIds = entryIds.filter((id) => {
        const meta = indexByEntryId[id];
        return meta ? isActiveIndexStatus(meta.indexStatus) : true;
      });
      void loadIndexMetadata(activeIds, { silent: true });
    }, INDEX_POLL_MS);

    return () => window.clearInterval(timer);
  }, [entryIds, hasActiveIndexWork, indexByEntryId, loadIndexMetadata]);

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
                indexMeta={indexByEntryId[entry.id]}
                indexLoading={indexLoading && !indexByEntryId[entry.id]}
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
