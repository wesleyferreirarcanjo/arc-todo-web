import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fireAllLabFailures,
  fireLabProbe,
  LAB_PROBES,
  type LabProbe,
  type LabProbeGroup,
  type LabProbeId,
} from '../lib/extensionLab';

type LabLogEntry = {
  id: string;
  at: string;
  probe: LabProbe;
};

const GROUPS: { id: LabProbeGroup; title: string; lede: string }[] = [
  {
    id: 'console',
    title: 'Console',
    lede: 'Hooks console.warn / console.error, window.onerror, and unhandledrejection.',
  },
  {
    id: 'network',
    title: 'Network',
    lede: 'Same-origin 4xx/5xx plus a DNS fail and an aborted fetch. The extension records failed webRequest only.',
  },
  {
    id: 'control',
    title: 'Control',
    lede: 'A 200 must stay out of the capture list so you can see the filter is working.',
  },
];

function formatClock(now = new Date()): string {
  return now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function ExtensionLabPage() {
  const [log, setLog] = useState<LabLogEntry[]>([]);
  const [busyId, setBusyId] = useState<LabProbeId | 'all' | null>(null);

  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        probes: LAB_PROBES.filter((probe) => probe.group === group.id),
      })),
    [],
  );

  const record = useCallback((probe: LabProbe) => {
    setLog((current) =>
      [
        {
          id: `${probe.id}-${Date.now()}`,
          at: formatClock(),
          probe,
        },
        ...current,
      ].slice(0, 20),
    );
  }, []);

  const run = useCallback(
    async (id: LabProbeId | 'all') => {
      if (busyId) return;
      setBusyId(id);
      try {
        if (id === 'all') {
          await fireAllLabFailures();
          for (const probe of LAB_PROBES.filter((item) => item.group !== 'control')) {
            record(probe);
          }
          return;
        }
        const probe = LAB_PROBES.find((item) => item.id === id);
        await fireLabProbe(id);
        if (probe) record(probe);
      } finally {
        setBusyId(null);
      }
    },
    [busyId, record],
  );

  return (
    <div className="page-shell download-page extension-lab-page">
      <header className="page-header">
        <p className="workspace-eyebrow">
          <Link className="text-link" to="/download">
            Download
          </Link>
        </p>
        <h2>Evidence lab</h2>
        <p className="page-subtitle">
          Stay on this tab. In the Arc Todo extension, pick a Fila de QA card,{' '}
          <strong>Focar neste passo</strong>, fire a probe, then{' '}
          <strong>Marcar como bug</strong>. Console and network rows from the last
          2 minutes should land on that step.
        </p>
      </header>

      <div className="extension-lab-toolbar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void run('all')}
          disabled={busyId !== null}
        >
          Fire all failures
        </button>
        <p className="extension-lab-toolbar-note">
          Does not fire the HTTP 200 control. Uses raw fetch, so a 401 here will
          not log you out.
        </p>
      </div>

      {grouped.map((group) => (
        <section
          key={group.id}
          className="extension-lab-group"
          aria-labelledby={`extension-lab-${group.id}`}
        >
          <h3 id={`extension-lab-${group.id}`}>{group.title}</h3>
          <p className="extension-lab-lede">{group.lede}</p>
          <ol className="extension-lab-probes">
            {group.probes.map((probe, index) => (
              <li key={probe.id} className="extension-lab-probe">
                <span className="extension-lab-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="extension-lab-probe-copy">
                  <p className="extension-lab-probe-label">{probe.label}</p>
                  <p className="extension-lab-probe-expected">{probe.expected}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void run(probe.id)}
                  disabled={busyId !== null}
                  aria-label={`Fire ${probe.label}`}
                >
                  Fire
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="extension-lab-log" aria-labelledby="extension-lab-log">
        <h3 id="extension-lab-log">Fired just now</h3>
        <ol className="extension-lab-tape" role="status">
          {log.length === 0 ? (
            <li className="extension-lab-tape-empty">No probes yet.</li>
          ) : (
            log.map((entry) => (
              <li key={entry.id}>
                <time dateTime={entry.at}>{entry.at}</time>
                <span className="extension-lab-tape-label">{entry.probe.label}</span>
                <span className="extension-lab-tape-expected">
                  {entry.probe.expected}
                </span>
              </li>
            ))
          )}
        </ol>
      </section>
    </div>
  );
}
