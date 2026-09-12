import { Modal } from '../Modal';
import type { NamingReviewRow } from '../../lib/names/smartCopy';
import { GENERATE_MAX, selectedReviewNames } from '../../lib/names/smartCopy';

export function NamesPasteDialog(props: {
  open: boolean;
  text: string;
  onChange: (value: string) => void;
  onReview: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={props.open}
      onClose={props.onCancel}
      title="Paste AI response"
      titleId="names-paste-title"
    >
      <p className="names-disclaimer">
        Paste JSON, a NAMES list, or a numbered list. Nothing is added until you review
        and confirm.
      </p>
      <label className="form-field">
        <span>AI response</span>
        <textarea
          rows={10}
          value={props.text}
          onChange={(event) => props.onChange(event.target.value)}
        />
      </label>
      <div className="names-review-actions">
        <button type="button" className="btn btn-primary" onClick={props.onReview}>
          Review names
        </button>
        <button type="button" className="btn btn-secondary" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

export function CandidateReviewDialog(props: {
  open: boolean;
  rows: NamingReviewRow[];
  error?: string | null;
  busy: boolean;
  onRowChange: (id: string, patch: Partial<Pick<NamingReviewRow, 'name' | 'rationale' | 'selected'>>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const selected = selectedReviewNames(props.rows);
  const overflowSelected = props.rows.filter((row) => row.selected && row.overflow).length;
  const tooMany = selected.length > GENERATE_MAX;

  return (
    <Modal
      open={props.open}
      onClose={props.onCancel}
      title="Review suggested names"
      titleId="names-review-title"
      className="names-review-modal"
    >
      <p className="names-disclaimer">
        These are suggestions only. They are not domain, trademark, language, or search
        clearance.
      </p>
      {props.error ? (
        <p className="alert alert-error" role="alert">
          {props.error}
        </p>
      ) : null}
      {tooMany || overflowSelected ? (
        <p className="alert" role="status">
          Select at most {GENERATE_MAX} new names. Deselect extras before adding them.
        </p>
      ) : null}
      <div className="names-review-table-wrap">
        <table className="names-review-table">
          <thead>
            <tr>
              <th>Add</th>
              <th>Name</th>
              <th>Why it might fit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => {
              const blocked = Boolean(row.invalidReason || row.duplicateOf);
              return (
                <tr key={row.id} className={row.overflow ? 'is-overflow' : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.selected}
                      disabled={blocked}
                      aria-label={`Add ${row.name || 'this name'}`}
                      onChange={(event) =>
                        props.onRowChange(row.id, { selected: event.target.checked })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.name}
                      aria-label={`Name for ${row.name || 'this row'}`}
                      onChange={(event) =>
                        props.onRowChange(row.id, { name: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={row.rationale}
                      aria-label={`Rationale for ${row.name || 'this row'}`}
                      onChange={(event) =>
                        props.onRowChange(row.id, { rationale: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    {row.duplicateOf
                      ? `Already in this session as ${row.duplicateOf}`
                      : row.invalidReason
                        ? row.invalidReason
                        : row.overflow
                          ? `Over the ${GENERATE_MAX}-name add limit`
                          : 'New'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="names-review-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={props.busy || selected.length === 0 || tooMany}
          onClick={props.onConfirm}
        >
          Add selected names
        </button>
        <button type="button" className="btn btn-secondary" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
