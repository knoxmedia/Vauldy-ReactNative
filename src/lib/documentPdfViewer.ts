export const OFFICE_DOCUMENT_FORMATS = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"]);
export const TEXT_DOCUMENT_FORMATS = new Set(["txt", "md", "mdx", "csv", "html", "htm"]);

export function normalizeDocumentFormat(
  format?: string,
  filePath?: string,
): string {
  const fmt = (format || "").toLowerCase().replace(/^\./, "");
  if (fmt) return fmt;
  const match = (filePath || "").match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

export function isOfficeDocumentFormat(format: string): boolean {
  return OFFICE_DOCUMENT_FORMATS.has(format);
}

function escapeForHtmlJs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/</g, "\\x3c");
}


function pdfViewerShell(pdfJsInline: string, bodyScript: string): string {
  const safeJs = pdfJsInline.replace(/<\/script/gi, "<\\/script");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #1a1a1a;
      touch-action: manipulation;
    }
    #wrap {
      width: 100%;
      height: 100%;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }
    #spacer { position: relative; margin: 0 auto; }
    #stage {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: top left;
    }
    canvas { display: block; }
    #status {
      color: #bbb;
      font: 18px/1.5 sans-serif;
      padding: 24px;
      text-align: center;
    }
  </style>
  <script>${safeJs}</script>
</head>
<body>
  <div id="wrap"><div id="status">Loading document…</div></div>
  <script>${bodyScript}</script>
