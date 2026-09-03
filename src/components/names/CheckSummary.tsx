import { EvidenceLedger } from '../EvidenceLedger';
import type { EvidenceLedgerRow } from '../EvidenceLedger';
import { SIGNAL_COPY } from '../../lib/names/signalCopy';
import type { Availability, NameCandidate } from '../../types/name-session';
import {
  availabilityLabel,
  historyLabel,
  organicLabel,
} from './labels';

export function shortlistWebFit(candidate: NameCandidate): {
  text: string;
  availability: Availability | 'unchecked';
} {
  const checks = candidate.domainChecks ?? [];
  if (checks.length === 0) {
    return { text: 'Not yet checked', availability: 'unchecked' };
  }
  const stored = checks.find((item) => item.tld === 'com') ?? checks[0];
  if (stored.availability === 'available') {
    return { text: 'Web fit: Available', availability: 'available' };
  }
  if (stored.availability === 'taken') {
    return { text: 'Web fit: Taken', availability: 'taken' };
  }
  return { text: 'Web fit: Unknown', availability: 'unknown' };
}

function domainRows(candidate: NameCandidate): EvidenceLedgerRow[] {
  return (candidate.domainChecks ?? []).map((check) => {
    const unknown = check.availability === 'unknown';
    return {
      claim: `.${check.tld} is ${availabilityLabel(check.availability)}`,
      source: SIGNAL_COPY.domain.source,
      confidence: unknown ? 'Unknown' : availabilityLabel(check.availability),
      unknown,
    };
  });
}

function brandRows(candidate: NameCandidate): EvidenceLedgerRow[] {
  return (candidate.brandChecks ?? []).map((check) => {
    const unknown = check.result === 'unknown';
    return {
      claim: unknown
        ? `${check.source} is unresolved`
        : `${check.source} is ${check.result}`,
      source: SIGNAL_COPY.brand.source,
      confidence: unknown ? 'Unknown' : check.result,
      unknown,
    };
  });
}

function searchRows(candidate: NameCandidate): EvidenceLedgerRow[] {
  const organicUnknown =
    !candidate.organicCompetition?.status ||
    candidate.organicCompetition.status === 'unknown';
  const rows: EvidenceLedgerRow[] = [
    {
      claim: `Organic competition is ${organicLabel(candidate.organicCompetition?.status)} (not clearance)`,
      source: SIGNAL_COPY.organic.source,
      confidence: organicUnknown
        ? 'Unknown'
        : organicLabel(candidate.organicCompetition?.status),
      unknown: organicUnknown,
    },
  ];
  for (const item of candidate.domainHistory ?? []) {
    const unknown = item.status === 'unknown';
    rows.push({
      claim: `${item.host} ${historyLabel(item.status)}`,
      source: SIGNAL_COPY.organic.source,
      confidence: unknown ? 'Unknown' : historyLabel(item.status),
      unknown,
    });
  }
  return rows;
}

function languageRows(candidate: NameCandidate): EvidenceLedgerRow[] {
  return (candidate.languageChecks?.manual ?? []).map((check) => {
    const unknown = check.result === 'unknown';
    return {
      claim: unknown
        ? `${check.language} is unresolved`
        : `${check.language} is ${check.result}`,
      source: SIGNAL_COPY.language.source,
      confidence: unknown ? 'Unknown' : check.result,
      unknown,
    };
  });
}

function EvidenceBlock(props: {
  summary: string;
  rows: EvidenceLedgerRow[];
  empty: string;
}) {
  return (
    <details className="names-card-more">
      <summary>{props.summary}</summary>
      {props.rows.length > 0 ? (
        <EvidenceLedger rows={props.rows} />
      ) : (
        <p className="names-meta">{props.empty}</p>
      )}
    </details>
  );
}

export function CheckSummary(props: { candidate: NameCandidate }) {
  const fit = shortlistWebFit(props.candidate);
  const unknown = fit.availability === 'unknown';
  const unchecked = fit.availability === 'unchecked';
  const empty = unchecked ? 'Not yet checked.' : 'No evidence recorded.';

  return (
    <div className="names-check-summary">
      <p className="names-card-verdict-line">
        {unknown ? (
          <span className="names-unknown-mark" aria-hidden="true" />
        ) : null}
        {unknown ? <span className="sr-only">Unknown. </span> : null}
        {fit.text}
      </p>
      <EvidenceBlock
        summary="Domain"
        rows={domainRows(props.candidate)}
        empty={empty}
      />
      <EvidenceBlock
        summary="Brand"
        rows={brandRows(props.candidate)}
        empty={empty}
      />
      <EvidenceBlock
        summary="Search"
        rows={unchecked ? [] : searchRows(props.candidate)}
        empty={empty}
      />
      <EvidenceBlock
        summary="Language"
        rows={languageRows(props.candidate)}
        empty={empty}
      />
    </div>
  );
}
