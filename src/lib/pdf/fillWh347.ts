import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { EmployeeEntry, EmployeeProfile, Payroll, Project } from "../../types/payroll";
import {
  grossAllWork,
  grossThisProject,
  netPay,
  otHours,
  stHours,
  totalDeductions,
  totalOtherDeductions,
} from "../calc";
import {
  ACK_P2,
  APPRENTICE_CHECK_ROW_Y,
  APPRENTICE_ROW_Y,
  APPRENTICE_X,
  BLOCK_OT_DY,
  DAY_CELL_WIDTH,
  DAY_HEADER_DATE_CELL_WIDTH,
  DAY_HEADER_DATE_LINE_DY,
  DAY_HEADER_DATE_Y,
  DAY_HEADER_LETTER_Y,
  DAY_X_CENTERS,
  EMAIL_ANCHOR,
  EMPLOYEE_ROW_ST_Y,
  HEADER_P1,
  HEADER_P2,
  PHONE_DIGIT_WIDTH,
  PHONE_DIGIT_X,
  PHONE_DIGIT_Y,
  ROW_X,
  ROW_X_RATE_OF_PAY_Y_OFFSET,
  SIGNATURE_BLOCK,
  WH347_PAGE,
  type Anchor,
} from "./wh347Layout";
import { applyPatch, dayId, rowId, type LayoutOverrides } from "./anchorRegistry";
import { drawCheckboxAt, drawTextAt } from "./drawText";
import { fmtDate, fmtHours, fmtMoney } from "./formatters";
import { loadSignatureFont } from "./loadSignatureFont";
import { loadTemplate } from "./loadTemplate";
import { displayPayrollNo, weekDaysFor } from "../dates";

interface DrawCtx {
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  /** Cursive script font used only for the signature field. */
  fontScript: PDFFont;
  /** Show debug bounding boxes around each anchor. */
  debug: boolean;
  overrides?: LayoutOverrides;
  /**
   * When true, fringe (6B/6C) and deduction (Tax W/H, FICA, Other, Total)
   * cells are left blank on the PDF and the gross/net math drops the
   * cash-fringe term, matching the editor's "sub mode".
   */
  hideSubColumns: boolean;
}

type DrawAnchor = {
  x: number;
  y: number;
  width: number;
  height?: number;
  size?: number;
  align?: Anchor["align"];
};

interface DrawTextOpts {
  /** Override the default body font. Used for the cursive signature. */
  font?: PDFFont;
}

function drawText(
  ctx: DrawCtx,
  id: string,
  text: string,
  baseAnchor: DrawAnchor,
  opts: DrawTextOpts = {},
) {
  const anchor = applyPatch(baseAnchor, id, ctx.overrides);
  drawTextAt(ctx.page, opts.font ?? ctx.font, anchor, text, { debug: ctx.debug });
}

function drawCheckbox(
  ctx: DrawCtx,
  id: string,
  baseAnchor: { x: number; y: number; width: number; height?: number },
  size = 10,
) {
  const a = applyPatch(baseAnchor, id, ctx.overrides);
  drawCheckboxAt(ctx.page, ctx.fontBold, a, size, { debug: ctx.debug });
}

