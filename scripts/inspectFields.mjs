#!/usr/bin/env node
/**
 * One-time inspector: loads the official WH-347 PDF, enumerates its AcroForm
 * fields, and writes a JSON map to public/wh347.fields.json. Run with:
 *
 *   node scripts/inspectFields.mjs
 *
 * If the PDF has no AcroForm fields, the JSON will contain an empty array and
 * we will fall back to coordinate-drawing in src/lib/pdf/fillWh347.ts.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PDF_PATH = join(ROOT, "public", "wh347.pdf");
const OUT_PATH = join(ROOT, "public", "wh347.fields.json");

function fieldType(field) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFRadioGroup) return "radio";
  return "unknown";
}

function fieldGeometry(field) {
  try {
    const widgets = field.acroField.getWidgets();
    if (widgets.length === 0) return null;
    return widgets.map((w) => {
      const r = w.getRectangle();
      const page = w.P();
      return {
        page: page ? page.toString() : null,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      };
    });
  } catch {
    return null;
  }
}

async function main() {
  const bytes = await readFile(PDF_PATH);
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  const fields = form.getFields();

  const pageCount = pdf.getPageCount();
  const result = {
    pdfPath: "public/wh347.pdf",
    pdfPageCount: pageCount,
    pdfPageSizes: pdf.getPages().map((p) => ({
      width: p.getWidth(),
      height: p.getHeight(),
    })),
    fieldCount: fields.length,
    fields: fields.map((f) => ({
      name: f.getName(),
      type: fieldType(f),
      widgets: fieldGeometry(f),
    })),
  };

  await writeFile(OUT_PATH, JSON.stringify(result, null, 2) + "\n");

  console.log(`PDF pages: ${pageCount}`);
  console.log(`Fields found: ${fields.length}`);
  if (fields.length > 0) {
    const byType = result.fields.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {});
    console.log("By type:", byType);
    console.log("First 10 names:");
    for (const f of result.fields.slice(0, 10)) {
      console.log(`  - ${f.name} (${f.type})`);
    }
  } else {
    console.log("No AcroForm fields detected. Plan to use coordinate-drawing fallback.");
  }
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
