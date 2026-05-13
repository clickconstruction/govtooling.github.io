#!/usr/bin/env node
/**
 * Renders a sample WH-347 PDF using a Node-side mirror of the drawing logic in
 * src/lib/pdf/fillWh347.ts. This exists so we can iterate on coordinate
 * calibration without needing a dev server. Outputs scripts/cal/sample.pdf.
 *
 * To preview: open scripts/cal/sample.pdf or run:
 *    pdftoppm -r 144 -png scripts/cal/sample.pdf scripts/cal/sample
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PDF_IN = join(ROOT, "public", "wh347.pdf");
const PDF_OUT = join(ROOT, "scripts", "cal", "sample.pdf");

// Mirror of src/lib/pdf/wh347Layout.ts (keep in sync).
const HEADER_P1 = {
  finalSubmissionCheck: { x: 40.7, y: 501 },
  primeContractorCheck: { x: 432, y: 501 },
  subcontractorCheck: { x: 576, y: 501 },
  projectName: { x: 50, y: 472, width: 150, size: 10 },
  projectNo: { x: 205, y: 472, width: 140, size: 10 },
  payrollNo: { x: 350, y: 472, width: 90, size: 10 },
  businessName: { x: 448, y: 472, width: 320, size: 10 },
  projectLocation: { x: 50, y: 441, width: 150, size: 10 },
  wageDeterminationNo: { x: 205, y: 441, width: 140, size: 10 },
  weekEndingDate: { x: 350, y: 441, width: 90, size: 10 },
  businessAddress: { x: 448, y: 441, width: 320, size: 10 },
};

const EMPLOYEE_ROW_ST_Y = [320.7, 292.7, 264.7, 236.7, 208, 178.7, 150.7, 123.3];
const BLOCK_OT_DY = 14;

const ROW_X = {
  entryNo: { x: 60, width: 30, align: "center" },
  lastName: { x: 95, width: 50, align: "left" },
  firstName: { x: 148, width: 35, align: "left" },
  middleInitial: { x: 185, width: 20, align: "center" },
  identifyingNo: { x: 207, width: 30, align: "center" },
  journeyworkerCheck: { x: 237 },
  apprenticeCheck: { x: 250 },
  classification: { x: 268, width: 53, align: "left" },
  totalHours: { x: 433, width: 17, align: "right" },
  rateOfPay: { x: 467, width: 26, align: "right" },
  fringeCredit: { x: 494, width: 26, align: "right" },
  paymentInLieu: { x: 521, width: 26, align: "right" },
  grossThisProject: { x: 548, width: 26, align: "right" },
  grossAllWork: { x: 575, width: 27, align: "right" },
  taxWithholdings: { x: 605, width: 26, align: "right" },
  fica: { x: 633, width: 26, align: "right" },
  otherDeductions: { x: 660, width: 26, align: "right" },
  totalDeductions: { x: 690, width: 26, align: "right" },
  netPay: { x: 720, width: 35, align: "right" },
};

const DAY_X_CENTERS = [365, 376, 387, 398, 409, 420, 431];
const DAY_CELL_WIDTH = 10;

function drawText(page, font, text, a) {
  if (text == null || text === "") return;
  let size = a.size ?? 9;
  let w = font.widthOfTextAtSize(text, size);
  while (w > a.width && size > 5) {
    size -= 0.5;
    w = font.widthOfTextAtSize(text, size);
  }
  let x = a.x;
  if (a.align === "center") x = a.x + (a.width - w) / 2;
  else if (a.align === "right") x = a.x + a.width - w;
  page.drawText(text, { x, y: a.y, size, font, color: rgb(0, 0, 0) });
}

function drawX(page, fontBold, x, y, size = 10) {
  page.drawText("X", { x, y, size, font: fontBold, color: rgb(0, 0, 0) });
}

const sample = {
  project: {
    label: "Sample I-72 project",
    contractor: {
      name: "Northwind Construction LLC",
      address: "123 Industrial Way, Springfield, IL 62704",
      role: "prime",
    },
    project: {
      name: "I-72 Bridge Rehabilitation",
      location: "Springfield, IL",
      projectNo: "FHWA-72-2026-014",
      wageDeterminationNo: "IL20240001 mod 5",
    },
    employees: [
      {
        lastName: "Hernandez",
        firstName: "Maria",
        middleInitial: "L",
        identifyingNo: "4823",
        status: "journeyworker",
        classification: "Carpenter",
      },
      {
        lastName: "Robinson",
        firstName: "Daniel",
        middleInitial: "K",
        identifyingNo: "7741",
        status: "journeyworker",
        classification: "Electrician",
      },
      {
        lastName: "Patel",
        firstName: "Anika",
        middleInitial: "",
        identifyingNo: "1029",
        status: "apprentice",
        classification: "Carpenter App. P2",
      },
    ],
  },
  week: {
    payrollNo: 1,
    weekEnding: "11/15/2026",
    isFinal: false,
    entries: [
      {
        days: [
          { st: 0, ot: 0 },
          { st: 8, ot: 0 },
          { st: 8, ot: 0 },
          { st: 8, ot: 0 },
          { st: 8, ot: 0 },
          { st: 8, ot: 4 },
          { st: 0, ot: 0 },
        ],
        rate: 38.5,
        fringe: 12.3,
        cash: 0,
        gross: 1771,
        grossAll: 1771,
        fed: 230,
        fica: 135.49,
        other: 0,
        totalDed: 365.49,
        net: 1405.51,
      },
      {
        days: [
          { st: 0, ot: 0 },
          { st: 8, ot: 0 },
          { st: 8, ot: 0 },
          { st: 8, ot: 0 },
          { st: 8, ot: 0 },
          { st: 6, ot: 0 },
          { st: 0, ot: 0 },
        ],
        rate: 42.0,
        fringe: 14.0,
        cash: 0,
        gross: 1596,
        grossAll: 1596,
        fed: 207,
        fica: 122.09,
        other: 0,
        totalDed: 329.09,
        net: 1266.91,
      },
      {
        days: [
          { st: 0, ot: 0 },
          { st: 6, ot: 0 },
          { st: 6, ot: 0 },
          { st: 6, ot: 0 },
          { st: 6, ot: 0 },
          { st: 6, ot: 0 },
          { st: 0, ot: 0 },
        ],
        rate: 24.5,
        fringe: 7.5,
        cash: 0,
        gross: 735,
        grossAll: 735,
        fed: 95,
        fica: 56.23,
        other: 0,
        totalDed: 151.23,
        net: 583.77,
      },
    ],
  },
};

async function main() {
  const bytes = await readFile(PDF_IN);
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [p1] = pdf.getPages();

  // Header checkboxes
  if (sample.week.isFinal) drawX(p1, fontBold, HEADER_P1.finalSubmissionCheck.x, HEADER_P1.finalSubmissionCheck.y);
  if (sample.project.contractor.role === "prime") {
    drawX(p1, fontBold, HEADER_P1.primeContractorCheck.x, HEADER_P1.primeContractorCheck.y);
  } else {
    drawX(p1, fontBold, HEADER_P1.subcontractorCheck.x, HEADER_P1.subcontractorCheck.y);
  }

  drawText(p1, font, sample.project.project.name, HEADER_P1.projectName);
  drawText(p1, font, sample.project.project.projectNo, HEADER_P1.projectNo);
  drawText(p1, font, String(sample.week.payrollNo), HEADER_P1.payrollNo);
  drawText(p1, font, sample.project.contractor.name, HEADER_P1.businessName);
  drawText(p1, font, sample.project.project.location, HEADER_P1.projectLocation);
  drawText(p1, font, sample.project.project.wageDeterminationNo, HEADER_P1.wageDeterminationNo);
  drawText(p1, font, sample.week.weekEnding, HEADER_P1.weekEndingDate);
  drawText(p1, font, sample.project.contractor.address, HEADER_P1.businessAddress);

  sample.project.employees.forEach((emp, i) => {
    const entry = sample.week.entries[i];
    const stY = EMPLOYEE_ROW_ST_Y[i];
    if (stY == null) return;
    const otY = stY - BLOCK_OT_DY;
    const idY = (stY + otY) / 2 - 2;

    drawText(p1, font, String(i + 1), { ...ROW_X.entryNo, y: idY, size: 9 });
    drawText(p1, font, emp.lastName, { ...ROW_X.lastName, y: idY, size: 8 });
    drawText(p1, font, emp.firstName, { ...ROW_X.firstName, y: idY, size: 8 });
    drawText(p1, font, (emp.middleInitial || "").slice(0, 1), {
      ...ROW_X.middleInitial,
      y: idY,
      size: 9,
    });
    drawText(p1, font, emp.identifyingNo, { ...ROW_X.identifyingNo, y: idY, size: 9 });

    if (emp.status === "journeyworker") drawX(p1, fontBold, ROW_X.journeyworkerCheck.x, idY - 1, 8);
    else drawX(p1, fontBold, ROW_X.apprenticeCheck.x, idY - 1, 8);

    drawText(p1, font, emp.classification, { ...ROW_X.classification, y: idY, size: 7.5 });

    entry.days.forEach((d, j) => {
      const cx = DAY_X_CENTERS[j];
      if (cx == null) return;
      const a = { x: cx - DAY_CELL_WIDTH / 2, width: DAY_CELL_WIDTH, size: 8, align: "center" };
      if (d.st) drawText(p1, font, String(d.st), { ...a, y: stY });
      if (d.ot) drawText(p1, font, String(d.ot), { ...a, y: otY });
    });

    const stTot = entry.days.reduce((s, d) => s + d.st, 0);
    const otTot = entry.days.reduce((s, d) => s + d.ot, 0);
    drawText(p1, font, String(stTot), { ...ROW_X.totalHours, y: stY, size: 8 });
    if (otTot > 0) drawText(p1, font, String(otTot), { ...ROW_X.totalHours, y: otY, size: 8 });

    drawText(p1, font, entry.rate.toFixed(2), { ...ROW_X.rateOfPay, y: idY, size: 8 });
    drawText(p1, font, entry.fringe.toFixed(2), { ...ROW_X.fringeCredit, y: idY, size: 8 });
    if (entry.cash) drawText(p1, font, entry.cash.toFixed(2), { ...ROW_X.paymentInLieu, y: idY, size: 8 });
    drawText(p1, font, entry.gross.toFixed(2), { ...ROW_X.grossThisProject, y: idY, size: 8 });
    drawText(p1, font, entry.grossAll.toFixed(2), { ...ROW_X.grossAllWork, y: idY, size: 8 });
    drawText(p1, font, entry.fed.toFixed(2), { ...ROW_X.taxWithholdings, y: idY, size: 8 });
    drawText(p1, font, entry.fica.toFixed(2), { ...ROW_X.fica, y: idY, size: 8 });
    if (entry.other) drawText(p1, font, entry.other.toFixed(2), { ...ROW_X.otherDeductions, y: idY, size: 8 });
    drawText(p1, font, entry.totalDed.toFixed(2), { ...ROW_X.totalDeductions, y: idY, size: 8 });
    drawText(p1, font, entry.net.toFixed(2), { ...ROW_X.netPay, y: idY, size: 8 });
  });

  const out = await pdf.save();
  await writeFile(PDF_OUT, out);
  console.log(`Wrote ${PDF_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
