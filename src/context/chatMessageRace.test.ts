import { describe, expect, it } from 'vitest';
import {
  mergeConversationLists,
  shouldApplyLoadedMessages,
} from './ChatContext';
import type { ConversationSummary } from '../lib/api/conversations';

function summary(
  id: string,
  updatedAt: string,
): ConversationSummary {
  return {
    id,
    title: id,
    organizationId: null,
    projectId: null,
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('chat message race helpers', () => {
  it('keeps a locally created conversation missing from a stale server list', () => {
    const server = [summary('a', '2026-08-06T10:00:00.000Z')];
    const local = [
      summary('a', '2026-08-06T10:00:00.000Z'),
      summary('b-new', '2026-08-06T10:00:01.000Z'),
    ];

    const merged = mergeConversationLists(server, local);
    expect(merged.map((item) => item.id)).toEqual(['b-new', 'a']);
  });

  it('drops stale conversation detail loads after local message mutation', () => {
    expect(
      shouldApplyLoadedMessages({
        loadGeneration: 1,
        currentGeneration: 2,
        loadedConversationId: 'c1',
        activeConversationId: 'c1',
      }),
    ).toBe(false);

    expect(
      shouldApplyLoadedMessages({
        loadGeneration: 2,
        currentGeneration: 2,
        loadedConversationId: 'c1',
        activeConversationId: 'c1',
      }),
    ).toBe(true);

    expect(
      shouldApplyLoadedMessages({
        loadGeneration: 2,
        currentGeneration: 2,
        loadedConversationId: 'c1',
        activeConversationId: 'c2',
      }),
    ).toBe(false);
  });
});
