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
    </div>
  );
}
