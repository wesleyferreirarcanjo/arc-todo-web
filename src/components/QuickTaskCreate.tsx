import { useCallback, useEffect, useState } from 'react';
import { createProjectTask } from '../lib/api/todos';
import { fetchProjects } from '../lib/api/projects';
import {
  getLastOrganizationId,
  getLastProjectId,
  setLastOrganizationId,
  setLastProjectId,
} from '../lib/storage/appStorage';
import { useWorkspace } from '../context/WorkspaceContext';
import type { CreateTaskInput } from '../types/todo';
import type { Project } from '../types/project';
import { Modal } from './Modal';
import { Select } from './Select';
import { TaskForm } from './TaskForm';

interface QuickTaskCreateProps {
  onCreated: () => Promise<void>;
}

export function QuickTaskCreate({ onCreated }: QuickTaskCreateProps) {
  const { organizations, loadingOrganizations } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

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

  function closeModal() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

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
  }, [open, organizations, loadProjects]);

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

  function handleProjectChange(nextProjectId: string) {
    setProjectId(nextProjectId);
    if (nextProjectId) {
      setLastProjectId(nextProjectId);
    }
  }

  async function handleCreate(input: CreateTaskInput) {
    if (!organizationId || !projectId) {
      throw new Error('Organization and project are required.');
    }

    await createProjectTask(organizationId, projectId, input);
    setLastOrganizationId(organizationId);
    setLastProjectId(projectId);
    await onCreated();
    closeModal();
  }

  const canCreate = Boolean(organizationId && projectId);

  return (
    <>
      <button
        type="button"
        className="btn btn-primary quick-create-trigger"
        onClick={() => setOpen(true)}
      >
        New task
      </button>

      <Modal
        open={open}
        onClose={closeModal}
        title="New task"
        titleId="task-create-modal-title"
        className="task-create-modal"
      >
        <div className="quick-create-context">
          <label className="board-filter-field">
            Organization
            <Select
              value={organizationId}
              placeholder={
                loadingOrganizations ? 'Loading...' : 'Select organization'
              }
              disabled={loadingOrganizations || organizations.length === 0}
              onChange={handleOrganizationChange}
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
              disabled={
                !organizationId ||
                loadingProjects ||
                projects.length === 0
              }
              onChange={handleProjectChange}
              options={projects.map((project) => ({
                value: project.id,
                label: project.name,
              }))}
            />
          </label>
        </div>

        {!loadingOrganizations && organizations.length === 0 && (
          <p className="status-message">
            Create an organization and project before adding tasks.
          </p>
        )}

        {organizationId && !loadingProjects && projects.length === 0 && (
          <p className="status-message">
            No projects in this organization yet. Create a project first.
          </p>
        )}

        {canCreate && (
          <TaskForm onSubmit={handleCreate} hideHeading heading="New task" />
        )}
      </Modal>
    </>
  );
}
