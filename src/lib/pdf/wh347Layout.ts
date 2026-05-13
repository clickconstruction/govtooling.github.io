/**
 * Layout constants for the WH-347 (Rev. January 2025) PDF.
 *
 * Source PDF: public/wh347.pdf (downloaded from
 * https://www.dol.gov/sites/dolgov/files/WHD/legacy/files/wh347.pdf).
 *
 * The official PDF has NO AcroForm fields, so we draw text at fixed
 * coordinates. Coordinates were derived from `pdftohtml -xml` analysis at 1.5x
 * scale (PDF page is 792 x 612 points; XML/PNG is 1188 x 918 px).
 *
 * Conversion used: x_pdf = x_xml / 1.5,  y_pdf = 612 - y_xml_top/1.5 - h/1.5
 *
 * If a field appears mispositioned, tweak its `x` / `y` values directly.
 * A `?cal` debug overlay (see fillWh347.ts) draws bounding boxes to help.
 */

export const WH347_PAGE = {
  width: 792,
  height: 612,
  // Number of employee blocks on page 1.
  rowsPerPage: 8,
} as const;

/** A draw target on a PDF page. */
export interface Anchor {
  x: number;
  y: number;
  width: number;
  height?: number;
  align?: "left" | "center" | "right";
  /** Maximum font size; auto-shrinks if text overflows. */
  size?: number;
}

/** Page 1 header field anchors. */
export const HEADER_P1 = {
  finalSubmissionCheck: { x: 41.5, y: 502, width: 10, height: 10 },
  primeContractorCheck: { x: 433, y: 502, width: 10, height: 10 },
  subcontractorCheck: { x: 577, y: 502, width: 10, height: 10 },

  projectName: { x: 44, y: 466, width: 149, height: 12, size: 10, align: "left" } as Anchor,
  projectNo: { x: 197, y: 465.5, width: 143, height: 12.5, size: 10, align: "left" } as Anchor,
  payrollNo: { x: 343, y: 466, width: 96, height: 12, size: 10, align: "left" } as Anchor,
  businessName: { x: 441.5, y: 466, width: 309, height: 11.5, size: 10, align: "left" } as Anchor,

  projectLocation: { x: 44, y: 434, width: 151.5, height: 11.5, size: 10, align: "left" } as Anchor,
  wageDeterminationNo: { x: 196.5, y: 434, width: 142.5, height: 12.5, size: 10, align: "left" } as Anchor,
  weekEndingDate: { x: 343.5, y: 434, width: 96, height: 12.5, size: 10, align: "left" } as Anchor,
  businessAddress: { x: 441, y: 434, width: 309, height: 12.5, size: 10, align: "left" } as Anchor,
} as const;

/**
 * Y baselines for each employee block's ST row. There are 8 blocks per page.
 * The OT row is `BLOCK_OT_DY` points BELOW (smaller y) the ST row.
 */
export const EMPLOYEE_ROW_ST_Y = [320.7, 292.7, 264.7, 236.7, 208, 178.7, 150.7, 123.3];
export const BLOCK_OT_DY = 14;

/**
 * Extra y offset for column (6A) "RATE OF PAY". The other money columns in
 * each employee block (fringe, gross, deductions, net pay) sit at the block's
 * mid-row baseline (`idY = stY - 9`). The rate-of-pay column on the printed
 * WH-347 sits ~6pt higher than that, closer to the ST row. Calibration drags
 * across all 8 rows converged on a uniform +6pt shift, so we model it as a
 * single offset rather than 8 per-row y values.
 */
export const ROW_X_RATE_OF_PAY_Y_OFFSET = 6;

