import { useEffect, useState } from 'react';
import { userMessage, WEB_ERROR } from '../lib/errors/messages';
import { ErrorAlert } from './ErrorAlert';
import { InstallIcon } from './icons';

const VERSION_HREF = '/extension/version.json';
const CHROMIUM_HREF = '/extension/chromium.zip';
const FIREFOX_HREF = '/extension/firefox.zip';
const FIREFOX_NOTE =
  'No Firefox, abra about:debugging, Este Firefox, Carregar extensão temporária, e escolha o arquivo. A extensão some ao fechar o Firefox até haver uma versão assinada.';

export function BrowserExtensionDownload() {
  const [version, setVersion] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(VERSION_HREF)
      .then((response) => {
        if (!response.ok) {
          throw Object.assign(new Error('Not Found'), { status: response.status });
        }
        return response.json();
      })
      .then((payload: { version?: unknown }) => {
        if (cancelled) return;
        const next = typeof payload?.version === 'string' ? payload.version.trim() : '';
        setVersion(next || null);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setVersion(null);
        setLoadError(
          userMessage(err, WEB_ERROR.LOAD, { thing: 'the extension version' }),
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="extension-download" aria-labelledby="extension-download-heading">
      <h3 id="extension-download-heading">Browser extension</h3>
      {loadError ? (
        <ErrorAlert code={WEB_ERROR.LOAD}>{loadError}</ErrorAlert>
      ) : null}
      {version ? <p className="extension-download-version">Version {version}</p> : null}
      <p className="extension-download-lede">
        Unzip the Chrome/Edge package once, then load the folder at chrome://extensions
        (or edge://extensions): Developer mode → Load unpacked. Later versions: open the
        side panel and use Atualizar (pick that unzipped folder the first time).
      </p>
      <div className="extension-download-actions">
        <a className="btn btn-primary" href={CHROMIUM_HREF} download>
          <InstallIcon />
          Download for Chrome/Edge
        </a>
        <a className="btn btn-secondary" href={FIREFOX_HREF} download>
          <InstallIcon />
          Download for Firefox
        </a>
      </div>
      <p className="extension-download-firefox">{FIREFOX_NOTE}</p>
    </section>
  );
}
