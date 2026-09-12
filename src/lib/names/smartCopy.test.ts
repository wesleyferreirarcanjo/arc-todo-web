import { describe, expect, it } from 'vitest';
import {
  GENERATE_DEFAULT,
  GENERATE_MAX,
  SMART_COPY_MAX,
  buildNamesDecisionSummary,
  buildNamesSmartCopyPrompt,
  looksLikeAiNameResponse,
  looksLikeNamesPacket,
  parseNamesSmartCopy,
  previewNamingResponse,
  selectedReviewNames,
} from './smartCopy';

const bilingualBrief = {
  title: 'fieldlot',
  namingGoal: 'company' as const,
  productDescription: {
    whatItIs: 'A loteadora CRM for brokers in Brazil.',
    problem: 'Brokers lose lots across spreadsheets.',
    audience: 'Brokers and loteadora owners',
    platform: 'Web app',
    benefits: 'One place for lots, clients, and contracts',
    personality: 'Clear, serious, Portuguese-first',
    countries: 'Brazil',
    languages: 'Portuguese and English',
    competitors: 'Generic CRMs',
    includeWords: 'lote, campo',
    excludeWords: 'lot, plot',
    preferredLength: 'short',
  },
  candidates: [{ name: 'Nova' }, { name: 'Rift' }],
  count: GENERATE_DEFAULT,
  refinement: 'More like the short favorites',
};

describe('buildNamesSmartCopyPrompt', () => {
  it('exports the full latest brief, count, avoid-list, and output format', () => {
    const prompt = buildNamesSmartCopyPrompt(bilingualBrief);
    expect(prompt).toContain('Working name: fieldlot');
    expect(prompt).toContain('Kind of name: Company/organization');
    expect(prompt).toContain('What the product is: A loteadora CRM for brokers in Brazil.');
    expect(prompt).toContain('Primary audience: Brokers and loteadora owners');
    expect(prompt).toContain('Languages: Portuguese and English');
    expect(prompt).toContain('Exclude: lot, plot');
    expect(prompt).toContain('Preferred length: short');
    expect(prompt).toContain(`Suggest exactly ${GENERATE_DEFAULT} fresh names`);
    expect(prompt).toContain('- Nova');
    expect(prompt).toContain('- Rift');
    expect(prompt).toContain('More like the short favorites');
    expect(prompt).toContain('You do not need Arc Todo, MCP, or an API token.');
    expect(prompt).toContain('"suggestions"');
    expect(prompt).toContain('Do not judge availability, scores, trademarks, or legal clearance.');
    expect(prompt).toContain('Do not force a god-name or invented-only style unless the brief asks for it.');
    expect(prompt).not.toContain('another project');
  });

  it('uses visible edits instead of a stale saved sentence', () => {
    const prompt = buildNamesSmartCopyPrompt({
      ...bilingualBrief,
      productDescription: {
        ...bilingualBrief.productDescription,
        whatItIs: 'Edited just now: a coffee club.',
      },
    });
    expect(prompt).toContain('Edited just now: a coffee club.');
    expect(prompt).not.toContain('A loteadora CRM for brokers in Brazil.');
  });
});

describe('parseNamesSmartCopy', () => {
  it('accepts a fenced NAMES list and strips optional rationales for the legacy helper', () => {
    const parsed = parseNamesSmartCopy(`\`\`\`
NAMES
- Lumina — bright
- Helio
- Orbit
\`\`\``);
    expect(parsed).toEqual({ ok: true, names: ['Lumina', 'Helio', 'Orbit'] });
  });

  it('rejects invalid paste without adding names', () => {
    expect(looksLikeNamesPacket('Arc Todo')).toBe(false);
    expect(parseNamesSmartCopy('not a packet')).toEqual({
      ok: false,
      error:
        'That text is not a name list. Paste JSON, a NAMES list, or a numbered list, then try again.',
    });
    expect(parseNamesSmartCopy('NAMES\n')).toEqual({
      ok: false,
      error: 'That paste has no names we can add.',
    });
  });
});

describe('previewNamingResponse', () => {
  it('keeps rationale on structured JSON and ignores evidence fields', () => {
    const review = previewNamingResponse(
      JSON.stringify({
        suggestions: [
          {
            name: 'Helio',
            rationale: 'sun for coffee',
            family: 'metaphor',
            domain: 'available',
            winner: true,
          },
        ],
      }),
      [],
    );
    expect(review.error).toBeUndefined();
    expect(review.rows[0]).toMatchObject({
      name: 'Helio',
      rationale: 'sun for coffee',
      family: 'metaphor',
      selected: true,
    });
    expect(review.rows[0]).not.toHaveProperty('domain');
  });

  it('marks case-insensitive duplicates and keeps existing evidence names', () => {
    const review = previewNamingResponse(
      'NAMES\n- nova\n- Helio',
      [{ name: 'Nova' }],
    );
    expect(review.rows[0]).toMatchObject({
      name: 'nova',
      selected: false,
      duplicateOf: 'Nova',
    });
    expect(review.rows[1]).toMatchObject({ name: 'Helio', selected: true });
  });

  it('shows overflow rows instead of silently truncating past 20', () => {
    const lines = Array.from({ length: 21 }, (_, index) => `- Name${index + 1}`);
    const review = previewNamingResponse(`NAMES\n${lines.join('\n')}`, []);
    expect(review.rows).toHaveLength(21);
    expect(review.rows.filter((row) => row.selected)).toHaveLength(SMART_COPY_MAX);
    expect(review.rows[20]).toMatchObject({ name: 'Name21', overflow: true, selected: false });
  });

  it('does not treat ambiguous prose as candidate names', () => {
    const review = previewNamingResponse(
      'I think a warm name would work because coffee should feel like home.',
      [],
    );
    expect(review.rows).toHaveLength(0);
    expect(review.error).toMatch(/not a name list/i);
  });

  it('accepts a numbered list and lets confirm take at most 20 selected new names', () => {
    const text = Array.from(
      { length: 3 },
      (_, index) => `${index + 1}. Name${index + 1} — short why`,
    ).join('\n');
    const review = previewNamingResponse(text, []);
    expect(review.rows).toHaveLength(3);
    expect(selectedReviewNames(review.rows).map((row) => row.name)).toEqual([
      'Name1',
      'Name2',
      'Name3',
    ]);
  });
});

describe('looksLikeAiNameResponse', () => {
  it('detects packets, lists, and JSON without treating a single typed name as a paste', () => {
    expect(looksLikeAiNameResponse('Nova')).toBe(false);
    expect(looksLikeAiNameResponse('NAMES\n- Helio')).toBe(true);
    expect(looksLikeAiNameResponse('{"suggestions":[{"name":"Helio"}]}')).toBe(true);
  });
});

describe('buildNamesDecisionSummary', () => {
  it('copies public shortlist context without private votes or notes', () => {
    const summary = buildNamesDecisionSummary({
      title: 'fieldlot',
      pick: 'Helio',
      favoriteNames: ['Helio', 'Luma'],
      finalistNames: ['Helio'],
    });
    expect(summary).toContain('Current pick: Helio');
    expect(summary).toContain('Personal favorites: Helio, Luma');
    expect(summary).toContain('Team finalists: Helio');
    expect(summary).not.toMatch(/loved this|first impression|score 8/i);
  });
});
