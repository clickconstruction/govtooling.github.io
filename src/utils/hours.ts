import type { EmployeeRow } from "../types/wh347";

/** Sum straight-time and overtime hours entered for the week (numeric only). */
export function sumWeekHours(row: EmployeeRow): string {
  let total = 0;
  for (const d of row.days) {
    total += parseNumeric(d.st) + parseNumeric(d.ot);
  }
  if (total === 0) {
    return "";
  }
  const rounded = Math.round(total * 1e4) / 1e4;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return String(rounded);
}

function parseNumeric(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}
