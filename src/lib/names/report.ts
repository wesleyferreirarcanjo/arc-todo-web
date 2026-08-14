import type { NameCandidate, ProjectNameSession } from '../../types/name-session';
import { NAMING_GOAL_OPTIONS } from './catalog';
import { candidateScore } from './score';

function goalLabel(id: string | null | undefined): string {
  return NAMING_GOAL_OPTIONS.find((item) => item.id === id)?.label ?? id ?? 'unset';
}

export function buildDecisionReport(session: ProjectNameSession): string {
  const desc = session.productDescription ?? {};
  const shortlist = session.shortlistIds
    .map((id) => session.candidates.find((item) => item.id === id))
    .filter((item): item is NameCandidate => Boolean(item));
  const winner = session.candidates.find(
    (item) => item.id === session.recommendedCandidateId,
  );
  const runner = session.candidates.find(
    (item) => item.id === session.runnerUpCandidateId,
  );
  const lines: string[] = [
    `# Naming decision: ${session.title}`,
    '',
    `Goal: ${goalLabel(session.namingGoal)}`,
    session.brief ? `Product to name: ${session.brief}` : '',
    desc.whatItIs ? `What it is: ${desc.whatItIs}` : '',
    desc.oneLine ? `One-line: ${desc.oneLine}` : '',
    '',
    '## Families and lanes',
    ...(session.lanes ?? []).map(
      (lane) => `- ${lane.title} (${goalLabel(lane.namingGoal)})`,
    ),
    '',
    '## Finalists',
  ];
  for (const candidate of shortlist.length ? shortlist : session.candidates) {
    const score = candidateScore(candidate, session.namingGoal);
    const unknown = [
      ...(candidate.domainChecks ?? [])
        .filter((item) => item.availability === 'unknown')
        .map((item) => `domain ${item.host}`),
      ...(candidate.brandChecks ?? [])
        .filter((item) => item.result === 'unknown')
        .map((item) => `brand ${item.source}`),
    ];
    const visual = candidate.visualConcerns?.flags?.length
      ? `visual: ${candidate.visualConcerns.flags.join(', ')}${candidate.visualConcerns.note ? ` (${candidate.visualConcerns.note})` : ''}`
      : '';
    const human = session.feedback
      .filter((round) => round.aggregate)
      .map((round) => {
        const agg = round.aggregate?.byCandidate[candidate.id];
        if (!agg) return '';
        return `human feedback n=${agg.responses}; easy ${agg.easyToSay ?? '—'}; memorable ${agg.memorable ?? '—'}; fit ${agg.fitsProduct ?? '—'}`;
      })
      .filter(Boolean);
    lines.push(
      `### ${candidate.name}`,
      `- sources: ${(candidate.sources ?? []).join(', ') || 'human'}`,
      `- family: ${candidate.family ?? '—'}`,
      `- score: ${score.total} (${score.formula})`,
      `- domains: ${(candidate.domainChecks ?? []).map((item) => `${item.tld}=${item.availability}`).join(', ') || 'unchecked'}`,
      unknown.length ? `- Unknown: ${unknown.join('; ')}` : '- Unknown: none',
      visual ? `- ${visual}` : '- visual concerns: none',
      human.length ? `- ${human.join('; ')}` : '- human feedback: none',
      candidate.messaging?.categoryDescriptor
        ? `- descriptor: ${candidate.messaging.categoryDescriptor}`
        : '',
      candidate.messaging?.selectedTagline
        ? `- tagline: ${candidate.messaging.selectedTagline}`
        : '',
      '',
    );
  }
  lines.push(
    '## Decision',
    `Winner: ${winner?.name ?? 'unset'}`,
    `Runner-up: ${runner?.name ?? 'unset'}`,
    `Reason: ${session.decisionNote ?? ''}`,
    '',
    'Messaging and the name help people understand the product. They do not guarantee a Google ranking.',
    'Brand checks are preliminary only — legal review may still be needed.',
    `Copied ${new Date().toISOString()}.`,
  );
  return lines.filter((line) => line !== '').join('\n');
}
