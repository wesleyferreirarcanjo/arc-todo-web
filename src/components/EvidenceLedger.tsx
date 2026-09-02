import type { ReactNode } from 'react';

export type EvidenceLedgerRow = {
  claim: string;
  source: string;
  confidence: string;
  unknown?: boolean;
};

export function EvidenceLedger({
  rows,
  caption,
}: {
  rows: EvidenceLedgerRow[];
  caption?: ReactNode;
}) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="evidence-ledger">
      {caption ? <p className="evidence-ledger-caption">{caption}</p> : null}
      <ul className="evidence-ledger-list">
        {rows.map((row) => (
          <li
            key={`${row.claim}-${row.source}-${row.confidence}`}
            className={`evidence-ledger-row${row.unknown ? ' is-unknown' : ''}`}
            data-unknown={row.unknown ? 'true' : 'false'}
          >
            <span className="evidence-ledger-claim">{row.claim}</span>
            <span className="evidence-ledger-source">{row.source}</span>
            <span className="evidence-ledger-confidence">
              {row.unknown ? (
                <span className="names-unknown-mark" aria-hidden="true" />
              ) : null}
              {row.confidence}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
