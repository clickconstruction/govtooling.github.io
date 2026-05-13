import type { EmployeeEntry } from "../types/payroll";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Optional flag used by the WH-347 "sub mode" toggle. When `ignoreSubColumns`
 * is true, fringe and deduction columns (6B, 6C, Tax W/H, FICA, Other) are
 * treated as 0 in the totals so the displayed gross/net figures match what
 * the editor and printed PDF actually show. The underlying entry data is
 * never mutated.
 */
export interface CalcOpts {
  ignoreSubColumns?: boolean;
}

export function stHours(entry: EmployeeEntry): number {
  return round2(entry.days.reduce((sum, d) => sum + (d.st || 0), 0));
}

export function otHours(entry: EmployeeEntry): number {
  return round2(entry.days.reduce((sum, d) => sum + (d.ot || 0), 0));
}

export function totalHours(entry: EmployeeEntry): number {
  return round2(stHours(entry) + otHours(entry));
}

/**
 * Gross amount earned on this project (column 7A).
 *
 * Default rule: ST hours x rate + OT hours x 1.5 x rate + total hours x payment-in-lieu.
 * When `ignoreSubColumns` is true, the cash-fringe (6C) term is dropped.
 * Override is honored when provided and short-circuits the rule.
 */
export function grossThisProject(entry: EmployeeEntry, opts?: CalcOpts): number {
  if (entry.grossThisProjectOverride != null) return round2(entry.grossThisProjectOverride);
  const st = stHours(entry);
  const ot = otHours(entry);
  const cashFringe = opts?.ignoreSubColumns
    ? 0
    : totalHours(entry) * (entry.paymentInLieu || 0);
  return round2(st * entry.rateOfPay + ot * 1.5 * entry.rateOfPay + cashFringe);
}

/**
 * Gross amount earned for all work this week (column 7B).
 * Defaults to the same as 7A if no override is given (i.e., worker only worked on this project).
 */
export function grossAllWork(entry: EmployeeEntry, opts?: CalcOpts): number {
  if (entry.grossAllWorkOverride != null) return round2(entry.grossAllWorkOverride);
  return grossThisProject(entry, opts);
}

export function totalOtherDeductions(entry: EmployeeEntry, opts?: CalcOpts): number {
  if (opts?.ignoreSubColumns) return 0;
  return round2(entry.deductions.other.reduce((sum, d) => sum + (d.amount || 0), 0));
}

export function totalDeductions(entry: EmployeeEntry, opts?: CalcOpts): number {
  if (opts?.ignoreSubColumns) return 0;
  return round2(
    (entry.deductions.taxWithholdings || 0) +
      (entry.deductions.fica || 0) +
      totalOtherDeductions(entry),
  );
}

export function netPay(entry: EmployeeEntry, opts?: CalcOpts): number {
  return round2(grossAllWork(entry, opts) - totalDeductions(entry, opts));
}
