import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProjectQaInfoForm } from './ProjectQaInfoForm';
import { QA_INVALID_URL_MESSAGE } from '../lib/qaInfo/validate';

const fetchProjectQaInfo = vi.fn();
const updateProjectQaInfo = vi.fn();

vi.mock('../lib/api/qaInfo', () => ({
  fetchProjectQaInfo: (...args: unknown[]) => fetchProjectQaInfo(...args),
  updateProjectQaInfo: (...args: unknown[]) => updateProjectQaInfo(...args),
}));

const emptyProfile = {
  id: null,
  projectId: 'proj-1',
  environments: [],
  users: [],
  notes: null,
  updatedById: null,
  createdAt: null,
  updatedAt: null,
};

describe('ProjectQaInfoForm', () => {
  beforeEach(() => {
    fetchProjectQaInfo.mockReset();
    updateProjectQaInfo.mockReset();
    fetchProjectQaInfo.mockResolvedValue(emptyProfile);
    updateProjectQaInfo.mockResolvedValue(emptyProfile);
  });

  afterEach(() => {
    cleanup();
  });

  it('refuses a junk environment URL without saving', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProjectQaInfoForm organizationId="org-1" projectId="proj-1" />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Environments' });
    await user.click(screen.getByRole('button', { name: 'Add environment' }));
    await user.type(screen.getByLabelText('Name'), 'URL ruim');
    await user.type(screen.getByLabelText('URL'), 'nao-e-um-site');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      QA_INVALID_URL_MESSAGE,
    );
    expect(updateProjectQaInfo).not.toHaveBeenCalled();
  });

  it('saves environments, users, and notes', async () => {
    const user = userEvent.setup();
    updateProjectQaInfo.mockResolvedValue({
      ...emptyProfile,
      id: 'qa-1',
      environments: [
        { name: 'Ambiente de teste QA', url: 'https://example.com', notes: 'só para este teste' },
      ],
      users: [
        {
          label: 'Membro de teste',
          email: 'membro.teste@example.com',
          howToSignIn: 'botão Google',
        },
      ],
      notes: 'Menu lateral: All tasks.',
    });

    render(
      <MemoryRouter>
        <ProjectQaInfoForm organizationId="org-1" projectId="proj-1" />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Notes' });
    await user.click(screen.getByRole('button', { name: 'Add environment' }));
    const nameFields = screen.getAllByLabelText('Name');
    await user.type(nameFields[0], 'Ambiente de teste QA');
    await user.type(screen.getByLabelText('URL'), 'https://example.com');
    const envNotes = screen.getAllByLabelText('Notes');
    await user.type(envNotes[0], 'só para este teste');

    await user.click(screen.getByRole('button', { name: 'Add user' }));
    await user.type(screen.getByLabelText('Label'), 'Membro de teste');
    await user.type(screen.getByLabelText('Email'), 'membro.teste@example.com');
    await user.type(screen.getByLabelText('How to sign in'), 'botão Google');

    const notesBoxes = screen.getAllByLabelText('Notes');
    await user.type(notesBoxes[notesBoxes.length - 1], 'Menu lateral: All tasks.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateProjectQaInfo).toHaveBeenCalledTimes(1);
    });
    expect(updateProjectQaInfo).toHaveBeenCalledWith('org-1', 'proj-1', {
      environments: [
        {
          name: 'Ambiente de teste QA',
          url: 'https://example.com',
          notes: 'só para este teste',
        },
      ],
      users: [
        {
          label: 'Membro de teste',
          email: 'membro.teste@example.com',
          howToSignIn: 'botão Google',
          notes: undefined,
        },
      ],
      notes: 'Menu lateral: All tasks.',
    });
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
  });
});
