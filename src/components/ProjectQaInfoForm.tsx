import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorAlert } from './ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { fetchProjectQaInfo, updateProjectQaInfo } from '../lib/api/qaInfo';
import {
  emptyEnvironmentDraft,
  emptyUserDraft,
  validateQaDraft,
  type QaEnvironmentDraft,
  type QaUserDraft,
} from '../lib/qaInfo/validate';
import type { ProjectQaInfo } from '../types/qaInfo';

let draftKey = 0;
function nextKey(): string {
  draftKey += 1;
  return `qa-${draftKey}`;
}

function profileToDrafts(profile: ProjectQaInfo): {
  environments: QaEnvironmentDraft[];
  users: QaUserDraft[];
  notes: string;
} {
  return {
    environments: profile.environments.map((item) => ({
      key: nextKey(),
      name: item.name,
      url: item.url,
      notes: item.notes ?? '',
    })),
    users: profile.users.map((item) => ({
      key: nextKey(),
      label: item.label,
      email: item.email ?? '',
      howToSignIn: item.howToSignIn ?? '',
      notes: item.notes ?? '',
    })),
    notes: profile.notes ?? '',
  };
}

type ProjectQaInfoFormProps = {
  organizationId: string;
  projectId: string;
  compact?: boolean;
};

export function ProjectQaInfoForm({
  organizationId,
  projectId,
  compact = false,
}: ProjectQaInfoFormProps) {
  const formId = useId();
  const [environments, setEnvironments] = useState<QaEnvironmentDraft[]>([]);
  const [users, setUsers] = useState<QaUserDraft[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSaved(false);
    void fetchProjectQaInfo(organizationId, projectId)
      .then((profile) => {
        if (cancelled) return;
        const draft = profileToDrafts(profile);
        setEnvironments(draft.environments);
        setUsers(draft.users);
        setNotes(draft.notes);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'QA info' }));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, projectId]);

  async function handleSave() {
    const validationError = validateQaDraft({ environments, users });
    if (validationError) {
      setError(validationError);
      setSaved(false);
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const savedProfile = await updateProjectQaInfo(organizationId, projectId, {
        environments: environments
          .map((item) => ({
            name: item.name.trim(),
            url: item.url.trim(),
            notes: item.notes.trim() || undefined,
          }))
          .filter((item) => item.name || item.url || item.notes),
        users: users
          .map((item) => ({
            label: item.label.trim(),
            email: item.email.trim() || undefined,
            howToSignIn: item.howToSignIn.trim() || undefined,
            notes: item.notes.trim() || undefined,
          }))
          .filter(
            (item) => item.label || item.email || item.howToSignIn || item.notes,
          ),
        notes: notes.trim() ? notes.trim() : null,
      });
      const draft = profileToDrafts(savedProfile);
      setEnvironments(draft.environments);
      setUsers(draft.users);
      setNotes(draft.notes);
      setSaved(true);
    } catch (err: unknown) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'QA info' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={`qa-info-form${compact ? ' is-compact' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      {compact && (
        <p className="qa-info-form-lede">
          Saved for this whole project, not only this task.{' '}
          <Link to={`/organizations/${organizationId}/projects/${projectId}/qa-info`}>
            Open full page
          </Link>
        </p>
      )}

      {loading && <p className="status-message">Loading QA info...</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {saved && !error && (
        <p className="status-message" role="status">
          Saved.
        </p>
      )}

      <section className="qa-info-section" aria-labelledby={`${formId}-environments`}>
        <h3 id={`${formId}-environments`}>Environments</h3>
        {environments.map((item, index) => (
          <div className="qa-info-row" key={item.key}>
            <label className="form-field">
              <span>Name</span>
              <input
                type="text"
                value={item.name}
                onChange={(event) =>
                  setEnvironments((prev) =>
                    prev.map((row) =>
                      row.key === item.key
                        ? { ...row, name: event.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
            <label className="form-field">
              <span>URL</span>
              <input
                type="text"
                inputMode="url"
                autoComplete="url"
                value={item.url}
                onChange={(event) =>
                  setEnvironments((prev) =>
                    prev.map((row) =>
                      row.key === item.key
                        ? { ...row, url: event.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
            <label className="form-field">
              <span>Notes</span>
              <input
                type="text"
                value={item.notes}
                onChange={(event) =>
                  setEnvironments((prev) =>
                    prev.map((row) =>
                      row.key === item.key
                        ? { ...row, notes: event.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
            <div className="qa-info-row-actions">
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setEnvironments((prev) => prev.filter((row) => row.key !== item.key))
                }
              >
                Remove
              </button>
            </div>
            <span className="sr-only">Environment {index + 1}</span>
          </div>
        ))}
        <div className="qa-info-section-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              setEnvironments((prev) => [...prev, emptyEnvironmentDraft(nextKey())])
            }
          >
            Add environment
          </button>
        </div>
      </section>

      <section className="qa-info-section" aria-labelledby={`${formId}-users`}>
        <h3 id={`${formId}-users`}>Test users</h3>
        {users.map((item, index) => (
          <div className="qa-info-row" key={item.key}>
            <label className="form-field">
              <span>Label</span>
              <input
                type="text"
                value={item.label}
                onChange={(event) =>
                  setUsers((prev) =>
                    prev.map((row) =>
                      row.key === item.key
                        ? { ...row, label: event.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
            <label className="form-field">
              <span>Email</span>
              <input
                type="email"
                value={item.email}
                onChange={(event) =>
                  setUsers((prev) =>
                    prev.map((row) =>
                      row.key === item.key
                        ? { ...row, email: event.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
            <label className="form-field">
              <span>How to sign in</span>
              <input
                type="text"
                value={item.howToSignIn}
                onChange={(event) =>
                  setUsers((prev) =>
                    prev.map((row) =>
                      row.key === item.key
                        ? { ...row, howToSignIn: event.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
            <label className="form-field">
              <span>Notes</span>
              <input
                type="text"
                value={item.notes}
                onChange={(event) =>
                  setUsers((prev) =>
                    prev.map((row) =>
                      row.key === item.key
                        ? { ...row, notes: event.target.value }
                        : row,
                    ),
                  )
                }
              />
            </label>
            <div className="qa-info-row-actions">
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setUsers((prev) => prev.filter((row) => row.key !== item.key))
                }
              >
                Remove
              </button>
            </div>
            <span className="sr-only">Test user {index + 1}</span>
          </div>
        ))}
        <div className="qa-info-section-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setUsers((prev) => [...prev, emptyUserDraft(nextKey())])}
          >
            Add user
          </button>
        </div>
      </section>

      <section className="qa-info-section" aria-labelledby={`${formId}-notes`}>
        <h3 id={`${formId}-notes`}>Notes</h3>
        <label className="form-field">
          <span className="sr-only">Notes</span>
          <textarea
            rows={compact ? 3 : 5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </section>

      <div className="qa-info-form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading || saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
