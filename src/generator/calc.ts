import { addDays, format, parseISO } from "date-fns";
import type {
  DayHours,
  EmployeeEntry,
  EmployeeProfile,
  Payroll,
  Project,
} from "../types/payroll";
import { makeEmptyEntry, makeEmptyPayroll } from "../lib/factory";
import {
  DAY_KEYS,
  type DayKey,
  type LedgerWorker,
  type Transaction,
  type WeekDays,
  makeEmptyDays,
} from "./storage";

/** Round a number to the nearest 0.25. */
const round025 = (n: number): number => Math.round(n * 4) / 4;
const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface Workweek {
  /** ISO yyyy-mm-dd of the Monday that starts the workweek. */
  monday: string;
  /** ISO yyyy-mm-dd of the Friday that ends the workweek. */
  friday: string;
  /** ISO yyyy-mm-dd of the Saturday after Friday. Used as Payroll.weekEnding. */
  saturday: string;
}

/**
 * Given a check date, return the Mon-Fri workweek ending on or before it.
 *
 * - Friday check covers the same Mon-Fri.
 * - Sat or Sun check covers the week that just ended.
 * - Mon-Thu check covers the previous Mon-Fri (the most recent completed
 *   workweek).
 *
 * `getDay()`: Sun=0, Mon=1, ..., Sat=6. Friday=5.
 * Days back to the most recent Friday on or before `date`:
 *   Fri (5) -> 0; Sat (6) -> 1; Sun (0) -> 2; Mon (1) -> 3; ...; Thu (4) -> 6.
 * Closed form: (dow + 2) % 7.
 */
export function workweekFor(dateISO: string): Workweek {
  const d = parseISO(dateISO);
  const dow = d.getDay();
  const daysBackToFriday = (dow + 2) % 7;
  const friday = addDays(d, -daysBackToFriday);
  const monday = addDays(friday, -4);
  const saturday = addDays(friday, 1);
  return {
    monday: format(monday, "yyyy-MM-dd"),
    friday: format(friday, "yyyy-MM-dd"),
    saturday: format(saturday, "yyyy-MM-dd"),
  };
}

/**
 * Distribute a paycheck amount across Mon-Fri at a given hourly rate.
 *
 * Rule: fill 8 ST per day Mon -> Thu (clamped to remaining), then Friday
 * absorbs the remainder. Anything past 8 hours on Friday becomes OT.
 * Total hours are rounded to the nearest 0.25 before distribution.
 *
 * If `hourlyRate <= 0` returns an all-zero grid.
 */
export function defaultDistribute(amount: number, hourlyRate: number): WeekDays {
  if (!Number.isFinite(amount) || !Number.isFinite(hourlyRate)) return makeEmptyDays();
  if (hourlyRate <= 0 || amount <= 0) return makeEmptyDays();

  const total = round025(amount / hourlyRate);

  const stForDay = (offsetHours: number): number => {
    const left = total - offsetHours;
    if (left <= 0) return 0;
    return round025(Math.min(8, left));
  };

  const monST = stForDay(0);
  const tueST = stForDay(8);
  const wedST = stForDay(16);
  const thuST = stForDay(24);
  const friST = stForDay(32);
  const friOT = round025(Math.max(0, total - 40));

  return {
    mon: { st: monST, ot: 0 },
    tue: { st: tueST, ot: 0 },
    wed: { st: wedST, ot: 0 },
    thu: { st: thuST, ot: 0 },
    fri: { st: friST, ot: friOT },
  };
}

/**
 * Find the employee on `project` that best matches a ledger worker.
 *
 * Tier 1: case-insensitive match on `identifyingNo` (SSN-last4) when both
 *   sides have one populated.
 * Tier 2: case-insensitive exact match on both `lastName` AND `firstName`
 *   (whitespace-trimmed). Both fields must be non-empty.
 *
 * Returns `undefined` when no match is found, signaling that the import
 * flow should create a fresh `EmployeeProfile` from the ledger fields.
 */
export function findMatchingEmployee(
  project: Project,
  worker: LedgerWorker,
): EmployeeProfile | undefined {
  const norm = (s: string) => s.trim().toLowerCase();

  const idNorm = norm(worker.identifyingNo);
  if (idNorm) {
    const m = project.employees.find(
      (e) => e.identifyingNo && norm(e.identifyingNo) === idNorm,
    );
    if (m) return m;
  }

  const lastNorm = norm(worker.lastName);
  const firstNorm = norm(worker.firstName);
  if (lastNorm && firstNorm) {
    const m = project.employees.find(
      (e) => norm(e.lastName) === lastNorm && norm(e.firstName) === firstNorm,
    );
    if (m) return m;
  }

  return undefined;
}

/**
 * Distribute `qTotal` 0.25-hour quanta uniformly at random across 5 buckets,
 * each capped at `capPerBucket`. Returns the per-bucket count in quanta
 * (still integer; caller divides by 4 to convert to hours).
 *
 * Picks a random bucket-still-under-cap and adds 1 quantum at a time, so the
 * result is a uniform sample over all valid distributions. If `qTotal`
 * exceeds `5 * capPerBucket`, the excess is silently dropped (clamped at the
 * total cap).
 */
