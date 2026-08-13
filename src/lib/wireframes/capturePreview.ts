export const CAPTURE_REQUEST_TYPE = 'arc-todo:wireframe-capture';
export const CAPTURE_RESULT_TYPE = 'arc-todo:wireframe-capture-result';
export const CAPTURE_BOOTSTRAP_MARKER = 'data-arc-todo-capture="1"';

const CAPTURE_TIMEOUT_MS = 20_000;
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
  requestId: string;
  ok: boolean;
  error?: string;
  pages?: CapturedWireframePage[];
}

/**
 * In-iframe capture (vanilla JS). Keep humanizePageId in sync with pageLabel.ts.
 * Runs under sandbox="allow-scripts" without allow-same-origin.
 */
const CAPTURE_BOOTSTRAP_SOURCE = `(function () {
  var REQUEST = '${CAPTURE_REQUEST_TYPE}';
  var RESULT = '${CAPTURE_RESULT_TYPE}';
  var MAX_W = ${MAX_WIDTH_PX};
  var QUALITY = ${JPEG_QUALITY};

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
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { resolve(); });
      });
    });
  }

  function rasterize(node) {
    var size = nodeSize(node);
    var clone = node.cloneNode(true);
    clone.querySelectorAll('script').forEach(function (el) { el.remove(); });
    var bg = window.getComputedStyle(document.body).backgroundColor || '#e8e8e8';
    var wrap = document.createElement('div');
    wrap.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    wrap.style.cssText = 'width:' + size.width + 'px;height:' + size.height + 'px;margin:0;background:' + bg + ';';
    var styleEl = document.createElement('style');
    styleEl.textContent = collectStyles();
    wrap.appendChild(styleEl);
    wrap.appendChild(clone);
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + size.width + '" height="' + size.height + '">' +
      '<foreignObject width="100%" height="100%">' + wrap.outerHTML + '</foreignObject></svg>';
    var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        try {
          var scale = Math.min(1, MAX_W / size.width);
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(size.width * scale));
          canvas.height = Math.max(1, Math.round(size.height * scale));
          var ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error('Canvas is unavailable.'));
            return;
          }
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          var dataURL = canvas.toDataURL('image/jpeg', QUALITY);
          URL.revokeObjectURL(url);
          resolve({
            dataURL: dataURL,
            width: canvas.width,
            height: canvas.height
          });
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
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
})();`;

export function withCaptureBootstrap(html: string): string {
  if (html.includes(CAPTURE_BOOTSTRAP_MARKER)) return html;
  const script = `<script ${CAPTURE_BOOTSTRAP_MARKER}>\n${CAPTURE_BOOTSTRAP_SOURCE}\n</script>`;
  const closeBody = html.lastIndexOf('</body>');
  if (closeBody !== -1) {
    return `${html.slice(0, closeBody)}${script}${html.slice(closeBody)}`;
  }
  return `${html}${script}`;
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

    function onMessage(event: MessageEvent) {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data as CaptureResultMessage | null;
      if (!data || data.type !== CAPTURE_RESULT_TYPE || data.requestId !== requestId) {
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
    iframe.addEventListener('load', () => {
      iframe.contentWindow?.postMessage(
        { type: CAPTURE_REQUEST_TYPE, requestId },
        '*',
      );
    });
    document.body.appendChild(iframe);
    iframe.srcdoc = withCaptureBootstrap(html);
  });
}
