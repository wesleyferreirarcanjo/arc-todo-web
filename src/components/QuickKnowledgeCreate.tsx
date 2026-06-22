import { useEffect, useState } from 'react';
import { KnowledgeForm } from './KnowledgeForm';
import { Modal } from './Modal';
import { Select } from './Select';
import type { CreateKnowledgeInput } from '../types/knowledge';

export type KnowledgeSaveTarget = 'general' | 'organization' | 'project';

interface QuickKnowledgeCreateProps {
  organizationId: string;
  projectId: string;
  organizationName?: string;
  projectName?: string;
  lockedTarget?: KnowledgeSaveTarget;
  onCreate: (
    target: KnowledgeSaveTarget,
    input: CreateKnowledgeInput,
    files?: File[],
  ) => Promise<void>;
}

export function QuickKnowledgeCreate({
  organizationId,
  projectId,
  organizationName,
  projectName,
  lockedTarget,
  onCreate,
}: QuickKnowledgeCreateProps) {
  const [open, setOpen] = useState(false);
  const [saveTarget, setSaveTarget] = useState<KnowledgeSaveTarget>('general');

  useEffect(() => {
    if (!open) return;

    if (lockedTarget) {
      setSaveTarget(lockedTarget);
      return;
    }

    if (organizationId && projectId) {
      setSaveTarget('project');
    } else if (organizationId) {
      setSaveTarget('organization');
    } else {
      setSaveTarget('general');
    }
  }, [open, lockedTarget, organizationId, projectId]);

  function closeModal() {
    setOpen(false);
  }

  async function handleSubmit(input: CreateKnowledgeInput, files?: File[]) {
    await onCreate(saveTarget, input, files);
    closeModal();
  }

  const saveTargetOptions = [
    { value: 'general', label: 'General' },
    ...(organizationId
      ? [
          {
            value: 'organization',
            label: `Organization: ${organizationName ?? 'Selected org'}`,
          },
        ]
      : []),
    ...(organizationId && projectId
      ? [
          {
            value: 'project',
            label: `Project: ${projectName ?? 'Selected project'}`,
          },
        ]
      : []),
  ] as const;

  const canSave =
    saveTarget === 'general' ||
    (saveTarget === 'organization' && Boolean(organizationId)) ||
    (saveTarget === 'project' && Boolean(organizationId && projectId));

  return (
    <>
      <button
        type="button"
        className="btn btn-primary quick-create-trigger"
        onClick={() => setOpen(true)}
      >
        New knowledge
      </button>

      <Modal
        open={open}
        onClose={closeModal}
        title="New knowledge"
        titleId="knowledge-create-modal-title"
        className="knowledge-create-modal"
      >
        {!lockedTarget && saveTargetOptions.length > 1 && (
          <label className="board-filter-field">
            Save to
            <Select
              value={saveTarget}
              onChange={(value) => setSaveTarget(value as KnowledgeSaveTarget)}
              options={saveTargetOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </label>
        )}

        {lockedTarget === 'project' && projectName && (
          <p className="status-message knowledge-save-target-hint">
            Saving to project: {projectName}
          </p>
        )}

        {lockedTarget === 'organization' && organizationName && (
          <p className="status-message knowledge-save-target-hint">
            Saving to organization: {organizationName}
          </p>
        )}

        {canSave ? (
          <KnowledgeForm onSubmit={handleSubmit} submitLabel="Create knowledge" />
        ) : (
          <p className="status-message">
            Select an organization or project in the filters before saving scoped
            knowledge.
          </p>
        )}
      </Modal>
    </>
  );
}
