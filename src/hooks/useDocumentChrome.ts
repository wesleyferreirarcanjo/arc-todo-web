import { useEffect } from 'react';
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
  viewLabel: string | null,
  projectName: string | null,
  orgName: string | null,
  hasProjectId: boolean,
): string {
  // Project wins when selected — name first for tab truncation.
  if (hasProjectId) {
    if (projectName && orgName) {
      return joinTitle(viewLabel, `${projectName} · ${orgName}`);
    }
    if (projectName) return joinTitle(viewLabel, projectName);
    // Name still loading — avoid flashing org-only title.
    return joinTitle(viewLabel, null);
  }
  if (orgName) return joinTitle(viewLabel, orgName);
  return joinTitle(viewLabel, null);
}

function joinTitle(viewLabel: string | null, workspace: string | null): string {
  return [viewLabel, workspace, DEFAULT_TITLE].filter(Boolean).join(' · ');
}

/** Keeps document.title + favicon in sync with the current view and workspace. */
export function useDocumentChrome(): void {
  const location = useLocation();
  const { color, projectId, orgName, projectName } = useWorkspaceAccent();

  const title = buildTitle(
    viewLabelForPath(location.pathname),
    projectName,
    orgName,
    Boolean(projectId),
  );
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
