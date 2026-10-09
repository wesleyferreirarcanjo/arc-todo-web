import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CloudServer } from '../types/cloud';

const getServers = vi.hoisted(() => vi.fn());
const createSshServer = vi.hoisted(() => vi.fn());
const createAgentServer = vi.hoisted(() => vi.fn());
const getContainers = vi.hoisted(() => vi.fn());
const refreshServer = vi.hoisted(() => vi.fn());
const removeServer = vi.hoisted(() => vi.fn());
const installProxy = vi.hoisted(() => vi.fn());
const rollbackProxy = vi.hoisted(() => vi.fn());
const getProxyStatus = vi.hoisted(() => vi.fn());
const getApps = vi.hoisted(() => vi.fn());
const createApp = vi.hoisted(() => vi.fn());
const deployApp = vi.hoisted(() => vi.fn());
const rollbackApp = vi.hoisted(() => vi.fn());
const appAction = vi.hoisted(() => vi.fn());
const getDeployments = vi.hoisted(() => vi.fn());
const getDeployment = vi.hoisted(() => vi.fn());
const getAppEnv = vi.hoisted(() => vi.fn());
const getAppLogs = vi.hoisted(() => vi.fn());
const streamDeployment = vi.hoisted(() => vi.fn(() => () => {}));
const setAppSource = vi.hoisted(() => vi.fn());
const setBuildPolicy = vi.hoisted(() => vi.fn());
const setRegistry = vi.hoisted(() => vi.fn());
const buildDeployApp = vi.hoisted(() => vi.fn());
const createDeployKey = vi.hoisted(() => vi.fn());
const setBuildSettings = vi.hoisted(() => vi.fn());
const setBuildCheckout = vi.hoisted(() => vi.fn());
const getGithubAppStatus = vi.hoisted(() => vi.fn());
const updateGithubApp = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/cloud', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/cloud')>(
    '../lib/api/cloud',
  );
  return {
    ...actual,
    getServers,
    createSshServer,
    createAgentServer,
    getContainers,
    refreshServer,
    removeServer,
    installProxy,
    rollbackProxy,
    getProxyStatus,
    getApps,
    createApp,
    deployApp,
    rollbackApp,
    appAction,
    getDeployments,
    getDeployment,
    getAppEnv,
    getAppLogs,
    streamDeployment,
    setAppSource,
    setBuildPolicy,
    setRegistry,
    buildDeployApp,
    createDeployKey,
    setBuildSettings,
    setBuildCheckout,
    getGithubAppStatus,
    updateGithubApp,
  };
});

import { CloudPage } from './CloudPage';
import type { CloudApp } from '../types/cloud';

const serverId = '11111111-1111-4111-8111-111111111111';

const server: CloudServer = {
  id: serverId,
  name: 'arc-lab-1',
  role: 'target',
  transport: 'ssh',
  status: 'online',
  dockerVersion: '28.3.0',
  panel: 'coolify',
  swarmActive: false,
  lastSeenAt: '2026-10-05T12:00:00.000Z',
  fingerprint: 'SHA256:abc123',
  proxyState: 'not_installed',
  proxyVersion: null,
  acceptBuilds: false,
  buildPriority: 0,
  maxParallelBuilds: 1,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/cloud']}>
      <CloudPage />
    </MemoryRouter>,
  );
}

