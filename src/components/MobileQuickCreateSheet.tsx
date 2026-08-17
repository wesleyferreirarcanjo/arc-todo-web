import { ErrorAlert } from './ErrorAlert';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { createProjectTask } from '../lib/api/todos';
import { fetchProjects } from '../lib/api/projects';
import {
  getLastOrganizationId,
  getLastProjectId,
  setLastOrganizationId,
  setLastProjectId,
} from '../lib/storage/appStorage';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Project } from '../types/project';
import { getProjectColor } from '../lib/color/entityColor';
import { Modal } from './Modal';
import { Select } from './Select';

export interface MobileQuickCreateScope {
  /** When set, skip org/project pickers and create in this project. */
  organizationId?: string;
  projectId?: string;
}

interface MobileQuickCreateSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
  scope?: MobileQuickCreateScope;
}

export function MobileQuickCreateSheet({
  open,
  onClose,
  onCreated,
  scope,
}: MobileQuickCreateSheetProps) {
  const { organizations, loadingOrganizations, projects: workspaceProjects } = useWorkspace();
  const fixedScope = Boolean(scope?.organizationId && scope?.projectId);
  const [organizationId, setOrganizationId] = useState(scope?.organizationId ?? '');
  const [projectId, setProjectId] = useState(scope?.projectId ?? '');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async (orgId: string) => {
    setLoadingProjects(true);
    try {
      const data = await fetchProjects(orgId);
      setProjects(data);
      return data;
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    setTitle('');
    setDueDate('');
    setError(null);

    if (fixedScope && scope?.organizationId && scope?.projectId) {
      setOrganizationId(scope.organizationId);
      setProjectId(scope.projectId);
      return;
    }

    const lastOrgId = getLastOrganizationId();
    const lastProjectId = getLastProjectId();
    const initialOrg =
      lastOrgId && organizations.some((org) => org.id === lastOrgId)
        ? lastOrgId
        : organizations[0]?.id ?? '';

    setOrganizationId(initialOrg);
    setProjectId('');

    if (initialOrg) {
      void loadProjects(initialOrg).then((data) => {
        const initialProject =
          lastProjectId && data.some((project) => project.id === lastProjectId)
            ? lastProjectId
            : data[0]?.id ?? '';
        setProjectId(initialProject);
      });
    } else {
      setProjects([]);
    }
  }, [open, organizations, loadProjects, fixedScope, scope?.organizationId, scope?.projectId]);

  async function handleOrganizationChange(nextOrgId: string) {
    setOrganizationId(nextOrgId);
    setProjectId('');
    setProjects([]);
    if (nextOrgId) {
      setLastOrganizationId(nextOrgId);
      const data = await loadProjects(nextOrgId);
      setProjectId(data[0]?.id ?? '');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !organizationId || !projectId) return;

    setLoading(true);
    setError(null);
    try {
      await createProjectTask(organizationId, projectId, {
        title: title.trim(),
        dueDate: dueDate || undefined,
      });
      setLastOrganizationId(organizationId);
      setLastProjectId(projectId);
      await onCreated();
      onClose();
    } catch (err) {
      setError(userMessage(err, WEB_ERROR.CREATE, { thing: 'this task' }));
    } finally {
      setLoading(false);
    }
  }

  const canCreate = Boolean(organizationId && projectId && title.trim());
  const selectedProject =
    projects.find((project) => project.id === projectId)
    ?? workspaceProjects.find((project) => project.id === projectId);

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title="New task"
      titleId="mobile-quick-create-title"
      className="mobile-quick-create-modal"
      accentColor={selectedProject ? getProjectColor(selectedProject) : undefined}
    >
      <form className="mobile-quick-create-form" onSubmit={(event) => void handleSubmit(event)}>
        {error ? <ErrorAlert>{error}</ErrorAlert> : null}

        {!fixedScope ? (
          <div className="quick-create-context">
            <label className="board-filter-field">
              Organization
              <Select
                value={organizationId}
                placeholder={
                  loadingOrganizations ? 'Loading...' : 'Select organization'
                }
                disabled={loadingOrganizations || organizations.length === 0}
                onChange={(value) => void handleOrganizationChange(value)}
                options={organizations.map((organization) => ({
                  value: organization.id,
                  label: organization.name,
                }))}
              />
            </label>

            <label className="board-filter-field">
              Project
              <Select
                value={projectId}
                placeholder={
                  loadingProjects
                    ? 'Loading projects...'
                    : organizationId
                      ? 'Select project'
                      : 'Choose organization first'
                }
                disabled={!organizationId || loadingProjects || projects.length === 0}
                onChange={(value) => {
                  setProjectId(value);
                  if (value) setLastProjectId(value);
                }}
                options={projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                }))}
              />
            </label>
          </div>
        ) : null}

        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to be done?"
            required
            autoFocus
          />
        </label>

        <label>
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>

        <div className="mobile-quick-create-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canCreate || loading}
          >
            {loading ? 'Adding...' : 'Add task'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
