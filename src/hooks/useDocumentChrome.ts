import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';

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
  const [searchParams] = useSearchParams();
  const {
    organizations,
    projects,
    currentOrgId,
    currentProjectId,
    currentOrganization,
    currentProject,
  } = useWorkspace();

  // Board filters (?organizationId=&projectId=) are not mirrored into WorkspaceContext.
  const boardOrgId = searchParams.get('organizationId');
  const boardProjectId = searchParams.get('projectId');

  const orgId = boardOrgId ?? currentOrgId;
  const projectId = boardProjectId ?? currentProjectId;

  const organization =
    (orgId
      ? organizations.find((org) => org.id === orgId) ?? null
      : null) ?? (orgId === currentOrgId ? currentOrganization : null);

  const project =
    (projectId
      ? projects.find((p) => p.id === projectId) ?? null
      : null) ?? (projectId === currentProjectId ? currentProject : null);

  const projectName = project?.name ?? null;
  const orgName = organization?.name ?? null;

  const title = buildTitle(projectName, orgName, Boolean(projectId));

  useEffect(() => {
    document.title = title;
    ensureFaviconLink().href = MARK_FAVICON_HREF;
  }, [title]);

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE;
      ensureFaviconLink().href = MARK_FAVICON_HREF;
    };
  }, []);
}
