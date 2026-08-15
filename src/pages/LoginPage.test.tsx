import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api/client';

const loginWithGoogle = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-google-client');
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    loginWithGoogle,
    logout: vi.fn(),
  }),
}));

import { LoginPage } from './LoginPage';

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function installGisMock() {
  window.google = {
    accounts: {
      id: {
        initialize: (config) => {
          window.google!.accounts.id.prompt = () => {
            config.callback({ credential: 'fake-id-token' });
          };
        },
        renderButton: (parent) => {
          parent.innerHTML = '';
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = 'Sign in with Google';
          button.addEventListener('click', () => {
            window.google?.accounts.id.prompt();
          });
          parent.appendChild(button);
        },
        prompt: () => {},
      },
    },
  };
}

describe('LoginPage SSO 401', () => {
  beforeEach(() => {
    loginWithGoogle.mockReset();
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    document.body.appendChild(script);
    installGisMock();
  });

  afterEach(() => {
    document
      .querySelectorAll(`script[src="${GSI_SCRIPT_SRC}"]`)
      .forEach((node) => node.remove());
    delete window.google;
  });

  it('keeps the Google button mounted and clickable after an unassigned-account 401', async () => {
    const user = userEvent.setup();
    loginWithGoogle.mockRejectedValue(
      new ApiError(
        'No Arc Todo user is assigned to this Google account. Ask an administrator to add your email, then try again.',
        401,
        'ERR-ARC-AUTH-07',
      ),
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const googleButton = await screen.findByRole('button', {
      name: 'Sign in with Google',
    });
    await user.click(googleButton);

    expect(
      await screen.findByText(
        'No Arc Todo user is assigned to this Google account. Ask an administrator to add your email, then try again.',
      ),
    ).toBeInTheDocument();

    const host = document.querySelector('.google-signin-button');
    expect(host).toBeInTheDocument();
    expect(host).toHaveAttribute('aria-busy', 'false');

    const retry = await screen.findByRole('button', {
      name: 'Sign in with Google',
    });
    expect(retry).toBeVisible();

    await waitFor(() => {
      expect(host).not.toHaveStyle({ pointerEvents: 'none' });
    });
  });
});