function drawPage1(ctx: DrawCtx, project: Project, week: Payroll) {
  if (week.isFinal) {
    drawCheckbox(ctx, "HEADER_P1.finalSubmissionCheck", HEADER_P1.finalSubmissionCheck, 10);
  }
  if (project.contractor.role === "prime") {
    drawCheckbox(ctx, "HEADER_P1.primeContractorCheck", HEADER_P1.primeContractorCheck, 10);
  } else {
    drawCheckbox(ctx, "HEADER_P1.subcontractorCheck", HEADER_P1.subcontractorCheck, 10);
  }

  drawText(ctx, "HEADER_P1.projectName", project.project.name, HEADER_P1.projectName);
  drawText(ctx, "HEADER_P1.projectNo", project.project.projectNo, HEADER_P1.projectNo);
  drawText(ctx, "HEADER_P1.payrollNo", displayPayrollNo(week), HEADER_P1.payrollNo);
  drawText(ctx, "HEADER_P1.businessName", project.contractor.name, HEADER_P1.businessName);

  drawText(
    ctx,
    "HEADER_P1.projectLocation",
    project.project.location,
    HEADER_P1.projectLocation,
  );
  drawText(
    ctx,
    "HEADER_P1.wageDeterminationNo",
    project.project.wageDeterminationNo,
    HEADER_P1.wageDeterminationNo,
  );
  drawText(ctx, "HEADER_P1.weekEndingDate", fmtDate(week.weekEnding), HEADER_P1.weekEndingDate);
  drawText(ctx, "HEADER_P1.businessAddress", project.contractor.address, HEADER_P1.businessAddress);

  // Day-of-week letter + MM/dd date headers above the (4) day-hour columns.
  // Driven off `week.weekEnding` directly so empty weeks still render the row.
  const headerDays = weekDaysFor(week.weekEnding);
  headerDays.forEach((d, i) => {
    const cx = DAY_X_CENTERS[i];
    if (cx == null) return;
    drawText(ctx, `DAY_HEADER.letter@day=${i}`, d.letter, {
      x: cx - DAY_CELL_WIDTH / 2,
      y: DAY_HEADER_LETTER_Y,
      width: DAY_CELL_WIDTH,
      size: 8,
      align: "center",
    });
    // Date is rendered as a two-line stack ("M/" over "dd") so each line
    // stays large enough to read in the narrow ~12pt cell. The top line is
    // draggable on /dev via DAY_HEADER.date@day=N; the bottom line follows
    // at a fixed offset (intentionally not registered in anchorRegistry).
    drawText(ctx, `DAY_HEADER.date@day=${i}`, d.monthLine, {
      x: cx - DAY_HEADER_DATE_CELL_WIDTH / 2,
      y: DAY_HEADER_DATE_Y,
      width: DAY_HEADER_DATE_CELL_WIDTH,
      size: 8,
      align: "center",
    });
    drawText(ctx, `DAY_HEADER.dateDay@day=${i}`, d.dayLine, {
      x: cx - DAY_HEADER_DATE_CELL_WIDTH / 2,
      y: DAY_HEADER_DATE_Y - DAY_HEADER_DATE_LINE_DY,
      width: DAY_HEADER_DATE_CELL_WIDTH,
      size: 8,
      align: "center",
    });
  });

  const visibleEntries = week.entries.slice(0, WH347_PAGE.rowsPerPage);
  visibleEntries.forEach((entry, i) => {
    const profile = project.employees.find((e) => e.id === entry.employeeId);
    if (!profile) return;
    drawEmployeeRow(ctx, profile, entry, i);
  });
}