</body>
</html>`;
}

function pdfViewerRuntime(loadSourceJs: string, initialPage: number, workerSrc: string): string {
  const page = Math.max(1, Math.floor(initialPage));
  const worker = escapeForHtmlJs(workerSrc);
  return `(function () {
      var currentPage = ${page};
      var pdfDoc = null;
      var rendering = false;
      var pendingPage = 0;
      var viewScale = 1;
      var minViewScale = 0.3;
      var maxViewScale = 4;
      var pinchStartDist = 0;
      var pinchStartScale = 1;
      var isPinching = false;
      var touchStartX = 0;
      var touchStartY = 0;
      var lastTapAt = 0;

      function post(msg) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      }

      function resetViewScale() {
        viewScale = 1;
        var wrap = document.getElementById('wrap');
        if (wrap) {
          wrap.scrollLeft = 0;
          wrap.scrollTop = 0;
        }
      }

      function updateStageLayout(canvas) {
        var spacer = document.getElementById('spacer');
        var stage = document.getElementById('stage');
        if (!spacer || !stage || !canvas) return;
        var width = canvas.width;
        var height = canvas.height;
        spacer.style.width = Math.ceil(width * viewScale) + 'px';
        spacer.style.height = Math.ceil(height * viewScale) + 'px';
        stage.style.width = width + 'px';
        stage.style.height = height + 'px';
        stage.style.transform = 'scale(' + viewScale + ')';
      }

      function renderPage(num) {
        if (!pdfDoc) return;
        if (rendering) {
          pendingPage = num;
          return;
        }
        rendering = true;
        resetViewScale();
        pdfDoc.getPage(num).then(function (page) {
          var wrap = document.getElementById('wrap');
          var wrapWidth = (wrap && wrap.clientWidth) || window.innerWidth || 360;
          var baseViewport = page.getViewport({ scale: 1 });
          var fitScale = baseViewport.width > 0 ? wrapWidth / baseViewport.width : 1.35;
          var renderScale = fitScale;
          var viewport = page.getViewport({ scale: renderScale });
          var canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          var spacer = document.createElement('div');
          spacer.id = 'spacer';
          var stage = document.createElement('div');
          stage.id = 'stage';
          stage.appendChild(canvas);
          spacer.appendChild(stage);
          wrap.innerHTML = '';
          wrap.appendChild(spacer);
          updateStageLayout(canvas);
          return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
        }).then(function () {
          currentPage = num;
          rendering = false;
          post({ type: 'page', page: currentPage, pages: pdfDoc.numPages });
          if (pendingPage && pendingPage !== currentPage) {
            var next = pendingPage;
            pendingPage = 0;
            renderPage(next);
          }
        }).catch(function (err) {
          rendering = false;
          document.getElementById('wrap').innerHTML = '<div id="status">Render failed: ' + (err && err.message ? err.message : err) + '</div>';
          post({ type: 'error', message: String(err && err.message ? err.message : err) });
        });
      }

      window.goToPage = function (num) {
        if (!pdfDoc) return;
        var page = Math.max(1, Math.min(pdfDoc.numPages, Number(num) || 1));
        renderPage(page);
      };

      function touchDistance(touches) {
        var dx = touches[0].clientX - touches[1].clientX;
        var dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
      }

      function bindGestures() {
        var minSwipe = 48;
        document.addEventListener('touchstart', function (e) {
          if (!e.touches || !e.touches.length) return;
          if (e.touches.length === 2) {
            isPinching = true;
            pinchStartDist = touchDistance(e.touches);
            pinchStartScale = viewScale;
            e.preventDefault();
            return;
          }
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }, { passive: false });
        document.addEventListener('touchmove', function (e) {
          if (!isPinching || !e.touches || e.touches.length < 2) return;
          var dist = touchDistance(e.touches);
          if (!pinchStartDist) return;
          viewScale = Math.max(minViewScale, Math.min(maxViewScale, pinchStartScale * (dist / pinchStartDist)));
          var canvas = document.querySelector('#stage canvas');
          if (canvas) updateStageLayout(canvas);
          e.preventDefault();
        }, { passive: false });
        document.addEventListener('touchend', function (e) {
          if (e.touches && e.touches.length >= 2) return;
          isPinching = false;
          pinchStartDist = 0;
          if (!pdfDoc) return;
          var t = e.changedTouches && e.changedTouches[0];
          if (!t) return;
          var now = Date.now();
          var dx = t.clientX - touchStartX;
          var dy = t.clientY - touchStartY;
          if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && now - lastTapAt < 300) {
            resetViewScale();
            var canvas = document.querySelector('#stage canvas');
            if (canvas) updateStageLayout(canvas);
            lastTapAt = 0;
            return;
          }
          lastTapAt = now;
          if (viewScale > 1.02) return;
          if (Math.abs(dx) < minSwipe || Math.abs(dx) < Math.abs(dy) * 1.2) return;
          if (dx < 0 && currentPage < pdfDoc.numPages) window.goToPage(currentPage + 1);
          else if (dx > 0 && currentPage > 1) window.goToPage(currentPage - 1);
        }, { passive: true });
      }
      bindGestures();

      function resolvePdfJs() {
        return globalThis.pdfjsLib || globalThis["pdfjs-dist/build/pdf"] || window.pdfjsLib;
      }

      var bootAttempts = 0;
      function boot() {
        var pdfjsLib = resolvePdfJs();
        if (!pdfjsLib) {
          bootAttempts += 1;
          if (bootAttempts > 200) {
            document.getElementById('wrap').innerHTML = '<div id="status">pdf.js failed to load</div>';
            post({ type: 'error', message: 'pdfjsLib is not defined' });
            return;
          }
          setTimeout(boot, 50);
          return;
        }
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '${worker}';
          ${loadSourceJs}
        } catch (err) {
          document.getElementById('wrap').innerHTML = '<div id="status">Viewer failed: ' + err + '</div>';
          post({ type: 'error', message: String(err) });
        }
      }
      boot();
    })();`;
}

/** HTML viewer that renders a PDF with bundled pdf.js inlined in the page. */
export function buildPdfViewerHtmlFromUrl(
  pdfUrl: string,
  pdfJsInline: string,
  pdfWorkerSrc: string,
  initialPage = 1,
): string {
  const url = escapeForHtmlJs(pdfUrl);
  const loadSource = `pdfjsLib.getDocument({ url: '${url}', disableWorker: true }).promise.then(function (doc) {
          pdfDoc = doc;
          var start = Math.max(1, Math.min(doc.numPages, currentPage));
          renderPage(start);
          post({ type: 'ready', page: start, pages: doc.numPages });
        }).catch(function (err) {
          document.getElementById('wrap').innerHTML = '<div id="status">Open failed: ' + (err && err.message ? err.message : err) + '</div>';
          post({ type: 'error', message: String(err && err.message ? err.message : err) });
        });`;
  return pdfViewerShell(pdfJsInline, pdfViewerRuntime(loadSource, initialPage, pdfWorkerSrc));
}

/** Fallback viewer — renders from base64 PDF bytes with bundled pdf.js inlined. */
export function buildPdfViewerHtml(
  base64: string,
  pdfJsInline: string,
  pdfWorkerSrc: string,
  initialPage = 1,
): string {
  const data = escapeForHtmlJs(base64);
  const loadSource = `function base64ToUint8Array(base64) {
          var raw = atob(base64);
          var len = raw.length;
          var bytes = new Uint8Array(len);
          for (var i = 0; i < len; i++) bytes[i] = raw.charCodeAt(i);
          return bytes;
        }
        pdfjsLib.getDocument({ data: base64ToUint8Array('${data}'), disableWorker: true }).promise.then(function (doc) {
          pdfDoc = doc;
          var start = Math.max(1, Math.min(doc.numPages, currentPage));
          renderPage(start);
          post({ type: 'ready', page: start, pages: doc.numPages });
        }).catch(function (err) {
          document.getElementById('wrap').innerHTML = '<div id="status">Open failed: ' + (err && err.message ? err.message : err) + '</div>';
          post({ type: 'error', message: String(err && err.message ? err.message : err) });
        });`;
  return pdfViewerShell(pdfJsInline, pdfViewerRuntime(loadSource, initialPage, pdfWorkerSrc));
}

export function buildTextViewerHtml(text: string, format: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const isHtml = format === "html" || format === "htm";
  const body = isHtml
    ? text
    : `<pre style="white-space:pre-wrap;word-break:break-word;">${escaped}</pre>`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
  <style>
    html, body {
      margin: 0;
      padding: 24px;
      background: #1a1a1a;
      color: #e8e8e8;
      font: 18px/1.6 sans-serif;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }
    pre { margin: 0; font: inherit; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function parseResumePage(position: unknown): number {
  if (typeof position === "number" && position > 0) return Math.floor(position);
  if (typeof position === "string") {
    if (position.startsWith("page:")) {
      const n = parseInt(position.slice(5), 10);
      return Number.isFinite(n) && n > 0 ? n : 1;
    }
    const n = parseInt(position, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  return 1;
}
