import { createContext, useContext, useEffect } from 'react';
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

/**
 * Layout provides the setter so a routed page can contribute its name to
 * `document.title`. `null` outside the app shell (standalone routes).
 */
export const PageTitleSetterContext = createContext<
  ((title: string | null) => void) | null
>(null);

/** Keeps document.title + favicon in sync with board filters or route workspace. */
export function useDocumentChrome(pageTitle?: string | null): void {
  const { color, projectId, orgName, projectName } = useWorkspaceAccent();

  const baseTitle = buildTitle(projectName, orgName, Boolean(projectId));
  const title = pageTitle ? `${pageTitle} · ${baseTitle}` : baseTitle;
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

/**
 * Names the current view in `document.title`. Inside the app shell the title
 * is prepended to the workspace title; on standalone routes (no provider) it
 * writes `<title> · Arc Todo` directly.
 */
export function usePageTitle(title: string | null): void {
  const setPageTitle = useContext(PageTitleSetterContext);

  useEffect(() => {
    if (setPageTitle) {
      setPageTitle(title);
      return () => setPageTitle(null);
    }
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${DEFAULT_TITLE}`;
    return () => {
      document.title = previous || DEFAULT_TITLE;
    };
  }, [setPageTitle, title]);
}