function drawEmployeeRow(
  ctx: DrawCtx,
  emp: EmployeeProfile,
  entry: EmployeeEntry,
  rowIndex: number,
) {
  const stY = EMPLOYEE_ROW_ST_Y[rowIndex];
  if (stY == null) return;
  const otY = stY - BLOCK_OT_DY;
  const idY = (stY + otY) / 2 - 2;

  const rx = (key: string) => rowId("ROW_X", key, rowIndex);

  drawText(ctx, rx("entryNo"), String(rowIndex + 1), {
    ...ROW_X.entryNo,
    y: idY,
    size: 9,
  });
  drawText(ctx, rx("lastName"), emp.lastName, { ...ROW_X.lastName, y: idY, size: 8 });
  drawText(ctx, rx("firstName"), emp.firstName, { ...ROW_X.firstName, y: idY, size: 8 });
  drawText(ctx, rx("middleInitial"), (emp.middleInitial || "").slice(0, 1), {
    ...ROW_X.middleInitial,
    y: idY,
    size: 9,
  });
  drawText(ctx, rx("identifyingNo"), emp.identifyingNo, {
    ...ROW_X.identifyingNo,
    y: idY,
    size: 9,
  });

  // Status column: literal "J" or "RA" text label (replaces former X checkbox).
  if (emp.status === "journeyworker") {
    drawText(ctx, rx("journeyworkerCheck"), "J", {
      ...ROW_X.journeyworkerCheck,
      y: idY,
      size: 8,
    });
  } else {
    drawText(ctx, rx("apprenticeCheck"), "RA", {
      ...ROW_X.apprenticeCheck,
      y: idY,
      size: 8,
    });
  }

  drawText(ctx, rx("classification"), emp.classification, {
    ...ROW_X.classification,
    y: idY,
    size: 7.5,
  });

  entry.days.forEach((d, i) => {
    const cx = DAY_X_CENTERS[i];
    if (cx == null) return;
    const baseDay = {
      x: cx - DAY_CELL_WIDTH / 2,
      width: DAY_CELL_WIDTH,
      size: 5,
      align: "center" as const,
    };
    drawText(ctx, dayId("st", rowIndex, i), fmtHours(d.st), { ...baseDay, y: stY });
    drawText(ctx, dayId("ot", rowIndex, i), fmtHours(d.ot), { ...baseDay, y: otY });
  });

  const numY = idY;
  drawText(ctx, rx("totalHours"), fmtHours(stHours(entry)), {
    ...ROW_X.totalHours,
    y: stY,
    size: 8,
  });
  drawText(ctx, rx("totalHoursOT"), fmtHours(otHours(entry)), {
    ...ROW_X.totalHours,
    y: otY,
    size: 8,
  });

  drawText(ctx, rx("rateOfPay"), fmtMoney(entry.rateOfPay), {
    ...ROW_X.rateOfPay,
    y: numY + ROW_X_RATE_OF_PAY_Y_OFFSET,
    size: 8,
  });
  const calcOpts = { ignoreSubColumns: ctx.hideSubColumns } as const;
  if (!ctx.hideSubColumns) {
    drawText(ctx, rx("fringeCredit"), fmtMoney(entry.fringeCredit), {
      ...ROW_X.fringeCredit,
      y: numY,
      size: 8,
    });
    drawText(ctx, rx("paymentInLieu"), fmtMoney(entry.paymentInLieu), {
      ...ROW_X.paymentInLieu,
      y: numY,
      size: 8,
    });
  }
  drawText(ctx, rx("grossThisProject"), fmtMoney(grossThisProject(entry, calcOpts)), {
    ...ROW_X.grossThisProject,
    y: numY,
    size: 8,
  });
  drawText(ctx, rx("grossAllWork"), fmtMoney(grossAllWork(entry, calcOpts)), {
    ...ROW_X.grossAllWork,
    y: numY,
    size: 8,
  });
  if (!ctx.hideSubColumns) {
    drawText(ctx, rx("taxWithholdings"), fmtMoney(entry.deductions.taxWithholdings), {
      ...ROW_X.taxWithholdings,
      y: numY,
      size: 8,
    });
    drawText(ctx, rx("fica"), fmtMoney(entry.deductions.fica), {
      ...ROW_X.fica,
      y: numY,
      size: 8,
    });
    drawText(ctx, rx("otherDeductions"), fmtMoney(totalOtherDeductions(entry)), {
      ...ROW_X.otherDeductions,
      y: numY,
      size: 8,
    });
    drawText(ctx, rx("totalDeductions"), fmtMoney(totalDeductions(entry)), {
      ...ROW_X.totalDeductions,
      y: numY,
      size: 8,
    });
  }
  drawText(ctx, rx("netPay"), fmtMoney(netPay(entry, calcOpts)), {
    ...ROW_X.netPay,
    y: numY,
    size: 8,
  });
}

