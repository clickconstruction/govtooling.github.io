import { useState } from "react";
import { PdfBackdrop } from "./PdfBackdrop";

/**
 * Renders the dev page's "live filled" PDF via pdfjs-dist rather than the
 * browser's native viewer. The native viewer (PDFium in Chromium) rejects the
 * WH-347 template with "Error code: 5" (FPDF_ERR_SECURITY); pdfjs-dist parses
 * the same bytes without issue.
 */

export interface PdfPreviewProps {
  /** Generated PDF bytes from fillWh347. */
  data: Uint8Array;
  /** CSS pixels per PDF point. */
  scale: number;
}

export function PdfPreview({ data, scale }: PdfPreviewProps) {
  const [page, setPage] = useState<1 | 2>(1);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex rounded-md overflow-hidden border border-slate-700 text-xs">
          <button
            onClick={() => setPage(1)}
            className={`px-2 py-1 ${
              page === 1
                ? "bg-amber-400 text-slate-900 font-semibold"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
          >
            Page 1
          </button>
          <button
            onClick={() => setPage(2)}
            className={`px-2 py-1 border-l border-slate-700 ${
              page === 2
                ? "bg-amber-400 text-slate-900 font-semibold"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
          >
            Page 2
          </button>
        </div>
        <span className="text-[11px] text-slate-400">
          Rendered with pdfjs-dist · bypasses Chromium's PDFium viewer.
        </span>
      </div>
      <PdfBackdrop data={data} page={page} scale={scale} />
    </div>
  );
}