/** X positions for fixed-width per-row fields (excluding day cells). */
export const ROW_X = {
  // (1A) Worker entry no
  entryNo: { x: 43.5, width: 21, align: "center" } as Pick<Anchor, "x" | "width" | "align">,
  // (1B) Worker last name
  lastName: { x: 67, width: 48.5, align: "left" } as Pick<Anchor, "x" | "width" | "align">,
  // (1C) Worker first name
  firstName: { x: 117.5, width: 47.5, align: "left" } as Pick<Anchor, "x" | "width" | "align">,
  // (1D) Worker middle initial
  middleInitial: { x: 167, width: 24, align: "center" } as Pick<Anchor, "x" | "width" | "align">,
  // (1E) Worker identifying number (last 4 SSN)
  identifyingNo: { x: 192.5, width: 28, align: "center" } as Pick<Anchor, "x" | "width" | "align">,
  // (2) Status column - text label "J" (journeyworker) or "RA" (registered apprentice).
  // Anchor key names retain the historical "Check" suffix from when these were
  // X-checkbox cells; they're now text labels. One label drawn per row, never both.
  // Width 12 (vs the original 9) lets "RA" render at full size 8 without auto-shrink;
  // the 12.5pt center-to-center pitch keeps the two sub-cells visually distinct.
  journeyworkerCheck: { x: 224, width: 12, align: "center" } as Pick<Anchor, "x" | "width" | "align">,
  apprenticeCheck: { x: 236.5, width: 12, align: "center" } as Pick<Anchor, "x" | "width" | "align">,
  // (3) Labor classification
  classification: { x: 257, width: 43.5, align: "left" } as Pick<Anchor, "x" | "width" | "align">,
  // (5) Total hours
  totalHours: { x: 436, width: 17, align: "right" } as Pick<Anchor, "x" | "width" | "align">,
  // (6A) Hourly wage rate paid for ST and OT
  rateOfPay: { x: 468.5, width: 26, align: "right" } as Pick<Anchor, "x" | "width" | "align">,
  // (6B) Total fringe benefit credit
  fringeCredit: { x: 500, width: 23.5, align: "right" } as Pick<Anchor, "x" | "width" | "align">,
  // (6C) Payment in lieu of fringe benefits
  paymentInLieu: { x: 525, width: 24.5, align: "right" } as Pick<Anchor, "x" | "width" | "align">,
  // (7A) Gross amount earned (this project)
  grossThisProject: { x: 552, width: 24.5, align: "right" } as Pick<Anchor, "x" | "width" | "align">,
  // (7B) Gross amount earned (all work)
  grossAllWork: { x: 578.5, width: 25, align: "right" } as Pick<Anchor, "x" | "width" | "align">,
  // (8) Deductions
  taxWithholdings: { x: 606, width: 24.5, align: "right" } as Pick<Anchor, "x" | "width" | "align">,
  fica: { x: 632.5, width: 25.5, align: "right" } as Pick<Anchor, "x" | "width" | "align">,
  otherDeductions: { x: 660, width: 28, align: "right" } as Pick<Anchor, "x" | "width" | "align">,
  totalDeductions: { x: 691, width: 21, align: "right" } as Pick<Anchor, "x" | "width" | "align">,
  // (9) Net pay to worker for all work
  netPay: { x: 715, width: 35, align: "right" } as Pick<Anchor, "x" | "width" | "align">,
} as const;

/**
 * X positions for the 7 day cells under column (4) "Days of Work Week / Hours
 * Worked Each Day". Hours per day are split into two rows: ST (top) and OT
 * (bottom). The same x positions apply to both rows.
 */
export const DAY_X_CENTERS = [348.25, 362, 374, 386.5, 398.75, 410.75, 424] as const;
export const DAY_CELL_WIDTH = 10;

/**
 * Header sub-rows above the 7 day-of-week hour cells under column (4). The
 * official WH-347 ships these cells blank so contractors can fill in the day
 * letter ("(TOP) DAYS OF WORK WEEK", e.g. S M T W T F S) and the date
 * ("(BOTTOM) DATES") for each weekday they're reporting. Both rows are
 * drawn once per page (not per employee) and reuse the same x positions as
 * `DAY_X_CENTERS`.
 *
 * The date cell is rendered as a TWO-LINE STACK so each line stays large
 * enough to read in the narrow ~12pt column:
 *   line 1 (top):    e.g. "2/"  (month + slash, no leading zero)
 *   line 2 (bottom): e.g. "22"  (zero-padded day)
 *
 * Calibration on /dev.html nudges only the top line via the
 * `DAY_HEADER.date@day=N` anchor. The bottom line follows at a fixed offset
 * of `DAY_HEADER_DATE_LINE_DY` PDF points below the top line's baseline.
 *
 * Y values were derived from the form's XML extraction:
 *   - "(BOTTOM) DATES" label baseline ≈ y 390 (top of the empty fillable area)
 *   - "HOURS WORKED EACH DAY" label top line ≈ y 342 (bottom of the area)
 * The two stacked lines sit centered at roughly y ≈ 370 / 363 by default;
 * fine-tune via /dev.html.
 *
 * Date cell width matches the day-column pitch (~12.5pt). Each line is only
 * 2-3 chars wide, so size-8 text fits comfortably without auto-shrink.
 */
export const DAY_HEADER_LETTER_Y = 380;
export const DAY_HEADER_DATE_Y = 370;
export const DAY_HEADER_DATE_LINE_DY = 7;
export const DAY_HEADER_DATE_CELL_WIDTH = 12;

