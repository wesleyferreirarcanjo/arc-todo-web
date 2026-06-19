import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useParams } from 'react-router-dom';
import { fetchOrganizations } from '../lib/api/organizations';
import { fetchProjects } from '../lib/api/projects';
import {
  setLastOrganizationId,
  setLastProjectId,
} from '../lib/storage/appStorage';
import type { Organization } from '../types/organization';
import type { Project } from '../types/project';

interface WorkspaceContextValue {
  organizations: Organization[];
  projects: Project[];
  currentOrgId: string | null;
  currentProjectId: string | null;
  currentOrganization: Organization | null;
  currentProject: Project | null;
  loadingOrganizations: boolean;
  loadingProjects: boolean;
  refreshOrganizations: () => Promise<void>;
  refreshProjects: (orgId: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const refreshOrganizations = useCallback(async () => {
    setLoadingOrganizations(true);
    try {
      const data = await fetchOrganizations();
      setOrganizations(data);
    } finally {
      setLoadingOrganizations(false);
    }
  }, []);

  const refreshProjects = useCallback(async (orgId: string) => {
    setLoadingProjects(true);
    try {
      const data = await fetchProjects(orgId);
      setProjects(data);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void refreshOrganizations();
  }, [refreshOrganizations]);

  useEffect(() => {
    if (!currentOrgId) {
      setProjects([]);
      return;
    }

    setLastOrganizationId(currentOrgId);
    void refreshProjects(currentOrgId);
  }, [currentOrgId, refreshProjects]);

  useEffect(() => {
    if (currentProjectId) {
      setLastProjectId(currentProjectId);
    }
  }, [currentProjectId]);

  const currentOrganization = useMemo(
    () => organizations.find((org) => org.id === currentOrgId) ?? null,
    [organizations, currentOrgId],
  );

  const currentProject = useMemo(
    () => projects.find((project) => project.id === currentProjectId) ?? null,
    [projects, currentProjectId],
  );

  const value = useMemo(
    () => ({
      organizations,
      projects,
      currentOrgId,
      currentProjectId,
      currentOrganization,
      currentProject,
      loadingOrganizations,
      loadingProjects,
      refreshOrganizations,
      refreshProjects,
    }),
    [
      organizations,
      projects,
      currentOrgId,
      currentProjectId,
      currentOrganization,
      currentProject,
      loadingOrganizations,
      loadingProjects,
      refreshOrganizations,
      refreshProjects,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      <WorkspaceSync
        setCurrentOrgId={setCurrentOrgId}
        setCurrentProjectId={setCurrentProjectId}
      />
      {children}
    </WorkspaceContext.Provider>
  );
}

function WorkspaceSync({
  setCurrentOrgId,
  setCurrentProjectId,
}: {
  setCurrentOrgId: (id: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;
}) {
  const { orgId, projectId } = useParams();

  useEffect(() => {
    setCurrentOrgId(orgId ?? null);
  }, [orgId, setCurrentOrgId]);

  useEffect(() => {
    setCurrentProjectId(projectId ?? null);
  }, [projectId, setCurrentProjectId]);

  return null;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
