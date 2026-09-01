import { useEffect, useState } from 'react';
import { InstallIcon } from './icons';

const VERSION_HREF = '/extension/version.json';
const CHROMIUM_HREF = '/extension/chromium.zip';
const FIREFOX_HREF = '/extension/firefox.zip';
const FIREFOX_NOTE =
  'No Firefox, abra about:debugging, Este Firefox, Carregar extensão temporária, e escolha o arquivo. A extensão some ao fechar o Firefox até haver uma versão assinada.';

export function BrowserExtensionDownload() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(VERSION_HREF)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { version?: unknown } | null) => {
        if (cancelled) return;
        const next = typeof payload?.version === 'string' ? payload.version.trim() : '';
        setVersion(next || null);
      })
      .catch(() => {
        if (!cancelled) setVersion(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="extension-download" aria-labelledby="extension-download-heading">
      <h3 id="extension-download-heading">Browser extension</h3>
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