function drawPage2(ctx: DrawCtx, project: Project, week: Payroll) {
  drawText(ctx, "HEADER_P2.projectName", project.project.name, HEADER_P2.projectName);
  drawText(ctx, "HEADER_P2.projectNo", project.project.projectNo, HEADER_P2.projectNo);
  drawText(ctx, "HEADER_P2.payrollNo", displayPayrollNo(week), HEADER_P2.payrollNo);
  drawText(ctx, "HEADER_P2.businessName", project.contractor.name, HEADER_P2.businessName);
  drawText(
    ctx,
    "HEADER_P2.projectLocation",
    project.project.location,
    HEADER_P2.projectLocation,
  );
  drawText(ctx, "HEADER_P2.weekEndingDate", fmtDate(week.weekEnding), HEADER_P2.weekEndingDate);
  drawText(
    ctx,
    "HEADER_P2.certifyingOfficial",
    [
      project.defaultCompliance.certifyingOfficialName,
      project.defaultCompliance.certifyingOfficialTitle,
    ]
      .filter(Boolean)
      .join(", "),
    HEADER_P2.certifyingOfficial,
  );

  const acks = project.defaultCompliance.acknowledgements;
  const ackChecked: Record<keyof typeof ACK_P2, boolean> = {
    ack1: acks.payrollIsAccurate,
    ack2: acks.recordsWillBeProvided,
    ack3: acks.classificationsCorrect,
    ack4: acks.apprenticesRegistered,
    ack5: acks.fringeBenefitsPaid,
    ack6: acks.workersPaidFullWages,
  };
  (Object.entries(ACK_P2) as [keyof typeof ACK_P2, (typeof ACK_P2)[keyof typeof ACK_P2]][]).forEach(
    ([key, anchor]) => {
      if (!ackChecked[key]) return;
      drawCheckbox(ctx, `ACK_P2.${key}`, anchor, 9);
    },
  );

  (project.defaultCompliance.apprenticePrograms ?? []).slice(0, 3).forEach((prog, i) => {
    const y = APPRENTICE_ROW_Y[i];
    if (y == null) return;
    const checkY = APPRENTICE_CHECK_ROW_Y[i] ?? y;
    drawText(ctx, `APPRENTICE.programName@row=${i}`, prog.programName, {
      ...APPRENTICE_X.programName,
      y,
      size: 9,
    });
    drawText(ctx, `APPRENTICE.classification@row=${i}`, prog.classification, {
      ...APPRENTICE_X.classification,
      y,
      size: 9,
    });
    if (prog.registeredWith === "OA") {
      drawCheckbox(ctx, `APPRENTICE.oaCheck@row=${i}`, { ...APPRENTICE_X.oaCheck, y: checkY }, 8);
    }
    if (prog.registeredWith === "SAA") {
      drawCheckbox(ctx, `APPRENTICE.saaCheck@row=${i}`, { ...APPRENTICE_X.saaCheck, y: checkY }, 8);
    }
  });

  drawText(ctx, "SIGNATURE_BLOCK.remarks", project.defaultCompliance.remarks, SIGNATURE_BLOCK.remarks);
  drawText(
    ctx,
    "SIGNATURE_BLOCK.signature",
    project.defaultCompliance.certifyingOfficialName,
    SIGNATURE_BLOCK.signature,
    { font: ctx.fontScript },
  );
  drawText(
    ctx,
    "SIGNATURE_BLOCK.printedName",
    project.defaultCompliance.certifyingOfficialName,
    SIGNATURE_BLOCK.printedName,
  );
  drawText(
    ctx,
    "SIGNATURE_BLOCK.title",
    project.defaultCompliance.certifyingOfficialTitle,
    SIGNATURE_BLOCK.title,
  );
  drawText(
    ctx,
    "SIGNATURE_BLOCK.date",
    fmtDate(project.defaultCompliance.signatureDate),
    SIGNATURE_BLOCK.date,
  );

  const phone = (project.defaultCompliance.phoneDigits ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);
  PHONE_DIGIT_X.forEach((x, d) => {
    const ch = phone[d];
    if (!ch) return;
    drawText(ctx, `SIGNATURE_BLOCK.phone@digit=${d}`, ch, {
      x,
      y: PHONE_DIGIT_Y[d] ?? PHONE_DIGIT_Y[0],
      width: PHONE_DIGIT_WIDTH,
      size: 9,
      align: "center",
    });
  });
  drawText(
    ctx,
    "SIGNATURE_BLOCK.email",
    project.defaultCompliance.email ?? "",
    EMAIL_ANCHOR,
  );

  void week;
}

export interface FillOptions {
  /** Draws debug bounding boxes around each anchor. Useful for calibration. */
  debug?: boolean;
  /** Sparse map of anchor-id -> patch, applied at draw time. */
  overrides?: LayoutOverrides;
}

export async function fillWh347(
  project: Project,
  week: Payroll,
  options: FillOptions = {},
): Promise<Blob> {
  const [bytes, scriptFontBytes] = await Promise.all([loadTemplate(), loadSignatureFont()]);
  const pdf = await PDFDocument.load(bytes);
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontScript = await pdf.embedFont(scriptFontBytes, { subset: true });

  const pages = pdf.getPages();
  if (pages.length < 1) throw new Error("Template PDF is empty.");

  const baseCtx = {
    font,
    fontBold,
    fontScript,
    debug: !!options.debug,
    overrides: options.overrides,
    hideSubColumns: !!project.hideSubColumns,
  };

  drawPage1({ ...baseCtx, page: pages[0]! }, project, week);
  if (pages.length >= 2) {
    drawPage2({ ...baseCtx, page: pages[1]! }, project, week);
  }

  const out = await pdf.save({ useObjectStreams: true });
  const ab = new ArrayBuffer(out.byteLength);
  new Uint8Array(ab).set(out);
  return new Blob([ab], { type: "application/pdf" });
}
