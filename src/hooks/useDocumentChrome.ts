import { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkspaceAccent } from '../components/WorkspaceChrome';
import { brandMarkFaviconHref } from '../lib/brand/brandMark';
import { isLinkActive, primaryNav } from '../lib/nav/primaryNav';

const DEFAULT_TITLE = 'Arc Todo';
const FAVICON_REL = 'icon';
const MARK_FAVICON_HREF = '/icons/icon.svg';

// Settings flyout labels live in Layout/MobileBoardFab, not primaryNav.
const SETTINGS_TITLES: [RegExp, string][] = [
  [/^\/settings\/chatbot\/testing/, 'Chatbot testing'],
  [/^\/settings\/chatbot/, 'Chatbot settings'],
  [/^\/settings\/mcp-tools/, 'MCP Tools'],
  [/^\/settings\/storage/, 'Storage'],
  [/^\/settings\/seo/, 'SEO settings'],
];

function viewLabelForPath(pathname: string): string | null {
  for (const [pattern, label] of SETTINGS_TITLES) {
    if (pattern.test(pathname)) return label;
  }
  for (const entry of primaryNav) {
    if (entry.kind === 'link') {
      if (isLinkActive(entry, pathname)) return entry.label;
      continue;
    }
    const child = entry.children.find((link) => isLinkActive(link, pathname));
    if (child) return child.label;
  }
  return null;
}

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

/**
 * Keeps document.title + favicon in sync with board filters or route workspace.
 * `viewTitle` names the current view explicitly (e.g. "Organizations"); when it
 * is omitted the label is derived from the route and primary nav.
 */
export function useDocumentChrome(viewTitle?: string | null): void {
  const location = useLocation();
  const { color, projectId, orgName, projectName } = useWorkspaceAccent();

  const label = viewTitle ?? viewLabelForPath(location.pathname);
  const baseTitle = buildTitle(projectName, orgName, Boolean(projectId));
  const title = label ? `${label} · ${baseTitle}` : baseTitle;
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
