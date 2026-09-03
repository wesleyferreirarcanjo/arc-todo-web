import { SIGNAL_COPY } from '../../lib/names/signalCopy';
import { pillarDisplay, type CandidatePillarScore } from '../../lib/names/score';

const CELLS: Array<{
  key: 'domain' | 'organic' | 'spoken' | 'taste';
  id: 'domain' | 'organic' | 'spoken' | 'taste';
}> = [
  { key: 'domain', id: 'domain' },
  { key: 'organic', id: 'organic' },
  { key: 'spoken', id: 'spoken' },
  { key: 'taste', id: 'taste' },
];

export function NamesScoreStrip({ pillars }: { pillars: CandidatePillarScore }) {
  return (
    <ul className="names-score-strip" aria-label="Score">
      {CELLS.map((cell) => {
        const pillar = pillars[cell.key];
        return (
          <li key={cell.key} className={pillar.unresolved ? 'is-unknown' : undefined}>
            <span>{SIGNAL_COPY[cell.id].name}</span>
            <strong>{pillarDisplay(pillar)}</strong>
          </li>
        );
      })}
      <li className="names-score-total">
        <span>{SIGNAL_COPY.total.name}</span>
        <strong>{pillars.total}</strong>
      </li>
    </ul>
  );
}
