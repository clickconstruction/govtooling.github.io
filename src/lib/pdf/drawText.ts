/**
 * Low-level draw helpers shared by `fillWh347.ts` and `renderSamplePdf.ts`.
 *
 * These work on already-resolved anchor coordinates (post-`applyPatch`) so
 * callers stay decoupled from the override merge logic. Both the production
 * renderer and the dev sample-text renderer route through these helpers,
 * keeping their visual output byte-identical for the same input string.
 */

import { rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AnchorAlign } from "./anchorRegistry";

export interface ResolvedAnchorLike {
  x: number;
  y: number;
  width: number;
  height?: number;
  align?: AnchorAlign;
  size?: number;
}

export interface DrawTextOptions {
  /** Show a debug bounding box around the drawn anchor. */
  debug?: boolean;
}

/**
 * Draw a string at a resolved anchor. Auto-shrinks the font size down to a
 * minimum of 5pt to fit `anchor.width`. Default size is 9pt when unspecified.
 *
 * Empty / nullish text is a no-op (except for the optional debug box).
 */
export function drawTextAt(
  page: PDFPage,
  font: PDFFont,
  anchor: ResolvedAnchorLike,
  text: string | null | undefined,
  options: DrawTextOptions = {},
): void {
  if (text == null || text === "") {
    if (options.debug) drawDebugBox(page, anchor.x, anchor.y, anchor.width, anchor.size ?? 9);
    return;
  }
  let size = anchor.size ?? 9;
  let textWidth = font.widthOfTextAtSize(text, size);
  while (textWidth > anchor.width && size > 5) {
    size -= 0.5;
    textWidth = font.widthOfTextAtSize(text, size);
  }
  let x = anchor.x;
  if (anchor.align === "center") x = anchor.x + (anchor.width - textWidth) / 2;
  else if (anchor.align === "right") x = anchor.x + anchor.width - textWidth;
  page.drawText(text, { x, y: anchor.y, size, font, color: rgb(0, 0, 0) });
  if (options.debug) drawDebugBox(page, anchor.x, anchor.y, anchor.width, size);
}

/**
 * Draw an "X" glyph at a resolved checkbox anchor. The `size` parameter
 * controls the glyph point size; defaults to 10pt.
 */
export function drawCheckboxAt(
  page: PDFPage,
  fontBold: PDFFont,
  anchor: ResolvedAnchorLike,
  size = 10,
  options: DrawTextOptions = {},
): void {
  page.drawText("X", {
    x: anchor.x,
    y: anchor.y,
    size,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  if (options.debug) drawDebugBox(page, anchor.x, anchor.y, anchor.width, size);
}

function drawDebugBox(page: PDFPage, x: number, y: number, width: number, height: number) {
  page.drawRectangle({
    x,
    y: y - 2,
    width,
    height: Math.max(height, 8),
    borderColor: rgb(0.95, 0.2, 0.4),
    borderWidth: 0.4,
    opacity: 0,
    borderOpacity: 0.6,
  });
}
