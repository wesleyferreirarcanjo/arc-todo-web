import type { CloudApp, CloudServer } from '../../types/cloud';

interface Props {
  app: CloudApp;
  gitProvider: string;
  repo: string;
  branch: string;
  dockerfile: string;
  context: string;
  autoDeploy: boolean;
  registryRepo: string;
  registryUser: string;
  registryPass: string;
  buildPolicy: CloudApp['buildPolicy'];
  allowed: string[];
  checkoutPaths: Record<string, string>;
  newKey: string | null;
  busy: string | null;
  buildMachines: CloudServer[];
  onGitProviderChange: (value: string) => void;
  onRepoChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onDockerfileChange: (value: string) => void;
  onContextChange: (value: string) => void;
  onAutoDeployChange: (value: boolean) => void;
  onRegistryRepoChange: (value: string) => void;
  onRegistryUserChange: (value: string) => void;
  onRegistryPassChange: (value: string) => void;
  onBuildPolicyChange: (value: CloudApp['buildPolicy']) => void;
  onToggleAllowed: (id: string) => void;
  onCheckoutPathChange: (serverId: string, value: string) => void;
  onSaveSource: () => void;
  onDeployKey: () => void;
  onSavePolicy: () => void;
  onSaveCheckout: (serverId: string) => void;
  onSaveRegistry: () => void;
}

export function AppDetailSource({
  app,
  gitProvider,
  repo,
  branch,
  dockerfile,
  context,
  autoDeploy,
  registryRepo,
  registryUser,
  registryPass,
  buildPolicy,
  allowed,
  checkoutPaths,
  newKey,
  busy,
  buildMachines,
  onGitProviderChange,
  onRepoChange,
  onBranchChange,
  onDockerfileChange,
  onContextChange,
  onAutoDeployChange,
  onRegistryRepoChange,
  onRegistryUserChange,
  onRegistryPassChange,
  onBuildPolicyChange,
  onToggleAllowed,
  onCheckoutPathChange,
  onSaveSource,
  onDeployKey,
  onSavePolicy,
  onSaveCheckout,
  onSaveRegistry,
}: Props) {
  return (
    <div className="cloud-app-overview">
      <label className="board-filter-field">
        Git provider
        <select
          value={gitProvider}
          onChange={(event) => onGitProviderChange(event.target.value)}
        >
          <option value="">None (image / compose deploys)</option>
          <option value="github_app">GitHub App</option>
          <option value="deploy_key">Deploy key (SSH)</option>
          <option value="public">Public repository</option>
        </select>
      </label>
      {gitProvider ? (
        <>
          <label className="board-filter-field">
            Repository
            <input
              type="text"
              value={repo}
              onChange={(event) => onRepoChange(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="owner/repo or full git URL"
            />
          </label>
          <label className="board-filter-field">
            Branch
            <input
              type="text"
              value={branch}
              onChange={(event) => onBranchChange(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="main"
            />
          </label>
          <label className="board-filter-field">
            Dockerfile
            <input
              type="text"
              value={dockerfile}
              onChange={(event) => onDockerfileChange(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Dockerfile"
            />
          </label>
          <label className="board-filter-field">
            Build context
            <input
              type="text"
              value={context}
              onChange={(event) => onContextChange(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="."
            />
          </label>
          <label className="cloud-build-toggle">
            <input
              type="checkbox"
              checked={autoDeploy}
              onChange={(event) => onAutoDeployChange(event.target.checked)}
            />
            Auto-deploy on push (signed GitHub webhook)
          </label>
        </>
      ) : null}
      <div className="hub-actions cloud-app-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy !== null}
          onClick={onSaveSource}
        >
          Save source
        </button>
      </div>

      {gitProvider === 'deploy_key' ? (
        <>
          <div className="hub-actions cloud-app-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy !== null}
              onClick={onDeployKey}
            >
              {busy === 'deploykey'
                ? 'Generating…'
                : app.deployKeyPub
                  ? 'Rotate deploy key'
                  : 'Generate deploy key'}
            </button>
          </div>
          {newKey || app.deployKeyPub ? (
            <pre className="cloud-log-view" aria-label="Deploy key">
              {newKey ?? app.deployKeyPub}
            </pre>
          ) : null}
          <p className="status-message">
            Add this as a read-only deploy key on the repository.
          </p>
        </>
      ) : null}

      <label className="board-filter-field">
        Build policy
        <select
          value={buildPolicy}
          onChange={(event) =>
            onBuildPolicyChange(event.target.value as CloudApp['buildPolicy'])
          }
        >
          <option value="local_preferred">
            Local preferred — build on a build machine when online,
            otherwise on the target
          </option>
          <option value="local_only">
            Local only — queue until a build machine is free
          </option>
          <option value="server_only">
            Server only — always build on the target
          </option>
        </select>
      </label>
      {buildPolicy !== 'server_only' && buildMachines.length > 0 ? (
        <fieldset className="board-filter-field">
          <legend>Allowed build machines (none checked = all)</legend>
          {buildMachines.map((m) => (
            <label key={m.id} className="cloud-build-toggle">
              <input
                type="checkbox"
                checked={allowed.includes(m.id)}
                onChange={() => onToggleAllowed(m.id)}
              />
              {m.name}
            </label>
          ))}
        </fieldset>
      ) : null}
      <div className="hub-actions cloud-app-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy !== null}
          onClick={onSavePolicy}
        >
          Save build policy
        </button>
      </div>

      {buildPolicy !== 'server_only' && buildMachines.length > 0 ? (
        <fieldset className="board-filter-field">
          <legend>Checkout mapping (persistent path per machine)</legend>
          {buildMachines.map((m) => (
            <div key={m.id} className="cloud-app-actions">
              <label className="board-filter-field">
                {m.name}
                <input
                  type="text"
                  value={checkoutPaths[m.id] ?? ''}
                  onChange={(event) =>
                    onCheckoutPathChange(m.id, event.target.value)
                  }
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="D:\\arc-checkouts\\app or /var/lib/arc/app"
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy !== null}
                onClick={() => onSaveCheckout(m.id)}
              >
                Save
              </button>
            </div>
          ))}
        </fieldset>
      ) : null}

      <label className="board-filter-field">
        Registry repository
        <input
          type="text"
          value={registryRepo}
          onChange={(event) => onRegistryRepoChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="ghcr.io/owner/image"
        />
      </label>
      <label className="board-filter-field">
        Registry user
        <input
          type="text"
          value={registryUser}
          onChange={(event) => onRegistryUserChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label className="board-filter-field">
        Registry token / password (write-only, stored encrypted)
        <input
          type="password"
          value={registryPass}
          onChange={(event) => onRegistryPassChange(event.target.value)}
          autoComplete="new-password"
          spellCheck={false}
        />
      </label>
      <div className="hub-actions cloud-app-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy !== null}
          onClick={onSaveRegistry}
        >
          Save registry
        </button>
      </div>
    </div>
  );
}
