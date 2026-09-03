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

/** Keeps document.title + favicon in sync with board filters or route workspace. */
export function useDocumentChrome(): void {
  const { color, projectId, orgName, projectName } = useWorkspaceAccent();

  const title = buildTitle(projectName, orgName, Boolean(projectId));
  const faviconHref = color ? brandMarkFaviconHref(color) : MARK_FAVICON_HREF;

  useEffect(() => {
    document.title = title;
    ensureFaviconLink().href = faviconHref;
  }, [title, faviconHref]);

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE;
      ensureFaviconLink().href = MARK_FAVICON_HREF;
    };
  }, []);
}
