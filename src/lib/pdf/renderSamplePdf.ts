/**
 * Sample-text-driven WH-347 renderer used by the /dev calibration page.
 *
 * Unlike `fillWh347.ts` (which derives strings from a `Project` + `Payroll`
 * and routes through dozens of typed draw calls), this renderer is purely
 * map-driven: it iterates every entry in `buildRegistry()`, resolves the
 * anchor with `applyPatch`, looks up the value in the sample map, and
 * dispatches to the same `drawTextAt` / `drawCheckboxAt` helpers used by
 * production. Anchors absent from the map (or with empty strings / false
 * booleans) are skipped, leaving the underlying PDF untouched.
 *
 * The dev page uses this for the "Render typed sample" preview alongside
 * the existing full-sample render path.
 */

import { PDFDocument, StandardFonts } from "pdf-lib";
import { applyPatch, buildRegistry, type LayoutOverrides } from "./anchorRegistry";
import { drawCheckboxAt, drawTextAt } from "./drawText";
import { loadTemplate } from "./loadTemplate";
import { isEmptySample, type SampleTextMap, type SampleValue } from "./sampleText";

export interface RenderSampleOptions {
  /** Coordinate overrides applied via `applyPatch` per anchor. */
  overrides?: LayoutOverrides;
  /** Draws debug bounding boxes around each drawn anchor. */
  debug?: boolean;
}

export async function renderSamplePdf(
  sample: SampleTextMap,
  options: RenderSampleOptions = {},
): Promise<Blob> {
  const bytes = await loadTemplate();
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pages = pdf.getPages();
  if (pages.length < 1) throw new Error("Template PDF is empty.");

  const registry = buildRegistry();
  const debug = !!options.debug;

  for (const entry of registry) {
    const pageIdx = entry.page - 1;
    const page = pages[pageIdx];
    if (!page) continue;

    const value: SampleValue | undefined = sample[entry.id];
    if (isEmptySample(value)) continue;

    const resolved = applyPatch(
      {
        x: entry.x,
        y: entry.y,
        width: entry.width,
        height: entry.height,
        size: entry.size,
        align: entry.align,
      },
      entry.id,
      options.overrides,
    );

    if (entry.kind === "checkbox") {
      drawCheckboxAt(page, fontBold, resolved, 10, { debug });
    } else {
      const text = typeof value === "string" ? value : "";
      if (text === "") continue;
      drawTextAt(page, font, resolved, text, { debug });
    }
  }

  const out = await pdf.save({ useObjectStreams: true });
  const ab = new ArrayBuffer(out.byteLength);
  new Uint8Array(ab).set(out);
  return new Blob([ab], { type: "application/pdf" });
}
