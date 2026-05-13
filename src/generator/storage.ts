import { nanoid } from "nanoid";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri";

export interface DayCell {
  st: number;
  ot: number;
}

export type WeekDays = Record<DayKey, DayCell>;

export interface Transaction {
  id: string;
  /** ISO yyyy-mm-dd of the check / payout. */
  date: string;
  /** Dollars paid out on `date`. */
  amount: number;
  /**
   * Mon-Fri hours grid. Auto-filled when the row is created or
   * recomputed; user edits persist as-is. This is the source of truth
   * once the row exists - the import path reads `days`, not `amount`.
   */
  days: WeekDays;
}

/**
 * Mirrors EmployeeProfile from src/types/payroll.ts (minus `id` and
 * `entryNo`). Captured here so the Generator can fully populate a worker
 * on the destination project at import time.
 */
export interface LedgerWorker {
  /** Column 1B */
  lastName: string;
  /** Column 1C */
  firstName: string;
  /** Column 1D */
  middleInitial: string;
  /** Column 1E - last 4 of SSN or another unique identifier. */
  identifyingNo: string;
  /** Column 2 */
  status: "journeyworker" | "apprentice";
  /** Column 3 - e.g. "Carpenter", "Electrician (Apprentice 1st period)". */
  classification: string;
}

export interface Ledger {
  id: string;
  worker: LedgerWorker;
  hourlyRate: number;
  transactions: Transaction[];
  createdAt: string;
  updatedAt: string;
}

export type SchemaVersion = 1 | 2;

export interface GeneratorWorkspace {
  schemaVersion: 2;
  ledgers: Ledger[];
}

const STORAGE_KEY = "generator:v1";

const emptyWorkspace = (): GeneratorWorkspace => ({
  schemaVersion: 2,
  ledgers: [],
});

/**
 * Legacy v1 ledger had a single `workerName` string. Migrate it to a
 * structured `worker` by splitting on the first whitespace: first token
 * becomes firstName, the rest becomes lastName. The user can correct any
 * field in the new UI.
 */
function migrateLegacyLedger(raw: unknown): Ledger | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;

  let worker: LedgerWorker;
  if (r.worker && typeof r.worker === "object") {
    const w = r.worker as Partial<LedgerWorker>;
    worker = {
      ...makeEmptyWorker(),
      lastName: typeof w.lastName === "string" ? w.lastName : "",
      firstName: typeof w.firstName === "string" ? w.firstName : "",
      middleInitial: typeof w.middleInitial === "string" ? w.middleInitial : "",
      identifyingNo: typeof w.identifyingNo === "string" ? w.identifyingNo : "",
      status:
        w.status === "apprentice" || w.status === "journeyworker"
          ? w.status
          : "journeyworker",
      classification:
        typeof w.classification === "string" ? w.classification : "",
    };
  } else if (typeof r.workerName === "string") {
    const parts = r.workerName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts.shift() ?? "";
    const lastName = parts.join(" ");
    worker = { ...makeEmptyWorker(), firstName, lastName };
  } else {
    worker = makeEmptyWorker();
  }

  return {
    id: r.id,
    worker,
    hourlyRate: typeof r.hourlyRate === "number" ? r.hourlyRate : 0,
    transactions: Array.isArray(r.transactions)
      ? (r.transactions as Transaction[])
      : [],
    createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

export function loadGenerator(): GeneratorWorkspace {
  if (typeof window === "undefined") return emptyWorkspace();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyWorkspace();
    const parsed = JSON.parse(raw) as
      | {
          schemaVersion?: SchemaVersion;
          ledgers?: unknown[];
        }
      | undefined;
    if (!parsed || typeof parsed !== "object") return emptyWorkspace();
    if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) {
      return emptyWorkspace();
    }
    const rawLedgers = Array.isArray(parsed.ledgers) ? parsed.ledgers : [];
    const ledgers = rawLedgers
      .map((l) => migrateLegacyLedger(l))
      .filter((l): l is Ledger => l !== null);
    return { schemaVersion: 2, ledgers };
  } catch (err) {
    console.warn("Failed to load generator workspace:", err);
    return emptyWorkspace();
  }
}

export function saveGenerator(ws: GeneratorWorkspace): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
  } catch (err) {
    console.warn("Failed to save generator workspace:", err);
  }
}

export function makeEmptyDays(): WeekDays {
  return {
    mon: { st: 0, ot: 0 },
    tue: { st: 0, ot: 0 },
    wed: { st: 0, ot: 0 },
    thu: { st: 0, ot: 0 },
    fri: { st: 0, ot: 0 },
  };
}

export function makeEmptyTransaction(dateISO: string): Transaction {
  return {
    id: nanoid(8),
    date: dateISO,
    amount: 0,
    days: makeEmptyDays(),
  };
}

export function makeEmptyWorker(): LedgerWorker {
  return {
    lastName: "",
    firstName: "",
    middleInitial: "",
    identifyingNo: "",
    status: "journeyworker",
    classification: "",
  };
}

export function makeEmptyLedger(): Ledger {
  const now = new Date().toISOString();
  return {
    id: nanoid(8),
    worker: makeEmptyWorker(),
    hourlyRate: 0,
    transactions: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Format a `LedgerWorker` as `"Lastname, Firstname M."`. Falls back to
 * `"(unnamed worker)"` when no name fields are populated. Mirrors the
 * style used in src/components/WeekEditor.tsx.
 */
export function displayName(w: LedgerWorker): string {
  const last = w.lastName.trim();
  const first = w.firstName.trim();
  const mi = w.middleInitial.trim();
  if (!last && !first && !mi) return "(unnamed worker)";
  const head = last || "—";
  const tail = [first, mi].filter(Boolean).join(" ");
  return tail ? `${head}, ${tail}` : head;
}

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
};
