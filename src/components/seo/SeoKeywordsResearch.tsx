import { ErrorAlert } from '../ErrorAlert';
import { userMessage, WEB_ERROR } from '../../lib/errors/messages';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProjectNameSession } from '../../lib/api/names';
import { fetchSeoOfferings, saveSeoOfferings } from '../../lib/api/seo';
import {
  createNameSessionFromOfferings,
  MAX_OFFERINGS,
  nonBlankOfferings,
  OFFERINGS_REQUIRED_COPY,
} from '../../lib/seo/nameOffering';

export function SeoKeywordsResearch({
  orgId,
  projectId,
  siteId,
  siteTitle,
}: {
  orgId: string;
  projectId: string;
  siteId: string;
  siteTitle: string;
}) {
  const navigate = useNavigate();
  const firstOfferingRef = useRef<HTMLInputElement>(null);
  const [offerings, setOfferings] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchSeoOfferings(orgId, projectId, siteId);
        if (cancelled) return;
        setOfferings(result.offerings.length > 0 ? result.offerings : ['']);
      } catch (err) {
        if (!cancelled) {
          setError(userMessage(err, WEB_ERROR.LOAD, { thing: 'offerings' }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgId, projectId, siteId]);

  function updateOffering(index: number, value: string) {
    setOfferings((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function addOffering() {
    setOfferings((prev) =>
      prev.length >= MAX_OFFERINGS ? prev : [...prev, ''],
    );
  }

  async function persistOfferings(): Promise<string[] | null> {
    const saved = nonBlankOfferings(offerings);
    if (saved.length === 0) {
      setError(OFFERINGS_REQUIRED_COPY);
      firstOfferingRef.current?.focus();
      return null;
    }
    const result = await saveSeoOfferings(orgId, projectId, siteId, saved);
    setOfferings(result.offerings);
    return result.offerings;
  }

  async function handleFindKeywords() {
    setSaving(true);
    setError(null);
    try {
      // ponytail: persists offerings only. Wire POST .../research when #arc-394 lands.
      await persistOfferings();
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.SAVE, { thing: 'offerings' }));
    } finally {
      setSaving(false);
    }
  }

  async function handleNameThisOffering() {
    setSaving(true);
    setError(null);
    try {
      const saved = await persistOfferings();
      if (!saved) return;
      const created = await createProjectNameSession(
        orgId,
        projectId,
        createNameSessionFromOfferings(siteTitle, saved),
      );
      navigate(
        `/organizations/${orgId}/projects/${projectId}/names/${created.id}`,
      );
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this naming session' }));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="status-message">Loading offerings...</p>;
  }

  return (
    <div className="seo-research">
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <p className="page-subtitle">
        Write 1–5 client pain points. Saved offerings can name the product
        without retyping the sentence. Find keywords stays optional.
      </p>
      {offerings.map((value, index) => (
        <label key={index} className="form-field">
          <span>{index === 0 ? 'Offerings' : `Offering ${index + 1}`}</span>
          <input
            ref={index === 0 ? firstOfferingRef : undefined}
            type="text"
            value={value}
            placeholder="e.g. automate lead extraction"
            autoComplete="off"
            onChange={(event) => updateOffering(index, event.target.value)}
          />
        </label>
      ))}
      {offerings.length < MAX_OFFERINGS && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={addOffering}
        >
          Add offering
        </button>
      )}
      <div className="seo-research-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={saving}
          onClick={() => void handleFindKeywords()}
        >
          Find keywords
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() => void handleNameThisOffering()}
        >
          Name this offering
        </button>
      </div>
    </div>
  );
}
