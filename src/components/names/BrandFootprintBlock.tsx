import { useState } from 'react';
import { ChoiceGroup } from '../ChoiceGroup';
import { BRAND_SOURCES } from '../../lib/names/brandSources';
import type { BrandResult, NameCandidate } from '../../types/name-session';
import { NamesSignalHeading } from './NamesSignalHeading';

const BRAND_OPTIONS = [
  { value: 'unknown', label: 'Unknown', unknown: true },
  { value: 'clear', label: 'Clear' },
  { value: 'collision', label: 'Collision' },
];

const KIND_ORDER = ['search', 'store', 'package', 'trademark'] as const;

const KIND_LABEL: Record<(typeof KIND_ORDER)[number], string> = {
  search: 'Search',
  store: 'Stores',
  package: 'Packages',
  trademark: 'Trademarks',
};

export function BrandFootprintBlock(props: {
  candidate: NameCandidate;
  onUpdate: (candidate: NameCandidate) => void;
}) {
  const { candidate } = props;
  const [brandNote, setBrandNote] = useState('');
  const sources = BRAND_SOURCES.filter((source) => source.kind !== 'social');

  function setResult(sourceId: string, result: BrandResult, queryUrl: string) {
    const recorded = (candidate.brandChecks ?? []).find(
      (item) => item.source === sourceId,
    );
    const checks = [
      ...(candidate.brandChecks ?? []).filter((item) => item.source !== sourceId),
      {
        source: sourceId,
        result,
        note: brandNote || recorded?.note || '',
        queryUrl,
        checkedAt: new Date().toISOString(),
      },
    ];
    props.onUpdate({ ...candidate, brandChecks: checks });
  }

  return (
    <div className="names-card-block">
      <NamesSignalHeading id="brand" />
      <p className="names-meta">
        Social handles stay under What we found. Record a brand collision here.
      </p>
      {KIND_ORDER.map((kind) => {
        const kindSources = sources.filter((source) => source.kind === kind);
        const unknown = kindSources.filter((source) => {
          const recorded = (candidate.brandChecks ?? []).find(
            (item) => item.source === source.id,
          );
          return !recorded || recorded.result === 'unknown';
        });
        const resolved = kindSources.filter((source) => {
          const recorded = (candidate.brandChecks ?? []).find(
            (item) => item.source === source.id,
          );
          return recorded && recorded.result !== 'unknown';
        });
        return (
          <div key={kind} className="names-brand-kind">
            <h6>{KIND_LABEL[kind]}</h6>
            <div className="names-brand-grid">
              {unknown.map((source) => (
                <BrandRow
                  key={source.id}
                  candidateId={candidate.id}
                  name={candidate.name}
                  source={source}
                  result="unknown"
                  onChange={(result) =>
                    setResult(source.id, result, source.url(candidate.name))
                  }
                />
              ))}
            </div>
            {resolved.length > 0 ? (
              <details>
                <summary>{resolved.length} recorded</summary>
                <div className="names-brand-grid">
                  {resolved.map((source) => {
                    const recorded = (candidate.brandChecks ?? []).find(
                      (item) => item.source === source.id,
                    );
                    return (
                      <BrandRow
                        key={source.id}
                        candidateId={candidate.id}
                        name={candidate.name}
                        source={source}
                        result={recorded?.result ?? 'unknown'}
                        onChange={(result) =>
                          setResult(source.id, result, source.url(candidate.name))
                        }
                      />
                    );
                  })}
                </div>
              </details>
            ) : null}
          </div>
        );
      })}
      <label className="form-field">
        <span>Note</span>
        <input
          value={brandNote}
          onChange={(event) => setBrandNote(event.target.value)}
        />
      </label>
      {(candidate.brandChecks ?? []).some((item) => item.result === 'collision') && (
        <div className="alert">Exact collision recorded. This is not legal clearance.</div>
      )}
    </div>
  );
}

function BrandRow(props: {
  candidateId: string;
  name: string;
  source: (typeof BRAND_SOURCES)[number];
  result: string;
  onChange: (result: BrandResult) => void;
}) {
  return (
    <div className="names-brand-row">
      <a
        className="names-text-link"
        href={props.source.url(props.name)}
        target="_blank"
        rel="noreferrer"
      >
        {props.source.label}
      </a>
      <ChoiceGroup
        name={`brand-${props.candidateId}-${props.source.id}`}
        label={`${props.source.label} result`}
        value={props.result}
        options={BRAND_OPTIONS}
        onChange={(next) => props.onChange(next as BrandResult)}
      />
    </div>
  );
}
