import { goalProfile } from '../../lib/names/catalog';
import { hasGeneratedCanvasCopy } from '../../lib/names/prompts';
import type { ProductDescription, ProjectNameSession } from '../../types/name-session';

const CONTEXT_LONG_FIELDS = new Set<keyof ProductDescription>([
  'problem',
  'benefits',
  'competitors',
]);

const DESCRIPTION_CONTEXT_GROUPS = [
  {
    title: 'Audience and value',
    fields: [
      ['problem', 'Problem it solves'],
      ['audience', 'Primary audience'],
      ['benefits', 'Core benefits'],
      ['personality', 'Brand personality'],
    ],
  },
  {
    title: 'Practical constraints',
    fields: [
      ['platform', 'Main platform or channel'],
      ['countries', 'Target countries'],
      ['languages', 'Languages'],
      ['competitors', 'Competitors or names to avoid'],
      ['includeWords', 'Words to include'],
      ['excludeWords', 'Words to exclude'],
      ['preferredLength', 'Preferred name length'],
    ],
  },
] as const satisfies readonly {
  title: string;
  fields: readonly (readonly [keyof ProductDescription, string])[];
}[];

export function DetailsSection(props: {
  session: ProjectNameSession;
  desc: ProductDescription;
  busy: string | null;
  moreContextOpen: boolean;
  generatedCopyOpen: boolean;
  onMoreContextOpen: (open: boolean) => void;
  onGeneratedCopyOpen: (open: boolean) => void;
  onBuildDescription: () => void;
  onBriefChange: (value: string) => void;
  onSaveBrief: () => void;
  onDesc: (field: keyof ProductDescription, value: string) => void;
  onStartLane: () => void;
}) {
  const { session, desc } = props;

  return (
    <section className="names-panel names-brief-panel">
      <header className="names-brief-intro">
        <h3>Details</h3>
        <p>Optional. Fill these when you want a richer brief or generated copy.</p>
      </header>
      <div className="names-brief-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={props.busy === 'build'}
          onClick={() => void props.onBuildDescription()}
        >
          Build description
        </button>
      </div>
      <details
        className="names-description-details"
        open={props.moreContextOpen}
        onToggle={(event) => props.onMoreContextOpen(event.currentTarget.open)}
      >
        <summary>
          <span>
            <strong>More context</strong>
            <small>Audience, constraints, and words to include or avoid</small>
          </span>
          <span className="names-description-summary-meta">Optional</span>
        </summary>
        <div className="names-description-details-body">
          <label className="form-field">
            <span>Working name</span>
            <input
              value={session.brief}
              placeholder={session.title || 'e.g. project-g'}
              onChange={(event) => props.onBriefChange(event.target.value)}
              onBlur={() => void props.onSaveBrief()}
            />
          </label>
          {DESCRIPTION_CONTEXT_GROUPS.map((group) => (
            <div key={group.title} className="names-description-context-group">
              <h4>{group.title}</h4>
              <div className="names-description-context-grid">
                {group.fields.map(([key, label]) => (
                  <label key={key} className="form-field">
                    <span>{label}</span>
                    {CONTEXT_LONG_FIELDS.has(key) ? (
                      <textarea
                        rows={3}
                        value={desc[key] ?? ''}
                        onChange={(event) => props.onDesc(key, event.target.value)}
                        onBlur={() => void props.onSaveBrief()}
                      />
                    ) : (
                      <input
                        value={desc[key] ?? ''}
                        onChange={(event) => props.onDesc(key, event.target.value)}
                        onBlur={() => void props.onSaveBrief()}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
      <details
        className="names-description-details"
        open={props.generatedCopyOpen}
        onToggle={(event) => props.onGeneratedCopyOpen(event.currentTarget.open)}
      >
        <summary>
          <span>
            <strong>Generated description</strong>
            <small>One-line, short, and full copy you can edit</small>
          </span>
          <span className="names-description-summary-meta">
            {hasGeneratedCanvasCopy(desc) ? 'Ready' : 'Optional'}
          </span>
        </summary>
        <div className="names-description-details-body">
          <label className="form-field">
            <span>One-line</span>
            <input
              value={desc.oneLine ?? ''}
              onChange={(event) => props.onDesc('oneLine', event.target.value)}
              onBlur={() => void props.onSaveBrief()}
            />
          </label>
          <label className="form-field">
            <span>Short</span>
            <textarea
              rows={2}
              value={desc.short ?? ''}
              onChange={(event) => props.onDesc('short', event.target.value)}
              onBlur={() => void props.onSaveBrief()}
            />
          </label>
          <label className="form-field">
            <span>Full</span>
            <textarea
              rows={4}
              value={desc.full ?? ''}
              onChange={(event) => props.onDesc('full', event.target.value)}
              onBlur={() => void props.onSaveBrief()}
            />
          </label>
        </div>
      </details>
      <details className="names-description-details">
        <summary>
          <span>
            <strong>Lanes</strong>
            <small>Optional parallel naming directions</small>
          </span>
        </summary>
        <div className="names-description-details-body">
          <button type="button" className="btn btn-secondary" onClick={() => void props.onStartLane()}>
            Start a new lane
          </button>
          {(session.lanes ?? []).length > 0 && (
            <ul className="names-lane-list">
              {(session.lanes ?? []).map((lane) => (
                <li key={lane.id}>
                  {lane.title} · {goalProfile(lane.namingGoal).label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </section>
  );
}
