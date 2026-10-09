import type {
  CloudApp,
  CloudContainer,
  CloudCoolifyApp,
  CloudCreatedAgentServer,
  CloudDeployment,
  CloudDeploymentDetail,
  CloudEasypanelApp,
  CloudGithubAppStatus,
  CloudImportResult,
  CloudPanelStatus,
  CloudProxyView,
  CloudServer,
  CreateAgentServerInput,
  CreateAppInput,
  CreateSshServerInput,
  SetAppSourceInput,
  SetBuildPolicyInput,
  SetBuildSettingsInput,
  SetRegistryInput,
} from '../../types/cloud';
import { getToken } from '../auth/tokenStorage';
import { apiRequest, API_BASE_URL } from './client';

export function getServers(): Promise<CloudServer[]> {
  return apiRequest<CloudServer[]>('/cloud/servers');
}

export function createSshServer(input: CreateSshServerInput): Promise<CloudServer> {
  return apiRequest<CloudServer>('/cloud/servers', {
    method: 'POST',
    body: { transport: 'ssh', ...input },
  });
}

export function createAgentServer(
  input: CreateAgentServerInput,
): Promise<CloudCreatedAgentServer> {
  return apiRequest<CloudCreatedAgentServer>('/cloud/servers', {
    method: 'POST',
    body: { transport: 'agent', ...input },
  });
}

export function getContainers(serverId: string): Promise<CloudContainer[]> {
  return apiRequest<CloudContainer[]>(
    `/cloud/servers/${encodeURIComponent(serverId)}/containers`,
  );
}

export function refreshServer(serverId: string): Promise<CloudServer> {
  return apiRequest<CloudServer>(
    `/cloud/servers/${encodeURIComponent(serverId)}/refresh`,
    { method: 'POST' },
  );
}

export function removeServer(serverId: string): Promise<void> {
  return apiRequest<void>(`/cloud/servers/${encodeURIComponent(serverId)}`, {
    method: 'DELETE',
  });
}

export function getProxyStatus(serverId: string): Promise<CloudProxyView> {
  return apiRequest<CloudProxyView>(
    `/cloud/servers/${encodeURIComponent(serverId)}/proxy`,
  );
}

export function installProxy(serverId: string): Promise<CloudProxyView> {
  return apiRequest<CloudProxyView>(
    `/cloud/servers/${encodeURIComponent(serverId)}/proxy`,
    { method: 'POST' },
  );
}

export function rollbackProxy(serverId: string): Promise<CloudProxyView> {
  return apiRequest<CloudProxyView>(
    `/cloud/servers/${encodeURIComponent(serverId)}/proxy/rollback`,
    { method: 'POST' },
  );
}

// ---------------------------------------------------------------------------
// Apps
// ---------------------------------------------------------------------------

export function getApps(serverId?: string): Promise<CloudApp[]> {
  const query = serverId ? `?serverId=${encodeURIComponent(serverId)}` : '';
  return apiRequest<CloudApp[]>(`/cloud/apps${query}`);
}

export function createApp(input: CreateAppInput): Promise<CloudApp> {
  return apiRequest<CloudApp>('/cloud/apps', { method: 'POST', body: input });
}

