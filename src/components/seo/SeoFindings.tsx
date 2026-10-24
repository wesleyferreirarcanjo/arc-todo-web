import { useState } from 'react';
import { SeoIcon } from '../icons';
import type { SeoAudit, SeoFinding, SeoFindingBucket } from '../../types/seo';

const BUCKETS: SeoFindingBucket[] = [
  'fix-now',
  'watch',
  'passed',
  'not-evaluated',
];

const LABELS: Record<SeoFindingBucket, string> = {
  'fix-now': 'Fix now',
  watch: 'Watch',
  passed: 'Passed',
  'not-evaluated': 'Not checked',
};

const SEVERITY: Record<SeoFinding['severity'], string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

function initialTab(findings: SeoFinding[]): SeoFindingBucket {
  for (const bucket of ['fix-now', 'watch', 'passed'] as const) {
    if (findings.some((item) => item.bucket === bucket)) return bucket;
  }
  return 'fix-now';
}

function subtitle(finding: SeoFinding): string {
  if (finding.bucket === 'passed') return 'Passed';
  const count = finding.affected.length;
  if (count === 0) return 'Site-wide';
  if (count === 1) return '1 page affected';
  return `${count} pages affected`;
}

export function SeoFindings({ audit }: { audit: SeoAudit }) {
  const findings = audit.findings ?? [];
  const [tab, setTab] = useState<SeoFindingBucket>(() => initialTab(findings));
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = findings.filter((item) => item.bucket === tab);

  return (
    <section className="seo-findings">
      <h3>Findings</h3>
      <nav className="names-stepper" aria-label="Findings">
        {BUCKETS.map((bucket) => {
          const count = findings.filter((item) => item.bucket === bucket).length;
          const selected = tab === bucket;
          return (
            <button
              key={bucket}
              type="button"
              className={selected ? 'is-current' : undefined}
              aria-current={selected ? 'true' : undefined}
              onClick={() => {
                setTab(bucket);
                setOpenId(null);
              }}
            >
              {LABELS[bucket]} {count}
            </button>
          );
        })}
      </nav>
      {visible.length === 0 ? (
        <div className="diagrams-empty">
          <span className="hub-empty-glyph" aria-hidden="true">
            <SeoIcon className="arc-icon-empty" />
          </span>
          <p className="status-message">Nothing here.</p>
        </div>
      ) : (
        <ul className="seo-finding-list">
          {visible.map((finding) => {
            const open = openId === finding.ruleId;
            const panelId = `seo-finding-${finding.ruleId}`;
            const shown = finding.affected.slice(0, 50);
            const extra = finding.affected.length - shown.length;
            return (
              <li key={finding.ruleId}>
                <button
                  type="button"
                  className="seo-finding-row"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId(open ? null : finding.ruleId)}
                >
                  <span className="seo-finding-title">{finding.title}</span>
                  <span className="seo-finding-subtitle">{subtitle(finding)}</span>
                  <span className={`seo-severity seo-severity-${finding.severity}`}>
                    {SEVERITY[finding.severity]}
                  </span>
                </button>
                {open && (
                  <div id={panelId} className="seo-finding-panel">
                    <h4>Why it matters</h4>
                    <p>{finding.why}</p>
                    <h4>How to fix</h4>
                    <p>{finding.fix}</p>
                    {finding.note ? <p>{finding.note}</p> : null}
                    {shown.length > 0 && (
                      <>
                        <h4>Affected pages</h4>
                        <ul>
                          {shown.map((item) => (
                            <li key={`${item.url}-${item.detail}`}>
                              {item.url} — {item.detail}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {extra > 0 ? <p>and {extra} more</p> : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {audit.siteProbe?.addressVariants && (
        <>
          <h4>Address redirects</h4>
          <div className="seo-table-wrap">
            <table className="seo-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Ends on</th>
                  <th>Status</th>
                  <th>OK</th>
                </tr>
              </thead>
              <tbody>
                {audit.siteProbe.addressVariants.map((variant) => (
                  <tr key={variant.url}>
                    <td>{variant.url}</td>
                    <td>{variant.finalUrl ?? '—'}</td>
                    <td>{variant.status ?? '—'}</td>
                    <td>
                      {variant.ok === null ? 'Unknown' : variant.ok ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
