import { useEffect, useRef, useState } from "react";

/**
 * Renders a single page of a PDF to a `<canvas>` using pdfjs-dist.
 *
 * pdfjs-dist is lazy-imported here so the main app bundle doesn't pay the
 * ~600 KB cost; this component is only used on `/dev.html`.
 *
 * Why the gymnastics:
 *  - `onSize` lives in a ref so a new closure on every parent render doesn't
 *    re-trigger the effect (root cause of the original flicker).
 *  - The loaded `PDFDocumentProxy` is cached at module scope keyed by URL or
 *    a content-hash of the byte payload, so swapping between Page 1 and
 *    Page 2 doesn't re-fetch or re-parse the entire PDF.
 *  - The pdfjs bootstrap (dynamic import + worker setup) is memoized into a
 *    single Promise so it only happens once per page load.
 */

export interface PdfBackdropProps {
  /** Absolute URL of the PDF to load. Mutually exclusive with `data`. */
  url?: string;
  /** Raw PDF bytes. Mutually exclusive with `url`. */
  data?: Uint8Array;
  /** 1-indexed page number. */
  page: number;
  /** Render scale. We use 1.5 (CSS px per PDF pt) to match the layout grid. */
  scale: number;
  /** Optional notification with the resulting canvas pixel size. Held by ref. */
  onSize?: (size: { width: number; height: number }) => void;
}

type Pdfjs = typeof import("pdfjs-dist");
type PdfDoc = Awaited<ReturnType<Pdfjs["getDocument"]>["promise"]>;

let pdfjsLoaderPromise: Promise<Pdfjs> | null = null;
const documentCache = new Map<string, Promise<PdfDoc>>();

function loadPdfjs(): Promise<Pdfjs> {
  if (pdfjsLoaderPromise) return pdfjsLoaderPromise;
  pdfjsLoaderPromise = (async () => {
    const pdfjs = await import("pdfjs-dist");
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    }
    return pdfjs;
  })();
  return pdfjsLoaderPromise;
}

function hashKey(bytes: Uint8Array): string {
  // Cheap stable id: length + hex of first 32 bytes. Enough to dedupe within a session.
  const slice = bytes.subarray(0, Math.min(32, bytes.byteLength));
  let hex = "";
  for (let i = 0; i < slice.length; i++) hex += slice[i]!.toString(16).padStart(2, "0");
  return `bytes:${bytes.byteLength}:${hex}`;
}

function getDocument(pdfjs: Pdfjs, key: string, src: { url?: string; data?: Uint8Array }): Promise<PdfDoc> {
  const cached = documentCache.get(key);
  if (cached) return cached;
  // The WH-347 template ships with TrueType fonts whose glyph programs CALL
  // function ids that aren't declared in the `fpgm` table (e.g. ids 21, 136).
  // pdf.js sanitizes them harmlessly but logs a noisy warning per call. Drop
  // verbosity to ERRORS-only so the console stays usable; real errors still
  // surface via the promise rejection path.
  const verbosity = pdfjs.VerbosityLevel.ERRORS;
  const promise = (async () => {
    if (src.data) {
      // pdfjs mutates the passed buffer; hand it a copy so React StrictMode
      // double-invokes don't see a detached ArrayBuffer.
      const copy = new Uint8Array(src.data.byteLength);
      copy.set(src.data);
      return pdfjs.getDocument({ data: copy, verbosity }).promise;
    }
    return pdfjs.getDocument({ url: src.url!, verbosity }).promise;
  })().catch((e) => {
    // Don't pollute the cache with a rejected promise.
    documentCache.delete(key);
    throw e;
  });
  documentCache.set(key, promise);
  return promise;
}

export function PdfBackdrop({ url, data, page, scale, onSize }: PdfBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  // Hold the latest onSize without re-triggering the render effect.
  const onSizeRef = useRef(onSize);
  useEffect(() => {
    onSizeRef.current = onSize;
  }, [onSize]);

  // Stable cache key for the source. `data` consumers should pass a stable
  // Uint8Array reference; otherwise the hash falls back to identity by content.
  const dataKey = data ? hashKey(data) : undefined;
  const sourceKey = url ?? dataKey ?? "";

  useEffect(() => {
    if (!sourceKey) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        if (cancelled) return;
        const doc = await getDocument(pdfjs, sourceKey, { url, data });
        if (cancelled) return;

        if (page > doc.numPages || page < 1) {
          throw new Error(`PDF has ${doc.numPages} page(s); requested page ${page}.`);
        }

        const pdfPage = await doc.getPage(page);
        if (cancelled) return;

        const viewport = pdfPage.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to acquire 2D canvas context.");

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        renderTask = pdfPage.render({ canvas, canvasContext: ctx, viewport });
        await renderTask.promise;
        if (cancelled) return;

        setStatus("ready");
        onSizeRef.current?.({ width: viewport.width, height: viewport.height });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof Error && e.name === "RenderingCancelledException") return;
        setStatus("error");
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        /* noop */
      }
    };
  }, [sourceKey, page, scale, url, data]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="block bg-white shadow-lg ring-1 ring-slate-700"
        aria-label={`PDF page ${page}`}
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300 pointer-events-none">
          Loading page {page}…
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-sm text-rose-300">
          Failed to render PDF: {error}
        </div>
      )}
    </div>
  );
}
