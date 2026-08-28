import { Link } from 'react-router-dom';
import { BrowserExtensionDownload } from '../components/BrowserExtensionDownload';

export function DownloadPage() {
  return (
    <div className="page-shell download-page">
      <header className="page-header">
        <h2>Download</h2>
        <p className="page-subtitle">
          Get the Arc Todo browser extension for Chrome, Edge, or Firefox.
        </p>
      </header>
      <BrowserExtensionDownload />
      <section
        className="extension-lab-entry"
        aria-labelledby="extension-lab-entry-heading"
      >
        <h3 id="extension-lab-entry-heading">Evidence lab</h3>
        <p className="extension-download-lede">
          A dedicated tab that throws console errors and failed requests so you
          can check that the extension attaches them as QA evidence.
        </p>
        <div className="extension-download-actions">
          <Link className="btn btn-secondary" to="/download/extension-lab">
            Open evidence lab
          </Link>
        </div>
      </section>
    </div>
  );
}
