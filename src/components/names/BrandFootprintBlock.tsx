import { useState } from 'react';
import { visibleBrandSources } from '../../lib/names/brandSources';
import { checksLeftCount } from '../../lib/names/funnel';
import type { BrandResult, NameCandidate } from '../../types/name-session';
import { NamesSignalHeading } from './NamesSignalHeading';

export function BrandFootprintBlock(props: {
  candidate: NameCandidate;
  namingGoal: string | null;
  onUpdate: (candidate: NameCandidate) => void;
}) {
  const { candidate, namingGoal } = props;
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [brandNote, setBrandNote] = useState('');
  const sources = visibleBrandSources(namingGoal);
  const left = checksLeftCount(candidate, namingGoal);
  const unresolved = sources.filter((source) => {
    const recorded = (candidate.brandChecks ?? []).find(
      (item) => item.source === source.id,
    );
    return !recorded || recorded.result === 'unknown';
  });
  const resolved = sources.filter((source) => {
    const recorded = (candidate.brandChecks ?? []).find(
      (item) => item.source === source.id,
    );
    return recorded && recorded.result !== 'unknown';
  });

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
    <div className="names-card-block names-checks">
      <NamesSignalHeading id="brand" />
      <p className="names-checks-left">
        {left === 0
          ? 'No brand checks still Unknown'
          : `${left} brand checks still Unknown`}
      </p>
      {unresolved.length > 0 ? (
        <>
          <h5 className="names-brief-label">Unknown</h5>
          <ul className="names-checks-list">
          {unresolved.map((source) => {
            const href = source.url(candidate.name);
            const showChoice = opened[source.id] === true;
            return (
              <li key={source.id} className="names-check-line">
                <a
                  className="names-text-link"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    setOpened((prev) => ({ ...prev, [source.id]: true }))
                  }
                >
                  {source.label}
                </a>
                {showChoice ? (
                  <span className="names-check-choice">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setResult(source.id, 'clear', href)}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setResult(source.id, 'collision', href)}
                    >
                      Collision
                    </button>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        </>
      ) : (
        <p className="names-meta">Every listed brand source has a recorded result.</p>
      )}
      {resolved.length > 0 ? (
        <>
          <h5 className="names-brief-label">Passed</h5>
          <p className="names-checks-resolved">
            {resolved
              .map((source) => {
                const recorded = (candidate.brandChecks ?? []).find(
                  (item) => item.source === source.id,
                );
                const label =
                  recorded?.result === 'collision' ? 'Collision' : 'Clear';
                return `${source.label} ${label}`;
              })
              .join(' · ')}
          </p>
        </>
      ) : null}
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
