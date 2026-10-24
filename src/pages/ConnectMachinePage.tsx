import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '../components/ErrorAlert';
import { BrandMarkIcon } from '../components/icons';
import { authorizeMachineConnect } from '../lib/api/machines';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';

const CALLBACK = 'arc-windows://connect/callback';

/** Accept only the fixed callback with `code` and `state`. */
export function machineCallbackTarget(callbackUrl: string): string {
  let url: URL;
  try {
    url = new URL(callbackUrl);
  } catch {
    throw new Error('The machine did not return a usable callback.');
  }
  const fixed = `${url.protocol}//${url.host}${url.pathname}`;
  if (fixed !== CALLBACK) {
    throw new Error('The machine callback did not match the expected link.');
  }
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    throw new Error('The machine callback is missing the connect code.');
  }
  for (const key of url.searchParams.keys()) {
    if (key !== 'code' && key !== 'state') {
      throw new Error('The machine callback included an unexpected value.');
    }
  }
  return url.toString();
}

export function ConnectMachinePage() {
  const [params] = useSearchParams();
  const state = params.get('state') ?? '';
  const codeChallenge = params.get('code_challenge') ?? '';
  const name = params.get('name')?.trim() || undefined;
  const ready =
    /^[A-Za-z0-9_-]{16,128}$/.test(state) &&
    /^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge);
  const [error, setError] = useState<string | null>(
    ready
      ? null
      : 'This connection link is incomplete. Start it again from the PC.',
  );
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function continueToMachine() {
    setBusy(true);
    setError(null);
    setErrorCode(undefined);
    try {
      const result = await authorizeMachineConnect({
        state,
        codeChallenge,
        name,
      });
      window.location.assign(machineCallbackTarget(result.callbackUrl));
    } catch (err) {
      // ponytail: userMessage echoes non-generic Error.message, so ENOENT leaks.
      // Catalog client-side failures; API errors still go through userMessage.
      // Upgrade: treat filesystem/stack fragments as generic in userMessage.
      setError(
        userMessage(
          err && typeof err === 'object' && 'status' in err ? err : {},
          WEB_ERROR.LOAD,
          { thing: 'this machine' },
        ),
      );
      setErrorCode(WEB_ERROR.LOAD);
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <BrandMarkIcon className="arc-icon login-mark" />
        <h1>Connect this machine</h1>
        <p className="subtitle">
          Continue only if you just started this from the PC you want to
          connect to Arc Todo.
        </p>
        {error && <ErrorAlert code={errorCode}>{error}</ErrorAlert>}
        {busy ? (
          <p className="status-message" aria-live="polite">
            Connecting…
          </p>
        ) : null}
        <button
          className="btn btn-primary"
          type="button"
          disabled={!ready || busy}
          onClick={() => void continueToMachine()}
        >
          {busy ? 'Connecting…' : 'Connect this machine'}
        </button>
      </div>
    </div>
  );
}
