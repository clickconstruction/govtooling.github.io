/**
 * String formatters shared by every renderer (production PDF fill, dev
 * sample-text seeding, etc.). Keeping these here ensures a value typed into
 * `/dev` and the same value derived from `makeSampleProject()` produce
 * byte-identical PDF output.
 */

import { format, parseISO } from "date-fns";

export function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "MM/dd/yyyy");
  } catch {
    return iso;
  }
}

export function fmtMoney(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  return n.toFixed(2);
}

export function fmtHours(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
}
