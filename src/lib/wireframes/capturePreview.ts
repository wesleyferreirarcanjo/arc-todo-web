export const CAPTURE_REQUEST_TYPE = 'arc-todo:wireframe-capture';
export const CAPTURE_RESULT_TYPE = 'arc-todo:wireframe-capture-result';
export const CAPTURE_READY_TYPE = 'arc-todo:wireframe-capture-ready';
export const CAPTURE_BOOTSTRAP_MARKER = 'data-arc-todo-capture="1"';

const CAPTURE_TIMEOUT_MS = 20_000;
const PAGE_RASTER_TIMEOUT_MS = 8_000;
const MAX_WIDTH_PX = 1600;
const JPEG_QUALITY = 0.85;

export interface CapturedWireframePage {
  id: string;
  name: string;
  dataURL: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
}

interface CaptureResultMessage {
  type: string;
  requestId?: string;
  ok?: boolean;
  error?: string;
  pages?: CapturedWireframePage[];
}

/**
 * Drop external stylesheet/preconnect tags from the capture copy only.
 * Google Fonts (and similar) block iframe `load` under sandbox without
 * allow-same-origin; prints use the CSS fallback stack instead.
 */
export function stripCaptureExternalResources(html: string): string {
  return html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = /rel\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1]?.toLowerCase() ?? '';
    const href = /href\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? '';
    const externalHref = /^https?:\/\//i.test(href);
    if (
      rel.includes('preconnect') ||
      rel.includes('dns-prefetch') ||
      (rel.includes('stylesheet') && externalHref)
    ) {
      return '';
    }
    return tag;
  });
}

/**
 * In-iframe capture (vanilla JS). Keep humanizePageId in sync with pageLabel.ts.
 * Runs under sandbox="allow-scripts" without allow-same-origin.
 */
const CAPTURE_BOOTSTRAP_SOURCE = `(function () {
  var REQUEST = '${CAPTURE_REQUEST_TYPE}';
  var RESULT = '${CAPTURE_RESULT_TYPE}';
  var READY = '${CAPTURE_READY_TYPE}';
  var MAX_W = ${MAX_WIDTH_PX};
  var QUALITY = ${JPEG_QUALITY};
  var PAGE_TIMEOUT = ${PAGE_RASTER_TIMEOUT_MS};

  function humanizePageId(id) {
    var trimmed = String(id || '').trim() || 'Page';
    var withoutPrefix = trimmed.replace(/^page[-_]?/i, '');
    var spaced = (withoutPrefix || trimmed).replace(/[-_]+/g, ' ').trim();
    if (!spaced) return 'Page';
    return spaced.replace(/\\b\\w/g, function (c) { return c.toUpperCase(); });
  }

  function pageName(section) {
    var named = section.getAttribute('data-page-name') || section.getAttribute('aria-label');
    if (named && named.trim()) return named.trim();
    var heading = section.querySelector('h1, h2, h3');
    if (heading && heading.textContent && heading.textContent.trim()) {
      return heading.textContent.trim();
    }
    return humanizePageId(section.id || 'Page');
  }

  function collectStyles() {
    var parts = [];
    document.querySelectorAll('style').forEach(function (el) {
      parts.push(el.textContent || '');
    });
    return parts.join('\\n');
  }

  function nodeSize(node) {
    var width = Math.max(node.scrollWidth || 0, node.clientWidth || 0, 320);
    var height = Math.max(node.scrollHeight || 0, node.clientHeight || 0, 1);
    return { width: width, height: height };
  }

  function waitFrames() {
    return new Promise(function (resolve) {
      setTimeout(resolve, 32);
    });
  }

  function rasterize(node) {
    var size = nodeSize(node);
    var clone = node.cloneNode(true);
    clone.querySelectorAll('script').forEach(function (el) { el.remove(); });
    var bg = window.getComputedStyle(document.body).backgroundColor || '#e8e8e8';
    var wrap = document.createElement('div');
    wrap.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    var theme = document.documentElement.getAttribute('data-theme');
    if (theme) wrap.setAttribute('data-theme', theme);
    wrap.style.cssText = 'width:' + size.width + 'px;height:' + size.height + 'px;margin:0;background:' + bg + ';';
    var styleEl = document.createElement('style');
    styleEl.textContent = collectStyles();
    wrap.appendChild(styleEl);
    wrap.appendChild(clone);
    var xhtml = new XMLSerializer().serializeToString(wrap);
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + size.width + '" height="' + size.height + '">' +
      '<foreignObject width="100%" height="100%">' + xhtml + '</foreignObject></svg>';
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

    return new Promise(function (resolve, reject) {
      var img = new Image();
      var timer = setTimeout(function () {
        img.onload = img.onerror = null;
        img.src = '';
        reject(new Error('Timed out rasterizing a wireframe page.'));
      }, PAGE_TIMEOUT);
      img.onload = function () {
        clearTimeout(timer);
        try {
          var scale = Math.min(1, MAX_W / size.width);
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(size.width * scale));
          canvas.height = Math.max(1, Math.round(size.height * scale));
          var ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas is unavailable.'));
            return;
          }
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve({
            dataURL: canvas.toDataURL('image/jpeg', QUALITY),
            width: canvas.width,
            height: canvas.height
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = function () {
        clearTimeout(timer);
        reject(new Error('Could not rasterize the wireframe page.'));
      };
      img.src = url;
    });
  }

  function reply(source, requestId, payload) {
    var message = { type: RESULT, requestId: requestId };
    for (var key in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        message[key] = payload[key];
      }
    }
    source.postMessage(message, '*');
  }

  async function captureAll() {
    var pages = Array.prototype.slice.call(
      document.querySelectorAll('section[id^="page-"]')
    );
    var results = [];
    if (pages.length === 0) {
      var bodyShot = await rasterize(document.documentElement);
      results.push({
        id: 'page',
        name: document.title && document.title.trim() ? document.title.trim() : 'Page',
        dataURL: bodyShot.dataURL,
        mimeType: 'image/jpeg',
        width: bodyShot.width,
        height: bodyShot.height
      });
      return results;
    }

    var previous = pages.map(function (el) {
      return el.classList.contains('is-active');
    });
    try {
      for (var i = 0; i < pages.length; i++) {
        pages.forEach(function (el, index) {
          el.classList.toggle('is-active', index === i);
        });
        await waitFrames();
        var shot = await rasterize(pages[i]);
        results.push({
          id: pages[i].id || ('page-' + (i + 1)),
          name: pageName(pages[i]),
          dataURL: shot.dataURL,
          mimeType: 'image/jpeg',
          width: shot.width,
          height: shot.height
        });
      }
    } finally {
      pages.forEach(function (el, index) {
        el.classList.toggle('is-active', previous[index]);
      });
    }
    return results;
  }

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.type !== REQUEST || !data.requestId) return;
    var requestId = data.requestId;
    var source = event.source;
    if (!source) return;
    captureAll().then(function (pages) {
      if (!pages.length) {
        reply(source, requestId, { ok: false, error: 'No wireframe pages to capture.' });
        return;
      }
      reply(source, requestId, { ok: true, pages: pages });
    }).catch(function (err) {
      reply(source, requestId, {
        ok: false,
        error: err && err.message ? err.message : 'Capture failed.'
      });
    });
  });

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: READY }, '*');
  }
})();`;