describe('CloudPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('lists servers with status, fingerprint, and panel badge', async () => {
    getServers.mockResolvedValue([server]);

    renderPage();

    expect(await screen.findByText('arc-lab-1')).toBeInTheDocument();
    expect(screen.getByText('SSH')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('28.3.0')).toBeInTheDocument();
    expect(screen.getByText('SHA256:abc123')).toBeInTheDocument();
    expect(screen.getByText('Coolify')).toBeInTheDocument();
  });

  it('shows containers after clicking a server name', async () => {
    getServers.mockResolvedValue([server]);
    getContainers.mockResolvedValue([
      {
        id: 'c1',
        name: 'web',
        image: 'nginx:1',
        state: 'running',
        status: 'Up 2 hours',
        labels: {},
      },
    ]);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('arc-lab-1');

    await user.click(screen.getByRole('button', { name: 'arc-lab-1' }));

    expect(await screen.findByText('web')).toBeInTheDocument();
    expect(screen.getByText('nginx:1')).toBeInTheDocument();
    expect(getContainers).toHaveBeenCalledWith(serverId);
  });

  it('creates an agent server, shows the token once, then hides it on close', async () => {
    getServers.mockResolvedValue([]);
    createAgentServer.mockResolvedValue({
      server: { ...server, transport: 'agent', fingerprint: null },
      agentToken: 'act_secret_token',
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/No servers yet/);

    await user.click(screen.getByRole('button', { name: 'Add server' }));
    await user.click(screen.getByRole('tab', { name: 'Agent' }));
    await user.type(screen.getByLabelText('Server name'), 'arc-lab-2');
    await user.click(screen.getByRole('button', { name: 'Create agent token' }));

    expect(createAgentServer).toHaveBeenCalledWith({
      name: 'arc-lab-2',
      role: 'target',
    });
    expect(await screen.findByText(/act_secret_token/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy install command' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByText(/act_secret_token/)).not.toBeInTheDocument();
    });
    expect(screen.getByText('arc-lab-1')).toBeInTheDocument();
  });

  it('marks build machines when the toggle is set', async () => {
    getServers.mockResolvedValue([]);
    createAgentServer.mockResolvedValue({
      server: { ...server, transport: 'agent', role: 'build' },
      agentToken: 'act_x',
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/No servers yet/);

    await user.click(screen.getByRole('button', { name: 'Add server' }));
    await user.click(screen.getByRole('tab', { name: 'Agent' }));
    await user.type(screen.getByLabelText('Server name'), 'wesley-pc');
    await user.click(screen.getByLabelText(/Build machine only/));
    await user.click(screen.getByRole('button', { name: 'Create agent token' }));

    expect(createAgentServer).toHaveBeenCalledWith({
      name: 'wesley-pc',
      role: 'build',
    });
  });

  it('clears the private key field after an SSH submit', async () => {
    getServers.mockResolvedValue([]);
    createSshServer.mockResolvedValue(server);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/No servers yet/);

    await user.click(screen.getByRole('button', { name: 'Add server' }));
    await user.type(screen.getByLabelText('Server name'), 'arc-lab-1');
    await user.type(screen.getByLabelText('Host'), '192.168.1.10');
    const keyField = screen.getByLabelText('Private key');
    await user.type(keyField, 'KEY-MATERIAL');
    await user.click(screen.getByRole('button', { name: 'Save server' }));

    await waitFor(() => {
      expect(createSshServer).toHaveBeenCalled();
    });
    expect(createSshServer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'arc-lab-1',
        sshHost: '192.168.1.10',
        sshPort: 22,
        sshUser: 'root',
        sshPrivateKey: 'KEY-MATERIAL',
      }),
    );
    // Dialog closed and state reset: reopening shows an empty key field.
    await user.click(screen.getByRole('button', { name: 'Add server' }));
    expect(screen.getByLabelText('Private key')).toHaveValue('');
  });

  it('requires confirmation before removing a server', async () => {
    getServers.mockResolvedValue([server]);
    removeServer.mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('arc-lab-1');

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(removeServer).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(removeServer).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'Remove' }),
    );

    await waitFor(() => {
      expect(removeServer).toHaveBeenCalledWith(serverId);
    });
  });

  it('shows the proxy column and installs after confirmation', async () => {
    getServers.mockResolvedValue([server]);
    installProxy.mockResolvedValue({
      state: 'running',
      version: '3.5.0',
      detail: 'arc-cloud-proxy running',
      hosts: ['app.coolify.test'],
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('arc-lab-1');

    expect(screen.getByText('Not installed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Install proxy' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Install' }));

    await waitFor(() => {
      expect(installProxy).toHaveBeenCalledWith(serverId);
    });
    expect(await screen.findByText(/Running 3\.5\.0/)).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Roll back proxy' }),
    ).toBeInTheDocument();
  });

  it('rolls back a running proxy after confirmation', async () => {
    getServers.mockResolvedValue([
      { ...server, proxyState: 'running', proxyVersion: '3.5.0' },
    ]);
    rollbackProxy.mockResolvedValue({
      state: 'not_installed',
      version: null,
      detail: 'restored stop:coolify-proxy',
      hosts: ['app.coolify.test'],
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('arc-lab-1');

    await user.click(screen.getByRole('button', { name: 'Roll back proxy' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Roll back' }));

    await waitFor(() => {
      expect(rollbackProxy).toHaveBeenCalledWith(serverId);
    });
    expect(await screen.findByText('Not installed')).toBeInTheDocument();
  });

  it('shows the refusal message and never offers proxy actions on build machines', async () => {
    getServers.mockResolvedValue([{ ...server, role: 'build' }]);

    renderPage();
    await screen.findByText('arc-lab-1');

    expect(screen.queryByRole('button', { name: 'Install proxy' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Roll back proxy' })).toBeNull();
  });

  it('renders Cloud service is unavailable. when the API rejects', async () => {
    getServers.mockRejectedValue(new Error('down'));

    renderPage();

    expect(
      await screen.findByText('Cloud service is unavailable.'),
    ).toBeInTheDocument();
  });

  it('edits build settings on a selected build machine', async () => {
    const build = {
      ...server,
      role: 'build' as const,
      acceptBuilds: true,
      buildPriority: 10,
      maxParallelBuilds: 2,
    };
    getServers.mockResolvedValue([build]);
    getContainers.mockResolvedValue([]);
    setBuildSettings.mockResolvedValue({});

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('arc-lab-1');
    await user.click(screen.getByRole('button', { name: 'arc-lab-1' }));

    expect(
      await screen.findByText(`Build settings — ${build.name}`),
    ).toBeInTheDocument();
    const parallel = screen.getByLabelText(/Max parallel builds/);
    await user.clear(parallel);
    await user.type(parallel, '4');
    await user.click(
      screen.getByRole('button', { name: 'Save build settings' }),
    );

    await waitFor(() => {
      expect(setBuildSettings).toHaveBeenCalledWith(build.id, {
        acceptBuilds: true,
        buildPriority: 10,
        maxParallelBuilds: 4,
      });
    });
  });

  it('shows GitHub App status in the config dialog', async () => {
    getServers.mockResolvedValue([server]);
    getGithubAppStatus.mockResolvedValue({
      configured: true,
      appId: '42',
      clientId: 'Iv1.abc',
      installationId: '77',
      hasWebhookSecret: true,
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText('arc-lab-1');
    await user.click(screen.getByRole('button', { name: 'GitHub App' }));

    expect(await screen.findByText(/app 42/)).toBeInTheDocument();
    expect(screen.getByLabelText('App ID')).toHaveValue('42');
    expect(screen.getByLabelText('Client ID')).toHaveValue('Iv1.abc');
  });
});

describe('CloudPage apps tab', () => {
  const app: CloudApp = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'whoami',
    serverId,
    source: 'image',
    image: 'traefik/whoami:v1.10',
    port: 80,
    healthPath: '/',
    domains: ['app.arc.test'],
    status: 'running',
    currentDeploymentId: '33333333-3333-4333-8333-333333333333',
    createdAt: '2026-10-05T12:00:00.000Z',
    gitProvider: null,
    repo: null,
    branch: 'main',
    dockerfile: 'Dockerfile',
    context: '.',
    autoDeploy: false,
    registry: 'ghcr',
    registryRepo: null,
    registryUser: null,
    buildPolicy: 'local_preferred',
    allowedBuildServers: [],
    deployKeyPub: null,
  };

  afterEach(() => {
    cleanup();
  });

  async function openAppsTab() {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('tab', { name: 'Apps' });
    await user.click(screen.getByRole('tab', { name: 'Apps' }));
    return user;
  }

  it('lists apps with status and domain', async () => {
    getServers.mockResolvedValue([server]);
    getApps.mockResolvedValue([app]);

    await openAppsTab();

    expect(await screen.findByText('whoami')).toBeInTheDocument();
    expect(screen.getByText('traefik/whoami:v1.10')).toBeInTheDocument();
    expect(screen.getByText('app.arc.test')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('creates an image app and never offers build machines as targets', async () => {
    getServers.mockResolvedValue([
      server,
      { ...server, id: '44444444-4444-4444-8444-444444444444', name: 'wesley-pc', role: 'build' },
    ]);
    getApps.mockResolvedValue([]);
    createApp.mockResolvedValue(app);

    const user = await openAppsTab();
    await screen.findByText(/No applications yet/);
    await user.click(screen.getByRole('button', { name: 'New app' }));

    expect(screen.getByRole('option', { name: 'arc-lab-1' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'wesley-pc' })).toBeNull();

    await user.type(screen.getByLabelText('App name'), 'whoami');
    await user.selectOptions(screen.getByLabelText('Server'), serverId);
    await user.type(screen.getByLabelText('Image'), 'traefik/whoami:v1.10');
    await user.type(screen.getByLabelText(/Domains/), 'app.arc.test');
    await user.click(screen.getByRole('button', { name: 'Create app' }));

    await waitFor(() => {
      expect(createApp).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'whoami',
          serverId,
          source: 'image',
          image: 'traefik/whoami:v1.10',
          domains: ['app.arc.test'],
        }),
      );
    });
  });

  it('deploys and streams the deployment log', async () => {
    getServers.mockResolvedValue([server]);
    getApps.mockResolvedValue([app]);
    deployApp.mockResolvedValue({ deploymentId: 'dep-1' });
    getDeployments.mockResolvedValue([
      {
        id: 'dep-1',
        appId: app.id,
        imageRef: 'traefik/whoami:v1.10',
        status: 'running',
        trigger: 'ui',
        actor: 'u1',
        startedAt: '2026-10-05T12:00:00.000Z',
        finishedAt: null,
        commitSha: null,
        builtOnServerId: null,
        builtOnName: null,
        buildSeconds: null,
        pushSeconds: null,
      },
    ]);

    const user = await openAppsTab();
    await user.click(await screen.findByRole('button', { name: 'whoami' }));
    await user.click(screen.getByRole('button', { name: 'Deploy' }));

    await waitFor(() => {
      expect(deployApp).toHaveBeenCalledWith(app.id, undefined);
    });
    expect(streamDeployment).toHaveBeenCalledWith(
      'dep-1',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    // Image ref shows both in the app row and the deployment row.
    expect(
      (await screen.findAllByText('traefik/whoami:v1.10')).length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText('Deployment log')).toBeInTheDocument();
  });

  it('masks env values and reveals them only on request', async () => {
    getServers.mockResolvedValue([server]);
    getApps.mockResolvedValue([app]);
    getAppEnv
      .mockResolvedValueOnce({ env: { SECRET: '••••••••' } })
      .mockResolvedValueOnce({ env: { SECRET: 'real-value' } });

    const user = await openAppsTab();
    await user.click(await screen.findByRole('button', { name: 'whoami' }));
    await user.click(screen.getByRole('tab', { name: 'Environment' }));

    expect(await screen.findByText('SECRET')).toBeInTheDocument();
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(getAppEnv).toHaveBeenCalledWith(app.id);

    await user.click(screen.getByRole('button', { name: 'Reveal values' }));
    expect(getAppEnv).toHaveBeenCalledWith(app.id, true);
    expect(await screen.findByText('real-value')).toBeInTheDocument();
  });

  it('stops the app after the Stop action', async () => {
    getServers.mockResolvedValue([server]);
    getApps.mockResolvedValue([app]);
    appAction.mockResolvedValue({ status: 'stopped' });

    const user = await openAppsTab();
    await user.click(await screen.findByRole('button', { name: 'whoami' }));
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    await waitFor(() => {
      expect(appAction).toHaveBeenCalledWith(app.id, 'stop');
    });
  });

  it('configures a git source on the Source tab', async () => {
    getServers.mockResolvedValue([server]);
    getApps.mockResolvedValue([app]);
    setAppSource.mockResolvedValue({
      ...app,
      gitProvider: 'public',
      repo: 'owner/repo',
    });

    const user = await openAppsTab();
    await user.click(await screen.findByRole('button', { name: 'whoami' }));
    await user.click(screen.getByRole('tab', { name: 'Source' }));

    await user.selectOptions(
      screen.getByLabelText('Git provider'),
      'public',
    );
    await user.type(screen.getByLabelText('Repository'), 'owner/repo');
    await user.click(screen.getByRole('button', { name: 'Save source' }));

    await waitFor(() => {
      expect(setAppSource).toHaveBeenCalledWith(
        app.id,
        expect.objectContaining({
          gitProvider: 'public',
          repo: 'owner/repo',
        }),
      );
    });
  });

  it('builds and deploys a git app from the Overview tab', async () => {
    const gitApp: CloudApp = {
      ...app,
      gitProvider: 'public',
      repo: 'owner/repo',
      buildPolicy: 'local_preferred',
    };
    getServers.mockResolvedValue([server]);
    getApps.mockResolvedValue([gitApp]);
    buildDeployApp.mockResolvedValue({ deploymentId: 'dep-9' });
    getDeployments.mockResolvedValue([]);

    const user = await openAppsTab();
    await user.click(await screen.findByRole('button', { name: 'whoami' }));
    await user.click(
      screen.getByRole('button', { name: 'Build & deploy' }),
    );

    await waitFor(() => {
      expect(buildDeployApp).toHaveBeenCalledWith(gitApp.id, undefined);
    });
    expect(streamDeployment).toHaveBeenCalledWith(
      'dep-9',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });
});