/** Page 2 (Statement of Compliance + Apprenticeship + Fringe Credit) anchors. */
export const HEADER_P2 = {
  projectName: { x: 35.5, y: 552, width: 200, height: 12, size: 10, align: "left" } as Anchor,
  projectNo: { x: 240.5, y: 552, width: 134.5, height: 12, size: 10, align: "left" } as Anchor,
  payrollNo: { x: 379.5, y: 552.5, width: 90, height: 12, size: 10, align: "left" } as Anchor,
  businessName: { x: 475, y: 551, width: 300, height: 12, size: 10, align: "left" } as Anchor,

  projectLocation: { x: 33.5, y: 519.5, width: 340.5, height: 12, size: 10, align: "left" } as Anchor,
  weekEndingDate: { x: 379, y: 520.5, width: 90, height: 12, size: 10, align: "left" } as Anchor,
  certifyingOfficial: { x: 475.5, y: 520, width: 300, height: 12, size: 10, align: "left" } as Anchor,
} as const;

/**
 * Acknowledgement checkboxes on page 2 (6 statements above/around the signature
 * block). Each checkbox draws an "X" when the corresponding `acknowledgements.*`
 * flag in `StatementOfCompliance` is true.
 */
export const ACK_P2 = {
  ack1: { x: 39.5, y: 479, width: 9, height: 9 },
  ack2: { x: 39.5, y: 448.5, width: 9, height: 9 },
  ack3: { x: 40, y: 428, width: 9, height: 9 },
  ack4: { x: 39.5, y: 404.5, width: 9, height: 9 },
  ack5: { x: 39.5, y: 319.5, width: 9, height: 9 },
  ack6: { x: 39.5, y: 132, width: 9, height: 9 },
} as const;

/** Apprenticeship rows on page 2. */
export const APPRENTICE_ROW_Y = [364, 352, 340];
/**
 * Per-row baselines for the OA / SAA checkboxes. Calibration on /dev showed
 * the checkbox baselines sit slightly above the text baselines and the
 * inter-row spacing is non-uniform, so the checkboxes can't share
 * `APPRENTICE_ROW_Y`.
 */
export const APPRENTICE_CHECK_ROW_Y = [364.5, 353.5, 342];
export const APPRENTICE_X = {
  programName: { x: 56.5, width: 319.5 } as { x: number; width: number },
  oaCheck: { x: 385, width: 10 } as { x: number; width: number },
  saaCheck: { x: 434.5, width: 10 } as { x: number; width: number },
  classification: { x: 474.5, width: 283.5 } as { x: number; width: number },
};

/**
 * Fringe-benefit credit rows on page 2 (one per worker, max 8 to match page 1).
 * Each row has a name, then up to 6 (FB NAME / FB TYPE / FB NUMBER) + funded/unfunded
 * checkboxes, then a total. Implementation can be extended later.
 */
export const FRINGE_NAME_X = { x: 53.5, width: 90, align: "left" } as Pick<
  Anchor,
  "x" | "width" | "align"
>;
export const FRINGE_ROW_Y_FIRST = 229; // y of first fringe row baseline
export const FRINGE_ROW_DY = 11.5; // row pitch (8 rows fit between 229 and 148.5)

/** Signature block on page 2. */
export const SIGNATURE_BLOCK = {
  remarks: { x: 35, y: 90, width: 670, height: 12, size: 10, align: "left" } as Anchor,
  signature: { x: 33, y: 59, width: 99, height: 12.5, size: 16, align: "left" } as Anchor,
  printedName: { x: 135.5, y: 59, width: 105.5, height: 12.5, size: 10, align: "left" } as Anchor,
  title: { x: 245, y: 59, width: 130, height: 12, size: 10, align: "left" } as Anchor,
  date: { x: 380, y: 59, width: 90.5, height: 12.5, size: 10, align: "left" } as Anchor,
};

/**
 * 10 phone-digit anchors next to the signature line. Each digit is its own
 * anchor so it can be calibrated independently via /dev (the WH-347 form
 * places each digit in its own little box, so a single shared anchor would
 * not land them correctly). `PHONE_DIGIT_Y` is per-digit because the printed
 * baselines don't always line up perfectly across all 10 boxes.
 */
export const PHONE_DIGIT_X = [
  483, 492.5, 502.5, 522, 532, 541.5, 559, 569, 578, 588,
];
export const PHONE_DIGIT_Y = [
  61.5, 61.5, 61.5, 61.5, 61.5, 61.5, 61.5, 61.5, 61.5, 61.5,
];
export const PHONE_DIGIT_WIDTH = 7;

/** Email address slot on the signature line. */
export const EMAIL_ANCHOR = {
  x: 618,
  y: 59.5,
  width: 130,
  height: 12,
  size: 9,
  align: "left",
} as Anchor;
