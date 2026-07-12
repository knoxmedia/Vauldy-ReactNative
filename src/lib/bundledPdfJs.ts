import { PDF_JS_INLINE, PDF_JS_WORKER_B64 } from "./pdfJsInline";

/** Bundled pdf.js source for inline WebView <script> (no ExpoAsset / filesystem). */
export function getBundledPdfJsInline(): string {
  return PDF_JS_INLINE;
}

/** Data URI for pdf.js worker — required even when disableWorker is true. */
export function getBundledPdfJsWorkerSrc(): string {
  return `data:application/javascript;base64,${PDF_JS_WORKER_B64}`;
}
