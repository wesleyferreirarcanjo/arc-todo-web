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

export function BrandFootprintBlock(props: {
  candidate: NameCandidate;
  onUpdate: (candidate: NameCandidate) => void;
}) {
  const { candidate } = props;
  const [brandNote, setBrandNote] = useState('');

  return (
    <div className="names-card-block">
      <NamesSignalHeading id="brand" />
      <div className="names-brand-grid">
        {BRAND_SOURCES.map((source) => {
          const recorded = (candidate.brandChecks ?? []).find(
            (item) => item.source === source.id,
          );
          return (
            <div key={source.id} className="names-brand-row">
              <a
                className="names-text-link"
                href={source.url(candidate.name)}
                target="_blank"
                rel="noreferrer"
              >
                {source.label}
              </a>
              <ChoiceGroup
                name={`brand-${candidate.id}-${source.id}`}
                label={`${source.label} result`}
                value={recorded?.result ?? 'unknown'}
                options={BRAND_OPTIONS}
                onChange={(next) => {
                  const result = next as BrandResult;
                  const checks = [
                    ...(candidate.brandChecks ?? []).filter(
                      (item) => item.source !== source.id,
                    ),
                    {
                      source: source.id,
                      result,
                      note: brandNote || recorded?.note || '',
                      queryUrl: source.url(candidate.name),
                      checkedAt: new Date().toISOString(),
                    },
                  ];
                  props.onUpdate({ ...candidate, brandChecks: checks });
                }}
              />
            </div>
          );
        })}
      </div>
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
