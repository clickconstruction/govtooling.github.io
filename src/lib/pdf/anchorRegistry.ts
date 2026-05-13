/**
 * Flat registry of every drawable position on the WH-347 form, derived from
 * the typed constants in `wh347Layout.ts`. Each `RegisteredAnchor` has a
 * stable string ID like `HEADER_P1.projectName` or `ROW_X.netPay@row=3`.
 *
 * The fill logic (`fillWh347.ts`) and the dev calibration page both use this
 * registry so they stay in sync. `LayoutOverrides` is a sparse map keyed by
 * the same IDs; `resolveAnchor` merges row-specific override > shared
 * override > base constant.
 */

import {
  ACK_P2,
  APPRENTICE_CHECK_ROW_Y,
  APPRENTICE_ROW_Y,
  APPRENTICE_X,
  EMAIL_ANCHOR,
  PHONE_DIGIT_WIDTH,
  PHONE_DIGIT_X,
  PHONE_DIGIT_Y,
  BLOCK_OT_DY,
  DAY_CELL_WIDTH,
  DAY_HEADER_DATE_CELL_WIDTH,
  DAY_HEADER_DATE_Y,
  DAY_HEADER_LETTER_Y,
  DAY_X_CENTERS,
  EMPLOYEE_ROW_ST_Y,
  FRINGE_NAME_X,
  FRINGE_ROW_DY,
  FRINGE_ROW_Y_FIRST,
  HEADER_P1,
  HEADER_P2,
  ROW_X,
  ROW_X_RATE_OF_PAY_Y_OFFSET,
  SIGNATURE_BLOCK,
  WH347_PAGE,
  type Anchor,
} from "./wh347Layout";

export type AnchorKind = "text" | "checkbox";
export type AnchorAlign = "left" | "center" | "right";

export interface RegisteredAnchor {
  /** Stable identifier, e.g. "HEADER_P1.projectName", "ROW_X.netPay@row=3". */
  id: string;
  /** Group prefix (the part before the dot), used by the export. */
  group: string;
  /** Leaf key within the group (e.g. "projectName", "netPay"). */
  key: string;
  page: 1 | 2;
  kind: AnchorKind;
  x: number;
  y: number;
  width: number;
  height: number;
  align?: AnchorAlign;
  size?: number;
  /** Set when the anchor instance is templated by row index. */
  rowIndex?: number;
  /** Human-readable label for the inspector. */
  label: string;
}

/** Sparse override map. Each value is a partial `{x,y,width,height}` patch. */
export type AnchorPatch = Partial<Pick<RegisteredAnchor, "x" | "y" | "width" | "height">>;
export type LayoutOverrides = Record<string, AnchorPatch>;

const DEFAULT_TEXT_HEIGHT = 12;
const DEFAULT_CHECK_SIZE = 10;

function row1ForRow(yBase: number): { stY: number; otY: number; idY: number } {
  const stY = yBase;
  const otY = yBase - BLOCK_OT_DY;
  // idY is the vertical center used by fillWh347 when drawing once per block.
  const idY = (stY + otY) / 2 - 2;
  return { stY, otY, idY };
}