export function updateApp(
  appId: string,
  input: Partial<CreateAppInput>,
): Promise<CloudApp> {
  return apiRequest<CloudApp>(`/cloud/apps/${encodeURIComponent(appId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteApp(appId: string): Promise<void> {
  return apiRequest<void>(`/cloud/apps/${encodeURIComponent(appId)}`, {
    method: 'DELETE',
  });
}

/** Masked by default; `reveal` returns values and is audited server-side. */
export function getAppEnv(
  appId: string,
  reveal = false,
): Promise<{ env: Record<string, string> }> {
  const query = reveal ? '?reveal=true' : '';
  return apiRequest<{ env: Record<string, string> }>(
    `/cloud/apps/${encodeURIComponent(appId)}/env${query}`,
  );
}

export function setAppEnv(
  appId: string,
  env: Record<string, string>,
): Promise<{ keys: string[] }> {
  return apiRequest<{ keys: string[] }>(
    `/cloud/apps/${encodeURIComponent(appId)}/env`,
    { method: 'PUT', body: { env } },
  );
}

export function deployApp(
  appId: string,
  imageRef?: string,
): Promise<{ deploymentId: string }> {
  return apiRequest<{ deploymentId: string }>(
    `/cloud/apps/${encodeURIComponent(appId)}/deploy`,
    { method: 'POST', body: imageRef ? { imageRef } : {} },
  );
}

export function rollbackApp(appId: string): Promise<{ deploymentId: string }> {
  return apiRequest<{ deploymentId: string }>(
    `/cloud/apps/${encodeURIComponent(appId)}/rollback`,
    { method: 'POST', body: {} },
  );
}

export function appAction(
  appId: string,
  verb: 'restart' | 'stop' | 'start',
): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(
    `/cloud/apps/${encodeURIComponent(appId)}/${verb}`,
    { method: 'POST', body: {} },
  );
}

export function getDeployments(appId: string): Promise<CloudDeployment[]> {
  return apiRequest<CloudDeployment[]>(
    `/cloud/apps/${encodeURIComponent(appId)}/deployments`,
  );
}

export function getDeployment(id: string): Promise<CloudDeploymentDetail> {
  return apiRequest<CloudDeploymentDetail>(
    `/cloud/deployments/${encodeURIComponent(id)}`,
  );
}

export function getAppLogs(
  appId: string,
  tail = 200,
): Promise<{ lines: string[] }> {
  return apiRequest<{ lines: string[] }>(
    `/cloud/apps/${encodeURIComponent(appId)}/logs?tail=${tail}`,
  );
}

// ---------------------------------------------------------------------------
// Git builds — source, registry, build policy, machines, GitHub App.
// ---------------------------------------------------------------------------

export function setAppSource(
  appId: string,
  input: SetAppSourceInput,
): Promise<CloudApp> {
  return apiRequest<CloudApp>(`/cloud/apps/${encodeURIComponent(appId)}/source`, {
    method: 'PUT',
    body: input,
  });
}

export function setBuildPolicy(
  appId: string,
  input: SetBuildPolicyInput,
): Promise<CloudApp> {
  return apiRequest<CloudApp>(
    `/cloud/apps/${encodeURIComponent(appId)}/build-policy`,
    { method: 'PUT', body: input },
  );
}

export function setRegistry(
  appId: string,
  input: SetRegistryInput,
): Promise<CloudApp> {
  return apiRequest<CloudApp>(
    `/cloud/apps/${encodeURIComponent(appId)}/registry`,
    { method: 'PUT', body: input },
  );
}

/** Build the app's image from git (branch tip or a pushed ref) and deploy. */
export function buildDeployApp(
  appId: string,
  ref?: string,
): Promise<{ deploymentId: string }> {
  return apiRequest<{ deploymentId: string }>(
    `/cloud/apps/${encodeURIComponent(appId)}/build-deploy`,
    { method: 'POST', body: ref ? { ref } : {} },
  );
}

/** Returns the public half — add it as a read-only deploy key on GitHub. */
export function createDeployKey(appId: string): Promise<{ publicKey: string }> {
  return apiRequest<{ publicKey: string }>(
    `/cloud/apps/${encodeURIComponent(appId)}/deploy-key`,
    { method: 'POST', body: {} },
  );
}

export function setBuildSettings(
  serverId: string,
  input: SetBuildSettingsInput,
): Promise<unknown> {
  return apiRequest<unknown>(
    `/cloud/servers/${encodeURIComponent(serverId)}/build-settings`,
    { method: 'PUT', body: input },
  );
}

export function setBuildCheckout(
  serverId: string,
  appId: string,
  path: string,
): Promise<unknown> {
  return apiRequest<unknown>(
    `/cloud/servers/${encodeURIComponent(serverId)}/checkouts/${encodeURIComponent(appId)}`,
    { method: 'PUT', body: { path } },
  );
}

export function getGithubAppStatus(): Promise<CloudGithubAppStatus> {
  return apiRequest<CloudGithubAppStatus>('/cloud/github-app');
}

// ---------------------------------------------------------------------------
// Panel import — read-only Coolify/Easypanel reads; drafts until confirmed.
// ---------------------------------------------------------------------------

export function getPanels(): Promise<CloudPanelStatus[]> {
  return apiRequest<CloudPanelStatus[]>('/cloud/panels');
}

/** Saves the panel API token (write-only, encrypted) and/or URL override. */
export function updatePanel(
  panel: 'coolify' | 'easypanel',
  body: { apiUrl?: string; token?: string },
): Promise<{ configured: boolean }> {
  return apiRequest<{ configured: boolean }>(
    `/cloud/panels/${encodeURIComponent(panel)}`,
    { method: 'PUT', body },
  );
}

export function listCoolifyApps(): Promise<CloudCoolifyApp[]> {
  return apiRequest<CloudCoolifyApp[]>('/cloud/coolify/apps');
}

export function listEasypanelApps(): Promise<CloudEasypanelApp[]> {
  return apiRequest<CloudEasypanelApp[]>('/cloud/easypanel/apps');
}

export function importCoolifyApp(
  uuid: string,
  body: { serverId: string; name?: string },
): Promise<CloudImportResult> {
  return apiRequest<CloudImportResult>(
    `/cloud/coolify/apps/${encodeURIComponent(uuid)}/import`,
    { method: 'POST', body },
  );
}

export function importEasypanelApp(
  project: string,
  service: string,
  body: { serverId: string; name?: string },
): Promise<CloudImportResult> {
  return apiRequest<CloudImportResult>(
    `/cloud/easypanel/apps/${encodeURIComponent(project)}/${encodeURIComponent(service)}/import`,
    { method: 'POST', body },
  );
}

export function confirmImport(appId: string): Promise<CloudApp> {
  return apiRequest<CloudApp>(
    `/cloud/apps/${encodeURIComponent(appId)}/confirm-import`,
    { method: 'POST', body: {} },
  );
}

/**
 * Save GitHub App config. privateKey and webhookSecret are write-only —
 * the master encrypts them and only reports `hasWebhookSecret` back.
 */
export function updateGithubApp(body: {
  appId?: string;
  clientId?: string;
  installationId?: string;
  privateKey?: string;
  webhookSecret?: string;
}): Promise<CloudGithubAppStatus> {
  return apiRequest<CloudGithubAppStatus>('/cloud/github-app', {
    method: 'PUT',
    body,
  });
}

/**
 * Subscribe to the live deploy log over SSE. EventSource cannot send the
 * Authorization header, so this reads the streamed fetch body and parses the
 * `data:`/`event:` frames itself. Returns a close function.
 */
export function streamDeployment(
  id: string,
  onLine: (line: string) => void,
  onStatus: (status: string) => void,
  onError: () => void,
): () => void {
  const controller = new AbortController();
  const headers: HeadersInit = { Accept: 'text/event-stream' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  void fetch(
    `${API_BASE_URL}/cloud/deployments/${encodeURIComponent(id)}/stream`,
    { headers, signal: controller.signal },
  )
    .then(async (response) => {
      if (!response.ok || !response.body) {
        onError();
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          let event = 'message';
          const data: string[] = [];
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data.push(line.slice(5).trim());
          }
          if (event === 'status') onStatus(data.join('\n'));
          else if (data.length) onLine(data.join('\n'));
        }
      }
    })
    .catch(() => {
      if (!controller.signal.aborted) onError();
    });
  return () => controller.abort();
}

/** One-time install command shown to the operator after agent registration. */
export function agentInstallCommand(masterUrl: string, token: string): string {
  return [
    'docker run -d --name arc-cloud-agent --restart unless-stopped',
    `--env CLOUD_MASTER_URL=${masterUrl}`,
    `--env CLOUD_AGENT_TOKEN=${token}`,
    '-v /var/run/docker.sock:/var/run/docker.sock',
    'ghcr.io/wesleyferreirarcanjo/arc-cloud-agent:latest',
  ].join(' ');
}
