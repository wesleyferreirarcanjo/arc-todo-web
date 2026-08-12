import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ApiError } from '../lib/api/client';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export function LoginPage() {
  const { isAuthenticated, loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const handlingRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) return;
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Sign-In is not configured (missing VITE_GOOGLE_CLIENT_ID).');
      return;
    }

    let cancelled = false;

    async function handleCredential(response: GoogleCredentialResponse) {
      if (handlingRef.current) return;
      const idToken = response.credential;
      if (!idToken) {
        setError('Google Sign-In was cancelled or returned no credential.');
        return;
      }

      handlingRef.current = true;
      setError(null);
      setLoading(true);
      try {
        await loginWithGoogle(idToken);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(
            err.status === 401
              ? err.message ||
                  'No Arc Todo user is assigned to this Google account'
              : err.message,
          );
        } else {
          setError('Google Sign-In failed. Please try again.');
        }
        setLoading(false);
        handlingRef.current = false;
        // GIS may consume the iframe after a credential; repaint while the host stays mounted.
        renderGoogleButton();
      }
    }

    function renderGoogleButton() {
      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          void handleCredential(response);
        },
        cancel_on_tap_outside: true,
      });
      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 320,
      });
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SCRIPT_SRC}"]`,
    );
    if (existing) {
      if (window.google?.accounts?.id) {
        renderGoogleButton();
      } else {
        existing.addEventListener('load', renderGoogleButton);
      }
      return () => {
        cancelled = true;
        existing.removeEventListener('load', renderGoogleButton);
      };
    }

    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => renderGoogleButton();
    script.onerror = () => {
      if (!cancelled) {
        setError('Failed to load Google Sign-In. Please refresh and try again.');
      }
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loginWithGoogle]);

  if (isAuthenticated) {
    return <Navigate to="/board" replace />;
  }

  return (
    <div className="login-page">
      <div className="login-card notranslate" translate="no">
        <h1>Arc Todo</h1>
        <p className="subtitle">Sign in with your Google account</p>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p className="status-message" aria-live="polite">
            Signing in...
          </p>
        ) : null}

        {/* Keep GIS mounted after SSO 401. Swapping this node for "Signing in..."
            unmounts the iframe; the effect does not re-run, so the button never returns. */}
        <div
          ref={buttonRef}
          className="google-signin-button"
          aria-busy={loading}
          style={loading ? { pointerEvents: 'none' } : undefined}
        />
      </div>
    </div>
  );
}