/** Build the complete list of registered anchors from the base layout. */
export function buildRegistry(): RegisteredAnchor[] {
  const out: RegisteredAnchor[] = [];

  // ---- Page 1 header ----
  push(out, {
    id: "HEADER_P1.finalSubmissionCheck",
    group: "HEADER_P1",
    key: "finalSubmissionCheck",
    page: 1,
    kind: "checkbox",
    label: "Final submission",
    ...HEADER_P1.finalSubmissionCheck,
  });
  push(out, {
    id: "HEADER_P1.primeContractorCheck",
    group: "HEADER_P1",
    key: "primeContractorCheck",
    page: 1,
    kind: "checkbox",
    label: "Prime contractor",
    ...HEADER_P1.primeContractorCheck,
  });
  push(out, {
    id: "HEADER_P1.subcontractorCheck",
    group: "HEADER_P1",
    key: "subcontractorCheck",
    page: 1,
    kind: "checkbox",
    label: "Subcontractor",
    ...HEADER_P1.subcontractorCheck,
  });
  for (const [key, a] of Object.entries(HEADER_P1) as [keyof typeof HEADER_P1, Anchor][]) {
    if (key === "finalSubmissionCheck" || key === "primeContractorCheck" || key === "subcontractorCheck")
      continue;
    push(out, {
      id: `HEADER_P1.${key}`,
      group: "HEADER_P1",
      key,
      page: 1,
      kind: "text",
      label: humanize(key),
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height ?? DEFAULT_TEXT_HEIGHT,
      align: a.align,
      size: a.size,
    });
  }

  // ---- Page 1 per-row fields (ROW_X x EMPLOYEE_ROW_ST_Y) ----
  EMPLOYEE_ROW_ST_Y.forEach((yBase, rowIndex) => {
    const { stY, otY, idY } = row1ForRow(yBase);
    for (const [key, base] of Object.entries(ROW_X) as [
      keyof typeof ROW_X,
      { x: number; width: number; align?: AnchorAlign },
    ][]) {
      // Per fillWh347.ts: tax/fica/etc/net/status columns draw once at idY;
      // rateOfPay (column 6A) sits ~6pt higher than the rest of the money
      // row, closer to the ST baseline; totalHours draws at stY and OT at otY
      // (handled by DAY rows for hours). All ROW_X cells are text now -
      // the J/RA cells used to be checkboxes but were converted to "J"/"RA"
      // text labels.
      const y =
        key === "totalHours"
          ? stY
          : key === "rateOfPay"
            ? idY + ROW_X_RATE_OF_PAY_Y_OFFSET
            : idY;
      push(out, {
        id: `ROW_X.${key}@row=${rowIndex}`,
        group: "ROW_X",
        key,
        page: 1,
        kind: "text",
        label: `Row ${rowIndex + 1}: ${humanize(key)}`,
        x: base.x,
        y,
        width: base.width,
        height: 10,
        align: base.align,
        size: 8,
        rowIndex,
      });
    }
    // OT totalHours sub-row.
    push(out, {
      id: `ROW_X.totalHoursOT@row=${rowIndex}`,
      group: "ROW_X",
      key: "totalHoursOT",
      page: 1,
      kind: "text",
      label: `Row ${rowIndex + 1}: total OT hours`,
      x: ROW_X.totalHours.x,
      y: otY,
      width: ROW_X.totalHours.width,
      height: 10,
      align: ROW_X.totalHours.align,
      size: 8,
      rowIndex,
    });
  });

  // ---- Day-of-week hour cells (DAY_X_CENTERS x 8 rows x ST/OT) ----
  EMPLOYEE_ROW_ST_Y.forEach((yBase, rowIndex) => {
    const { stY, otY } = row1ForRow(yBase);
    DAY_X_CENTERS.forEach((cx, dayIndex) => {
      push(out, {
        id: `DAY_X.st@row=${rowIndex}&day=${dayIndex}`,
        group: "DAY_X",
        key: `st@day=${dayIndex}`,
        page: 1,
        kind: "text",
        label: `Row ${rowIndex + 1}: ST day ${dayIndex + 1}`,
        x: cx - DAY_CELL_WIDTH / 2,
        y: stY,
        width: DAY_CELL_WIDTH,
        height: 10,
        align: "center",
        size: 8,
        rowIndex,
      });
      push(out, {
        id: `DAY_X.ot@row=${rowIndex}&day=${dayIndex}`,
        group: "DAY_X",
        key: `ot@day=${dayIndex}`,
        page: 1,
        kind: "text",
        label: `Row ${rowIndex + 1}: OT day ${dayIndex + 1}`,
        x: cx - DAY_CELL_WIDTH / 2,
        y: otY,
        width: DAY_CELL_WIDTH,
        height: 10,
        align: "center",
        size: 8,
        rowIndex,
      });
    });
  });

  // ---- Day-of-week + date header row (above DAY_X cells) ----
  // Drawn once per page (not per employee); shares x positions with DAY_X but
  // sits at its own y baselines. Date cells are wider than hour cells so
  // "MM/dd" doesn't overflow.
  DAY_X_CENTERS.forEach((cx, dayIndex) => {
    push(out, {
      id: `DAY_HEADER.letter@day=${dayIndex}`,
      group: "DAY_HEADER",
      key: `letter@day=${dayIndex}`,
      page: 1,
      kind: "text",
      label: `Day-of-week letter ${dayIndex + 1}`,
      x: cx - DAY_CELL_WIDTH / 2,
      y: DAY_HEADER_LETTER_Y,
      width: DAY_CELL_WIDTH,
      height: 10,
      align: "center",
      size: 8,
    });
    push(out, {
      id: `DAY_HEADER.date@day=${dayIndex}`,
      group: "DAY_HEADER",
      key: `date@day=${dayIndex}`,
      page: 1,
      kind: "text",
      label: `Date ${dayIndex + 1} (M/ + dd)`,
      x: cx - DAY_HEADER_DATE_CELL_WIDTH / 2,
      y: DAY_HEADER_DATE_Y,
      width: DAY_HEADER_DATE_CELL_WIDTH,
      // Taller box covers both stacked lines visually on /dev. The bottom
      // line ("dd") sits DAY_HEADER_DATE_LINE_DY pt below the top baseline
      // and is not separately registered (Option A: single-anchor).
      height: 15,
      align: "center",
      size: 8,
    });
  });

  // ---- Page 2 header ----
  for (const [key, a] of Object.entries(HEADER_P2) as [keyof typeof HEADER_P2, Anchor][]) {
    push(out, {
      id: `HEADER_P2.${key}`,
      group: "HEADER_P2",
      key,
      page: 2,
      kind: "text",
      label: humanize(key),
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height ?? DEFAULT_TEXT_HEIGHT,
      align: a.align,
      size: a.size,
    });
  }

  // ---- Page 2 acknowledgement checkboxes (5 statements, driven by ACK_P2) ----
  const ackLabels = [
    "Ack 1: payroll accurate",
    "Ack 2: records will be provided",
    "Ack 3: classifications correct",
    "Ack 4: apprentices registered",
    "Ack 5: fringe benefits paid",
    "Ack 6: workers paid full wages",
  ];
  (Object.entries(ACK_P2) as [keyof typeof ACK_P2, (typeof ACK_P2)[keyof typeof ACK_P2]][]).forEach(
    ([key, anchor], i) => {
      push(out, {
        id: `ACK_P2.${key}`,
        group: "ACK_P2",
        key,
        page: 2,
        kind: "checkbox",
        label: ackLabels[i] ?? `Ack ${i + 1}`,
        x: anchor.x,
        y: anchor.y,
        width: anchor.width,
        height: anchor.height,
      });
    },
  );

  // ---- Page 2 apprenticeship rows (APPRENTICE_X x APPRENTICE_ROW_Y) ----
  APPRENTICE_ROW_Y.forEach((y, rowIndex) => {
    push(out, {
      id: `APPRENTICE.programName@row=${rowIndex}`,
      group: "APPRENTICE",
      key: "programName",
      page: 2,
      kind: "text",
      label: `Apprentice row ${rowIndex + 1}: program name`,
      x: APPRENTICE_X.programName.x,
      y,
      width: APPRENTICE_X.programName.width,
      height: 10,
      align: "left",
      size: 9,
      rowIndex,
    });
    push(out, {
      id: `APPRENTICE.classification@row=${rowIndex}`,
      group: "APPRENTICE",
      key: "classification",
      page: 2,
      kind: "text",
      label: `Apprentice row ${rowIndex + 1}: classification`,
      x: APPRENTICE_X.classification.x,
      y,
      width: APPRENTICE_X.classification.width,
      height: 10,
      align: "left",
      size: 9,
      rowIndex,
    });
    // APPRENTICE checkboxes use their own per-row y baseline (APPRENTICE_CHECK_ROW_Y),
    // which calibration showed sits slightly above the text baseline and has
    // non-uniform inter-row spacing, so they can't share APPRENTICE_ROW_Y.
    const checkY = APPRENTICE_CHECK_ROW_Y[rowIndex] ?? y;
    push(out, {
      id: `APPRENTICE.oaCheck@row=${rowIndex}`,
      group: "APPRENTICE",
      key: "oaCheck",
      page: 2,
      kind: "checkbox",
      label: `Apprentice row ${rowIndex + 1}: OA`,
      x: APPRENTICE_X.oaCheck.x,
      y: checkY,
      width: APPRENTICE_X.oaCheck.width,
      height: 8,
      rowIndex,
    });
    push(out, {
      id: `APPRENTICE.saaCheck@row=${rowIndex}`,
      group: "APPRENTICE",
      key: "saaCheck",
      page: 2,
      kind: "checkbox",
      label: `Apprentice row ${rowIndex + 1}: SAA`,
      x: APPRENTICE_X.saaCheck.x,
      y: checkY,
      width: APPRENTICE_X.saaCheck.width,
      height: 8,
      rowIndex,
    });
  });

  // ---- Page 2 fringe rows (up to 8 worker rows, name column only for now) ----
  for (let rowIndex = 0; rowIndex < WH347_PAGE.rowsPerPage; rowIndex++) {
    push(out, {
      id: `FRINGE.name@row=${rowIndex}`,
      group: "FRINGE",
      key: "name",
      page: 2,
      kind: "text",
      label: `Fringe row ${rowIndex + 1}: worker name`,
      x: FRINGE_NAME_X.x,
      y: FRINGE_ROW_Y_FIRST - rowIndex * FRINGE_ROW_DY,
      width: FRINGE_NAME_X.width,
      height: 10,
      align: FRINGE_NAME_X.align,
      size: 9,
      rowIndex,
    });
  }

  // ---- Page 2 signature block ----
  for (const [key, a] of Object.entries(SIGNATURE_BLOCK) as [keyof typeof SIGNATURE_BLOCK, Anchor][]) {
    push(out, {
      id: `SIGNATURE_BLOCK.${key}`,
      group: "SIGNATURE_BLOCK",
      key,
      page: 2,
      kind: "text",
      label: humanize(key),
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height ?? DEFAULT_TEXT_HEIGHT,
      align: a.align,
      size: a.size,
    });
  }

  // ---- Page 2 phone digits (10 individually-calibratable boxes) ----
  PHONE_DIGIT_X.forEach((x, digit) => {
    push(out, {
      id: `SIGNATURE_BLOCK.phone@digit=${digit}`,
      group: "SIGNATURE_BLOCK",
      key: `phone@digit=${digit}`,
      page: 2,
      kind: "text",
      label: `Phone digit ${digit + 1}`,
      x,
      y: PHONE_DIGIT_Y[digit] ?? PHONE_DIGIT_Y[0],
      width: PHONE_DIGIT_WIDTH,
      height: 12,
      align: "center",
      size: 9,
    });
  });

  // ---- Page 2 email address ----
  push(out, {
    id: "SIGNATURE_BLOCK.email",
    group: "SIGNATURE_BLOCK",
    key: "email",
    page: 2,
    kind: "text",
    label: "Email address",
    x: EMAIL_ANCHOR.x,
    y: EMAIL_ANCHOR.y,
    width: EMAIL_ANCHOR.width,
    height: EMAIL_ANCHOR.height ?? DEFAULT_TEXT_HEIGHT,
    align: EMAIL_ANCHOR.align,
    size: EMAIL_ANCHOR.size,
  });

  return out;
}

