import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProjectDiagram } from '../lib/api/diagrams';
import { extractMarkupPageImages } from '../lib/wireframes/markupScene';
import type { ProjectDiagramSummary } from '../types/diagram';

interface WireframeCardPreviewProps {
  orgId: string;
  projectId: string;
  previewPath: string;
  diagrams: ProjectDiagramSummary[];
}

function latestMarkup(
  diagrams: ProjectDiagramSummary[],
): ProjectDiagramSummary | null {
  if (diagrams.length === 0) return null;
  return [...diagrams].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  )[0];
}

function Chevron({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dir === 'prev' ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}

export function WireframeCardPreview({
  orgId,
  projectId,
  previewPath,
  diagrams,
}: WireframeCardPreviewProps) {
  const markup = latestMarkup(diagrams);
  const [pages, setPages] = useState<{ name: string; dataURL: string }[] | null>(
    null,
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!markup) {
      setPages([]);
      setIndex(0);
      return;
    }

    let cancelled = false;
    setPages(null);
    setIndex(0);

    void fetchProjectDiagram(orgId, projectId, markup.id)
      .then((diagram) => {
        if (cancelled) return;
        const extracted = extractMarkupPageImages(diagram.sceneJson);
        if (extracted.length > 0) {
          setPages(extracted);
          return;
        }
        setPages(
          diagram.thumbnail
            ? [{ name: 'Page', dataURL: diagram.thumbnail }]
            : [],
        );
      })
      .catch(() => {
        if (cancelled) return;
        setPages(
          markup.thumbnail
            ? [{ name: 'Page', dataURL: markup.thumbnail }]
            : [],
        );
      });

    return () => {
      cancelled = true;
    };
  }, [orgId, projectId, markup?.id, markup?.updatedAt, markup?.thumbnail]);

  const loaded = pages !== null;
  const current = pages?.[index];
  const pageCount = pages?.length ?? 0;

  function step(delta: number) {
    if (pageCount < 2) return;
    setIndex((prev) => (prev + delta + pageCount) % pageCount);
  }

  return (
    <div className="wireframe-card-preview">
      <Link to={previewPath} className="diagram-card-preview-link">
        {current ? (
          <img
            src={current.dataURL}
            alt={current.name ? `${current.name} preview` : ''}
            className="diagram-card-thumbnail"
          />
        ) : (
          <div className="diagram-card-placeholder">
            {loaded ? 'Wireframe' : 'Loading…'}
          </div>
        )}
      </Link>
      {pages && pages.length > 1 ? (
        <>
          <button
            type="button"
            className="wireframe-preview-nav wireframe-preview-nav--prev"
            aria-label="Previous page"
            onClick={() => step(-1)}
          >
            <Chevron dir="prev" />
          </button>
          <button
            type="button"
            className="wireframe-preview-nav wireframe-preview-nav--next"
            aria-label="Next page"
            onClick={() => step(1)}
          >
            <Chevron dir="next" />
          </button>
          <div className="wireframe-preview-caption">
            <span>
              {current?.name || 'Page'} ({index + 1}/{pageCount})
            </span>
            <div className="wireframe-preview-dots" role="tablist">
              {pages.map((page, pageIndex) => (
                <button
                  key={`${page.name}-${pageIndex}`}
                  type="button"
                  role="tab"
                  aria-label={page.name}
                  aria-selected={pageIndex === index}
                  className={
                    pageIndex === index
                      ? 'wireframe-preview-dot is-active'
                      : 'wireframe-preview-dot'
                  }
                  onClick={() => setIndex(pageIndex)}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