export function withCaptureBootstrap(html: string): string {
  const stripped = stripCaptureExternalResources(html);
  if (stripped.includes(CAPTURE_BOOTSTRAP_MARKER)) return stripped;
  const script = `<script ${CAPTURE_BOOTSTRAP_MARKER}>\n${CAPTURE_BOOTSTRAP_SOURCE}\n</script>`;
  const closeBody = stripped.lastIndexOf('</body>');
  if (closeBody !== -1) {
    return `${stripped.slice(0, closeBody)}${script}${stripped.slice(closeBody)}`;
  }
  return `${stripped}${script}`;
}

export function captureWireframePages(html: string): Promise<CapturedWireframePage[]> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('title', 'Wireframe capture');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;left:-10000px;top:0;width:1200px;height:800px;opacity:0;pointer-events:none;border:0;';

    let settled = false;
    let requested = false;
    const timeout = window.setTimeout(() => {
      finish();
      reject(new Error('Timed out capturing the wireframe.'));
    }, CAPTURE_TIMEOUT_MS);

    function finish() {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      iframe.remove();
    }

    function requestCapture() {
      if (requested || settled) return;
      requested = true;
      iframe.contentWindow?.postMessage(
        { type: CAPTURE_REQUEST_TYPE, requestId },
        '*',
      );
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data as CaptureResultMessage | null;
      if (!data) return;
      if (data.type === CAPTURE_READY_TYPE) {
        requestCapture();
        return;
      }
      if (data.type !== CAPTURE_RESULT_TYPE || data.requestId !== requestId) {
        return;
      }
      finish();
      if (!data.ok || !data.pages?.length) {
        reject(new Error(data.error || 'Capture failed.'));
        return;
      }
      resolve(data.pages);
    }

    window.addEventListener('message', onMessage);
    // Set srcdoc before insert so the first load is the capture document, not
    // about:blank. Start capture on READY only — a blank-frame load would
    // consume `requested` and never send the real postMessage (#arc-283).
    iframe.srcdoc = withCaptureBootstrap(html);
    document.body.appendChild(iframe);
  });
}
