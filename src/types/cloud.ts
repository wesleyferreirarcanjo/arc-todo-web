export type CloudServerRole = 'target' | 'build';
export type CloudTransport = 'ssh' | 'agent';
export type CloudServerStatus = 'online' | 'offline';
export type CloudPanel = 'coolify' | 'easypanel' | 'none';
export type CloudProxyState = 'not_installed' | 'running' | 'error';

export interface CloudServer {
  id: string;
  name: string;
  role: CloudServerRole;
  transport: CloudTransport;
  status: CloudServerStatus;
  dockerVersion: string | null;
  panel: CloudPanel;
  swarmActive: boolean;
  lastSeenAt: string | null;
  fingerprint: string | null;
  proxyState: CloudProxyState;
  proxyVersion: string | null;
  /** Build-machine controls (build role only). */
  acceptBuilds: boolean;
  buildPriority: number;
  maxParallelBuilds: number;
}

/** Result of install / status / rollback calls on the arc-cloud proxy. */
export interface CloudProxyView {
  state: CloudProxyState;
  version: string | null;
  detail: string | null;
  hosts: string[];
}

export interface CloudContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  labels: Record<string, string>;
}

export interface CreateSshServerInput {
  name: string;
  role: CloudServerRole;
  sshHost: string;
  sshPort: number;
  sshUser: string;
  /** Sent once over TLS, stored encrypted by the master, never returned. */
  sshPrivateKey: string;
}

export interface CreateAgentServerInput {
  name: string;
  role: CloudServerRole;
}

/** Returned once at creation; agentToken is never stored or shown again. */
export interface CloudCreatedAgentServer {
  server: CloudServer;
  agentToken: string;
}

export type CloudAppSource = 'image' | 'compose';
export type CloudAppStatus =
  | 'running'
  | 'stopped'
  | 'deploying'
  | 'failed'
  | 'draft';
export type CloudImportSource = 'coolify' | 'easypanel';
export type CloudDeploymentStatus =
  | 'queued'
  | 'running'
  | 'healthy'
  | 'failed'
  | 'rolled_back';

export type CloudGitProvider = 'github_app' | 'deploy_key' | 'public';
export type CloudBuildPolicy = 'local_preferred' | 'local_only' | 'server_only';
export type CloudRegistry = 'ghcr' | 'private';

export interface CloudApp {
  id: string;
  name: string;
  serverId: string;
  source: CloudAppSource;
  image: string | null;
  port: number;
  healthPath: string;
  domains: string[];
  status: CloudAppStatus;
  currentDeploymentId: string | null;
  createdAt: string;
  /** null = image/compose deploys only; set = builds happen from git. */
  gitProvider: CloudGitProvider | null;
  repo: string | null;
  branch: string;
  dockerfile: string;
  context: string;
  autoDeploy: boolean;
  registry: CloudRegistry;
  registryRepo: string | null;
  registryUser: string | null;
  buildPolicy: CloudBuildPolicy;
  allowedBuildServers: string[];
  /** Public half only — the private key is encrypted and never returned. */
  deployKeyPub: string | null;
  /** 'draft' = imported from a panel, awaiting confirmation before deploy. */
  importState: 'draft' | null;
  importSource: CloudImportSource | null;
  importRef: string | null;
  importSummary: CloudImportSummary | null;
}

/** One row of the import review table: panel value vs. arc-cloud value. */
export interface CloudImportField {
  label: string;
  panel: string;
  arc: string;
}

export interface CloudImportVolume {
  type: string;
  source: string;
  target: string;
}

/** Side-by-side snapshot stored on a draft app at import time. */
export interface CloudImportSummary {
  panel: CloudImportSource;
  ref: string;
  panelName: string;
  importedAt: string;
  fields: CloudImportField[];
  envKeys: string[];
  envCount: number;
  domains: string[];
  volumes: CloudImportVolume[];
  warnings: string[];
}

export interface CloudPanelStatus {
  panel: CloudImportSource;
  apiUrl: string | null;
  configured: boolean;
}

export interface CloudCoolifyApp {
  uuid: string;
  name: string;
  fqdn: string | null;
  buildPack: string | null;
  status: string | null;
}

export interface CloudEasypanelApp {
  project: string;
  service: string;
  type: string;
}

export interface CloudImportResult {
  app: CloudApp;
  summary: CloudImportSummary;
}

export interface CloudDeployment {
  id: string;
  appId: string;
  imageRef: string | null;
  status: CloudDeploymentStatus;
  trigger: string;
  actor: string | null;
  startedAt: string;
  finishedAt: string | null;
  /** Build metadata — set on git-source deployments. */
  commitSha: string | null;
  builtOnServerId: string | null;
  builtOnName: string | null;
  buildSeconds: number | null;
  pushSeconds: number | null;
}

export interface SetAppSourceInput {
  gitProvider?: CloudGitProvider | '';
  repo?: string;
  branch?: string;
  dockerfile?: string;
  context?: string;
  autoDeploy?: boolean;
}

export interface SetBuildPolicyInput {
  buildPolicy: CloudBuildPolicy;
  allowedBuildServers?: string[];
}

export interface SetRegistryInput {
  registry?: CloudRegistry;
  registryRepo?: string;
  registryUser?: string;
  /** Empty string clears the stored secret; absent keeps it. */
  registryPass?: string;
}

export interface SetBuildSettingsInput {
  acceptBuilds?: boolean;
  buildPriority?: number;
  maxParallelBuilds?: number;
}

export interface CloudGithubAppStatus {
  configured: boolean;
  appId?: string;
  clientId?: string | null;
  installationId?: string | null;
  hasWebhookSecret?: boolean;
}

/** GET /cloud/deployments/:id returns the view plus the masked log. */
export interface CloudDeploymentDetail extends CloudDeployment {
  log: string;
}

export interface CreateAppInput {
  name: string;
  serverId: string;
  source: CloudAppSource;
  image?: string;
  composeYaml?: string;
  port?: number;
  healthPath?: string;
  domains?: string[];
}
