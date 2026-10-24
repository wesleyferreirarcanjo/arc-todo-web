import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '../components/ErrorAlert';
import { BrandMarkIcon } from '../components/icons';
import { authorizeDesktop } from '../lib/api/client';
import { catalogMessage, WEB_ERROR } from '../lib/errors/messages';

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
    } catch {
      // ponytail: userMessage prefers Error.message, so ENOENT from authorizeDesktop would leak.
      // Pairing always uses the LOAD catalog; upgrade: treat errno-style copy as generic in userMessage.
      setError(catalogMessage(WEB_ERROR.LOAD, { thing: 'Arc IDE' }));
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <BrandMarkIcon className="arc-icon login-mark" />
        <h1>Connect Arc IDE</h1>
        <p className="subtitle">
          Continue only if you just started this from Arc IDE on this computer.
        </p>
        {error && (
          <ErrorAlert code={ready ? WEB_ERROR.LOAD : undefined}>{error}</ErrorAlert>
        )}
        {busy ? (
          <p className="status-message" aria-live="polite">
            Opening Arc IDE…
          </p>
        ) : null}
        <button
          className="btn btn-primary"
          type="button"
          disabled={!ready || busy}
          onClick={() => void continueToIde()}
        >
          Continue to Arc IDE
        </button>
      </div>
    </div>
  );
}