function spreadQuanta(qTotal: number, capPerBucket = 32): number[] {
  const out = [0, 0, 0, 0, 0];
  let q = Math.max(0, Math.floor(qTotal));
  while (q > 0) {
    const candidates: number[] = [];
    for (let i = 0; i < 5; i++) if (out[i] < capPerBucket) candidates.push(i);
    if (candidates.length === 0) break;
    const i = candidates[Math.floor(Math.random() * candidates.length)];
    out[i] += 1;
    q -= 1;
  }
  return out;
}

/**
 * Like `defaultDistribute`, but spreads ST/OT randomly across Mon-Fri
 * instead of front-loading. Each row's total still equals `amount/hourlyRate`
 * (rounded to 0.25), with realistic per-day caps of 8 ST and 8 OT.
 */
export function randomDistribute(amount: number, hourlyRate: number): WeekDays {
  if (!Number.isFinite(amount) || !Number.isFinite(hourlyRate)) return makeEmptyDays();
  if (hourlyRate <= 0 || amount <= 0) return makeEmptyDays();

  const total = round025(amount / hourlyRate);
  const stTotal = Math.min(total, 40);
  const otTotal = Math.max(0, total - 40);

  const stQuanta = Math.round(stTotal * 4);
  const otQuanta = Math.round(otTotal * 4);

  const st = spreadQuanta(stQuanta).map((q) => q / 4);
  const ot = spreadQuanta(otQuanta).map((q) => q / 4);

  return {
    mon: { st: st[0], ot: ot[0] },
    tue: { st: st[1], ot: ot[1] },
    wed: { st: st[2], ot: ot[2] },
    thu: { st: st[3], ot: ot[3] },
    fri: { st: st[4], ot: ot[4] },
  };
}

/** Sum of all ST and OT hours across Mon-Fri. */
export function totalHours(days: WeekDays): number {
  return round2(
    DAY_KEYS.reduce((sum, k) => sum + (days[k].st || 0) + (days[k].ot || 0), 0),
  );
}

/** Map a `DayKey` to its index in a Sun-Sat 7-day array (weekEnding=Saturday). */
const DAY_KEY_TO_INDEX: Record<DayKey, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
};

/**
 * Apply a single transaction's hours to a project's payroll for that week.
 *
 * - Payroll.weekEnding is the Saturday after Friday so days[1..5] = Mon..Fri.
 * - If a Payroll already exists for that weekEnding, it is reused; otherwise
 *   one is created with the next payroll number.
 * - If the worker's EmployeeEntry already exists in that week, only its
 *   Mon-Fri days and (if rate > 0) rateOfPay are overwritten; fringe and
 *   deductions are preserved. Otherwise a fresh entry is created.
 * - Other workers in the same week are untouched.
 *
 * Returns a new Project; the caller is responsible for persisting it.
 */
export function mergeIntoProject(
  project: Project,
  transactions: Transaction[],
  employeeId: string,
  hourlyRate: number,
): Project {
  let weeks: Payroll[] = project.weeks;

  for (const tx of transactions) {
    const ww = workweekFor(tx.date);
    const weekEnding = ww.saturday;

    const existingIdx = weeks.findIndex((w) => w.weekEnding === weekEnding);

    let week: Payroll;
    if (existingIdx >= 0) {
      week = weeks[existingIdx];
    } else {
      week = makeEmptyPayroll(
        weekEnding,
        project.employees,
        project.prevailingWage ?? 0,
      );
    }

    const entryIdx = week.entries.findIndex((e) => e.employeeId === employeeId);
    const baseEntry: EmployeeEntry =
      entryIdx >= 0
        ? week.entries[entryIdx]
        : makeEmptyEntry(employeeId, weekEnding, project.prevailingWage ?? 0);

    const nextDays: DayHours[] = baseEntry.days.map((d, i) => {
      const dayKey = (Object.keys(DAY_KEY_TO_INDEX) as DayKey[]).find(
        (k) => DAY_KEY_TO_INDEX[k] === i,
      );
      if (!dayKey) {
        return entryIdx >= 0 ? d : { ...d, st: 0, ot: 0 };
      }
      return {
        date: d.date,
        st: round2(tx.days[dayKey].st || 0),
        ot: round2(tx.days[dayKey].ot || 0),
      };
    });

    const nextEntry: EmployeeEntry = {
      ...baseEntry,
      days: nextDays,
      rateOfPay: hourlyRate > 0 ? hourlyRate : baseEntry.rateOfPay,
    };

    const nextEntries =
      entryIdx >= 0
        ? week.entries.map((e, i) => (i === entryIdx ? nextEntry : e))
        : [...week.entries, nextEntry];

    const nextWeek: Payroll = { ...week, entries: nextEntries };

    weeks =
      existingIdx >= 0
        ? weeks.map((w, i) => (i === existingIdx ? nextWeek : w))
        : [...weeks, nextWeek];
  }

  return { ...project, weeks, updatedAt: new Date().toISOString() };
}
