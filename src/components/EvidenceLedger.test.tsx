import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EvidenceLedger } from './EvidenceLedger';

afterEach(cleanup);

describe('EvidenceLedger', () => {
  it('renders claim, source, and confidence, with Unknown as a first-class state', () => {
    render(
      <EvidenceLedger
        rows={[
          {
            claim: 'Rift · Domain',
            source: 'DNS/RDAP',
            confidence: 'Unknown',
            unknown: true,
          },
          {
            claim: 'Wave · Domain',
            source: 'DNS/RDAP',
            confidence: '10',
          },
        ]}
      />,
    );
    expect(screen.getByText('Rift · Domain')).toBeInTheDocument();
    expect(screen.getAllByText('DNS/RDAP').length).toBe(2);
    const unknown = document.querySelector('[data-unknown="true"]');
    expect(unknown).toBeTruthy();
    expect(unknown?.textContent).toContain('Unknown');
    expect(unknown?.querySelector('.names-unknown-mark')).toBeTruthy();
    expect(window.getComputedStyle(unknown as Element).fontStyle).not.toBe('italic');
  });
});
