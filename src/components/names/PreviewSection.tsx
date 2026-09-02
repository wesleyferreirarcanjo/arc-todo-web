import { useEffect, useState } from 'react';
import { initialsFor, slugifyName, VISUAL_FLAGS } from '../../lib/names/catalog';
import type { NameCandidate } from '../../types/name-session';

export function PreviewSection(props: {
  candidate: NameCandidate;
  wide: boolean;
  dark: boolean;
  customExtension: string;
  onWide: (value: boolean) => void;
  onDark: (value: boolean) => void;
  onCustom: (value: string) => void;
  onSave: (candidate: NameCandidate) => void;
}) {
  const { candidate } = props;
  const slug = slugifyName(candidate.name) || 'name';
  const flags = candidate.visualConcerns?.flags ?? [];
  const [note, setNote] = useState(candidate.visualConcerns?.note ?? '');
  const themeClass = `names-preview ${props.dark ? 'is-dark' : 'is-light'} ${props.wide ? 'is-wide' : 'is-compact'}`;

  useEffect(() => {
    setNote(candidate.visualConcerns?.note ?? '');
  }, [candidate.id, candidate.visualConcerns?.note]);
  return (
    <section className="names-panel">
      <h3>Preview in context</h3>
      <div className="names-inline">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => props.onWide(false)}>
          compact
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => props.onWide(true)}>
          wide
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => props.onDark(false)}>
          light
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => props.onDark(true)}>
          dark
        </button>
      </div>
      <div className={themeClass}>
        <div className="names-preview-tab">
          <span className="names-favicon">{initialsFor(candidate.name)}</span>
          <span className="names-truncate">{candidate.name}</span>
        </div>
        <div className="names-preview-icon">
          <span className="names-monogram">{initialsFor(candidate.name)}</span>
          <span className="names-icon-label">{candidate.name}</span>
        </div>
        <div className="names-preview-card">
          <strong className="names-truncate">{candidate.name}</strong>
          <p className="names-truncate">Project planning for small teams</p>
        </div>
        <div className="names-preview-header names-truncate">{candidate.name}</div>
        <div className="names-preview-social">
          <span className="names-monogram">{initialsFor(candidate.name)}</span>
          <span>@{slug} · {candidate.name}</span>
        </div>
        <p>
          {candidate.name} &lt;hello@{slug}.com&gt;
        </p>
        <p>Open {candidate.name}. Made with {candidate.name}. {candidate.name} API. {candidate.name} for Teams.</p>
        <div className="names-extensions">
          <span>{candidate.name} Cloud</span>
          <span>{candidate.name} Mobile</span>
          <span>{candidate.name} API</span>
          <span>{candidate.name} Studio</span>
          <span>
            {candidate.name} {props.customExtension}
          </span>
        </div>
      </div>
      <label className="form-field">
        <span>Custom extension</span>
        <input
          value={props.customExtension}
          onChange={(event) => props.onCustom(event.target.value)}
        />
      </label>
      <div className="names-inline">
        {VISUAL_FLAGS.map((flag) => (
          <label key={flag.id}>
            <input
              type="checkbox"
              checked={flags.includes(flag.id)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...flags, flag.id]
                  : flags.filter((id) => id !== flag.id);
                props.onSave({
                  ...candidate,
                  visualConcerns: { flags: next, note },
                });
              }}
            />{' '}
            {flag.label}
          </label>
        ))}
      </div>
      <label className="form-field">
        <span>Visual note</span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() =>
            props.onSave({
              ...candidate,
              visualConcerns: { flags, note },
            })
          }
        />
      </label>
    </section>
  );
}
