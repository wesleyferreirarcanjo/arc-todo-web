import { pillarDisplay, type CandidatePillarScore } from '../../lib/names/score';

const CELLS: Array<{
  key: 'domain' | 'organic' | 'spoken' | 'taste';
  label: string;
}> = [
  { key: 'domain', label: 'Domain' },
  { key: 'organic', label: 'Organic' },
  { key: 'spoken', label: 'Spoken' },
  { key: 'taste', label: 'Taste' },
];

export function NamesScoreStrip({ pillars }: { pillars: CandidatePillarScore }) {
  return (
    <ul className="names-score-strip" aria-label="Score">
      {CELLS.map((cell) => {
        const pillar = pillars[cell.key];
        return (
          <li key={cell.key} className={pillar.unresolved ? 'is-unknown' : undefined}>
            <span>{cell.label}</span>
            <strong>{pillarDisplay(pillar)}</strong>
          </li>
        );
      })}
      <li className="names-score-total">
        <span>Total</span>
        <strong>{pillars.total}</strong>
      </li>
    </ul>
  );
}
