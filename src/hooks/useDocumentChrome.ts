import { useEffect } from 'react';
import { useWorkspaceAccent } from '../components/WorkspaceChrome';
import { brandMarkFaviconHref } from '../lib/brand/brandMark';

const DEFAULT_TITLE = 'Arc Todo';
const FAVICON_REL = 'icon';
const MARK_FAVICON_HREF = '/icons/icon.svg';

function ensureFaviconLink(): HTMLLinkElement {
  const existing = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${FAVICON_REL}"][data-arc-todo-chrome="1"]`,
  );
  if (existing) return existing;

  const link = document.createElement('link');
  link.rel = FAVICON_REL;
  link.setAttribute('data-arc-todo-chrome', '1');
  document.head.appendChild(link);
  return link;
}

function buildTitle(
  projectName: string | null,
  orgName: string | null,
  hasProjectId: boolean,
): string {
  // Project wins when selected — name first for tab truncation.
  if (hasProjectId) {
    if (projectName && orgName) {
      return `${projectName} · ${orgName} · ${DEFAULT_TITLE}`;
    }
    if (projectName) return `${projectName} · ${DEFAULT_TITLE}`;
    // Name still loading — avoid flashing org-only title.
    return DEFAULT_TITLE;
  }
  if (orgName) return `${orgName} · ${DEFAULT_TITLE}`;
  return DEFAULT_TITLE;
}

// Layout and the active page both call this hook. The page passes its view
// title; every caller recomputes from this shared value so whichever effect
// runs last writes the same document.title.
let activeViewTitle: string | null = null;

/**
 * Keeps document.title + favicon in sync with board filters or route workspace.
 * Pages pass `viewTitle` (e.g. "Organizations") so the tab names the view.
 */
export function useDocumentChrome(viewTitle?: string): void {
  const { color, projectId, orgName, projectName } = useWorkspaceAccent();

  const faviconHref = color ? brandMarkFaviconHref(color) : MARK_FAVICON_HREF;

  useEffect(() => {
    if (viewTitle !== undefined) {
      activeViewTitle = viewTitle;
    }
    const base = buildTitle(projectName, orgName, Boolean(projectId));
    document.title = activeViewTitle ? `${activeViewTitle} · ${base}` : base;
    ensureFaviconLink().href = faviconHref;

    return () => {
      if (viewTitle !== undefined && activeViewTitle === viewTitle) {
        activeViewTitle = null;
        document.title = buildTitle(projectName, orgName, Boolean(projectId));
      }
    };
  }, [viewTitle, projectName, orgName, projectId, faviconHref]);

  useEffect(() => {
    return () => {
      if (viewTitle !== undefined && activeViewTitle === viewTitle) {
        activeViewTitle = null;
      }
      document.title = DEFAULT_TITLE;
      ensureFaviconLink().href = MARK_FAVICON_HREF;
    };
  }, []);
}
