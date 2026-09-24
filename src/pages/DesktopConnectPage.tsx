import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '../components/ErrorAlert';
import { ApiError, authorizeDesktop } from '../lib/api/client';

const CALLBACK = 'arc-ide://arc-todo/callback';

/** Accept only the fixed callback with `code` and `state`. */
export function desktopCallbackTarget(callbackUrl: string): string {
  let url: URL;
  try {
    url = new URL(callbackUrl);
  } catch {
    throw new Error('Arc IDE did not return a usable callback.');
  }
  const fixed = `${url.protocol}//${url.host}${url.pathname}`;
  if (fixed !== CALLBACK) {
    throw new Error('Arc IDE callback did not match the expected link.');
  }
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    throw new Error('Arc IDE callback is missing the sign-in code.');
  }
  for (const key of url.searchParams.keys()) {
    if (key !== 'code' && key !== 'state') {
      throw new Error('Arc IDE callback included an unexpected value.');
    }
  }
  return url.toString();
}

export function DesktopConnectPage() {
  const [params] = useSearchParams();
  const state = params.get('state') ?? '';
  const codeChallenge = params.get('code_challenge') ?? '';
  const ready = /^[A-Za-z0-9_-]{16,128}$/.test(state) && /^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge);
  const [error, setError] = useState<string | null>(
    ready ? null : 'This Arc IDE connection link is incomplete. Start it again from Arc IDE.',
  );
  const [busy, setBusy] = useState(false);

  async function continueToIde() {
    setBusy(true);
    setError(null);
    try {
      const result = await authorizeDesktop({ state, codeChallenge });
      window.location.assign(desktopCallbackTarget(result.callbackUrl));
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not continue to Arc IDE.');
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Connect Arc IDE</h1>
        <p className="subtitle">
          Continue only if you just started this from Arc IDE on this computer.
        </p>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <button
          className="btn btn-primary"
          type="button"
          disabled={!ready || busy}
          onClick={() => void continueToIde()}
        >
          {busy ? 'Opening Arc IDE…' : 'Continue to Arc IDE'}
        </button>
      </div>
    </div>
  );
}