function push(list: RegisteredAnchor[], a: Omit<RegisteredAnchor, "height"> & { height?: number }) {
  list.push({
    ...a,
    height:
      a.height ??
      (a.kind === "checkbox" ? DEFAULT_CHECK_SIZE : DEFAULT_TEXT_HEIGHT),
  });
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/**
 * Apply override patches in priority order: row-specific > shared (group.key) > base.
 * `id` is the row-specific (or fully-qualified) ID. The shared key is derived by
 * stripping the `@row=...` suffix.
 *
 * Important: for row-templated anchors, the shared override only contributes
 * `x` and `width`. `y` and `height` are inherently row-specific (different
 * employee rows are at different Y baselines) and must never be replaced by
 * a shared value, even if one is present (e.g. from older localStorage data
 * written before the scope-writer was fixed).
 */
export function applyPatch<T extends { x: number; y: number; width: number; height?: number }>(
  base: T,
  id: string,
  overrides: LayoutOverrides | undefined,
): T {
  if (!overrides) return base;
  const sharedId = stripRowSuffix(id);
  const isRowTemplated = sharedId !== id;
  const sharedPatch = isRowTemplated ? overrides[sharedId] : undefined;
  const rowPatch = overrides[id];
  const merged: T = { ...base };
  if (sharedPatch) {
    if (sharedPatch.x != null) merged.x = sharedPatch.x;
    if (sharedPatch.width != null) merged.width = sharedPatch.width;
    if (!isRowTemplated) {
      // Non-templated anchors (e.g. HEADER_P1.projectName) keep y/height too.
      if (sharedPatch.y != null) merged.y = sharedPatch.y;
      if (sharedPatch.height != null) merged.height = sharedPatch.height;
    }
  }
  if (rowPatch) {
    if (rowPatch.x != null) merged.x = rowPatch.x;
    if (rowPatch.y != null) merged.y = rowPatch.y;
    if (rowPatch.width != null) merged.width = rowPatch.width;
    if (rowPatch.height != null) merged.height = rowPatch.height;
  }
  return merged;
}

/**
 * Strip only the `@row=N` segment from an anchor id, preserving any sibling
 * parameters such as `&day=N`. This is how we derive the "shared" key for
 * the row-templated overlays:
 *
 *   `ROW_X.netPay@row=3`         -> `ROW_X.netPay`
 *   `DAY_X.st@row=0&day=6`       -> `DAY_X.st@day=6`
 *   `APPRENTICE.programName@row=2` -> `APPRENTICE.programName`
 *   `HEADER_P1.projectName`      -> `HEADER_P1.projectName` (unchanged)
 */
export function stripRowSuffix(id: string): string {
  return id.replace(/@row=\d+(&|$)/, (_m, sep) => (sep === "&" ? "@" : ""));
}

/** Resolve a single anchor, returning the merged coordinates. */
export function resolveAnchor<T extends Anchor>(
  id: string,
  base: T,
  overrides?: LayoutOverrides,
): T {
  return applyPatch(base, id, overrides);
}

/** Convenience: build a per-row anchor id for a given group/key + row index. */
export function rowId(group: string, key: string, rowIndex: number): string {
  return `${group}.${key}@row=${rowIndex}`;
}

/** Convenience: build a per-row+day anchor id (DAY_X). */
export function dayId(kind: "st" | "ot", rowIndex: number, dayIndex: number): string {
  return `DAY_X.${kind}@row=${rowIndex}&day=${dayIndex}`;
}
