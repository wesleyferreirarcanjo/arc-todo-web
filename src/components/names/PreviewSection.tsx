import { useEffect, useState } from 'react';
import { ChoiceGroup } from '../ChoiceGroup';
import { initialsFor, slugifyName, VISUAL_FLAGS } from '../../lib/names/catalog';
import { SIGNAL_COPY } from '../../lib/names/signalCopy';
import type { NameCandidate, ProductDescription } from '../../types/name-session';

const VISUAL_FLAG_OPTIONS = [
  { value: 'off', label: 'Not noted' },
  { value: 'on', label: 'Noted' },
];

const PLACEHOLDER_LINE = 'No product description yet';

function supportingLine(productDescription?: ProductDescription): string {
  const oneLine = productDescription?.oneLine?.trim();
  if (oneLine) return oneLine;
  const short = productDescription?.short?.trim();
  if (short) return short;
  return PLACEHOLDER_LINE;
}

export function PreviewSection(props: {
  candidate: NameCandidate;
  productDescription?: ProductDescription;
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
  const mockLine = supportingLine(props.productDescription);

  useEffect(() => {
    setNote(candidate.visualConcerns?.note ?? '');
  }, [candidate.id, candidate.visualConcerns?.note]);

  function writeFlags(nextFlags: string[]) {
    props.onSave({
      ...candidate,
      visualConcerns: { flags: nextFlags, note },
    });
  }

  return (
    <section className="names-panel">
      <h3>Preview in context</h3>
      <div className="names-preview-modes">
        <div className="names-desk-tabs" role="group" aria-label="Preview width">
          <button
            type="button"
            className={!props.wide ? 'is-current' : undefined}
            aria-pressed={!props.wide}
            onClick={() => props.onWide(false)}
          >
            Compact
          </button>
          <button
            type="button"
            className={props.wide ? 'is-current' : undefined}
            aria-pressed={props.wide}
            onClick={() => props.onWide(true)}
          >
            Wide
          </button>
        </div>
        <div className="names-desk-tabs" role="group" aria-label="Preview theme">
          <button
            type="button"
            className={!props.dark ? 'is-current' : undefined}
            aria-pressed={!props.dark}
            onClick={() => props.onDark(false)}
          >
            Light
          </button>
          <button
            type="button"
            className={props.dark ? 'is-current' : undefined}
            aria-pressed={props.dark}
            onClick={() => props.onDark(true)}
          >
            Dark
          </button>
        </div>
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
          <p className="names-truncate">{mockLine}</p>
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
      <p className="names-disclaimer">{SIGNAL_COPY.visual.honestLimit}</p>
      <div className="names-preview-flags">
        {VISUAL_FLAGS.map((flag) => (
          <div key={flag.id} className="names-preview-flag">
            <span>{flag.label}</span>
            <ChoiceGroup
              name={`visual-${candidate.id}-${flag.id}`}
              label={flag.label}
              value={flags.includes(flag.id) ? 'on' : 'off'}
              options={VISUAL_FLAG_OPTIONS}
              onChange={(next) => {
                const nextFlags = next === 'on'
                  ? [...flags.filter((id) => id !== flag.id), flag.id]
                  : flags.filter((id) => id !== flag.id);
                writeFlags(nextFlags);
              }}
            />
          </div>
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
