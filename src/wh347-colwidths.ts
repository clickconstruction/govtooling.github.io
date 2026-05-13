/**
 * Payroll table: 25 physical columns; percentages sum to 100.
 *
 * (1D)/(1E) slightly wider for labels; funded by seven day cols.
 */
export const PAYROLL_COL_PCT = [
  2.5, 5.2, 5.2, 2.85, 3.55, 4.5, 8.1, // (1A)–(3)
  3.26, 3.26, 3.26, 3.26, 3.26, 3.26, 3.24, // seven days (4)
  3.85, 5.6, 4, 4.5, 3.85, 3.85, // (5)–(7B)
  3.25, 3.25, 3.25, 3.25, // (8) deductions
  6.65, // (9)
] as const;
