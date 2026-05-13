/**
 * Date helpers shared by the PDF renderer, the dev sample map, and any other
 * consumer that needs to reason about a payroll's 7-day window. Keeping the
 * derivation in one place ensures the day-letter and date-string columns on
 * the WH-347 stay in sync everywhere they're rendered.
 */

import { addDays, format, parseISO } from "date-fns";

export interface WeekDayHeader {
  /** ISO date string (yyyy-mm-dd). */
  iso: string;
  /** Narrow weekday letter, e.g. "S" for Sunday/Saturday, "M" for Monday. */
  letter: string;
  /** MM/dd, zero-padded. Kept for any non-PDF consumer. */
  short: string;
  /** Top line of the stacked date cell, e.g. "2/" (no leading zero). */
  monthLine: string;
  /** Bottom line of the stacked date cell, e.g. "22" (zero-padded). */
  dayLine: string;
}

/**
 * Convert an ISO weekEnding (`yyyy-MM-dd`) into the WH-347 PAYROLL NO. format
 * (`MMddyyyy`). Returns `""` for empty / malformed inputs so callers can fall
 * through to a placeholder instead of rendering "undefinedundefinedundefined".
 *
 * Example: `"2025-03-01"` -> `"03012025"`.
 */
export function derivePayrollNo(weekEnding: string): string {
  if (!weekEnding) return "";
  const [y, m, d] = weekEnding.split("-");
  if (!y || !m || !d) return "";
  return `${m}${d}${y}`;
}

/**
 * Returns the payroll number to display for `week`. If `payrollNo` is a
 * non-empty string, that's the user-customized value. Otherwise (missing,
 * empty, or a legacy `number` from older saved projects) we re-derive from
 * `weekEnding`, which lets old data keep rendering correctly without a
 * storage migration step.
 *
 * `payrollNo` is typed as `unknown` here so this stays safe even when the
 * `Payroll` interface narrows to `string` at compile time.
 */
export function displayPayrollNo(week: { payrollNo: unknown; weekEnding: string }): string {
  if (typeof week.payrollNo === "string" && week.payrollNo.trim() !== "") {
    return week.payrollNo;
  }
  return derivePayrollNo(week.weekEnding);
}

/**
 * Returns the 7 days of the work week ending on `weekEndingISO`, oldest first.
 * The last entry's `iso` matches `weekEndingISO`.
 */
export function weekDaysFor(weekEndingISO: string): WeekDayHeader[] {
  const end = parseISO(weekEndingISO);
  const start = addDays(end, -6);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return {
      iso: format(d, "yyyy-MM-dd"),
      letter: format(d, "EEEEE"),
      short: format(d, "MM/dd"),
      // Concat the slash after format() to avoid date-fns literal-char warnings.
      monthLine: format(d, "M") + "/",
      dayLine: format(d, "dd"),
    };
  });
}
