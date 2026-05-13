import type { WeekDayHeader } from "../types/wh347";

export type WeekStripDay = { dow: string; md: string };

function atNoon(y: number, monthIndex: number, day: number): Date {
  return new Date(y, monthIndex, day, 12, 0, 0, 0);
}

function addDaysLocal(d: Date, n: number): Date {
  const x = atNoon(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/** Parse week ending from HTML date input (YYYY-MM-DD) or common US text. */
export function parseWeekEndingDate(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const day = Number(iso[3]);
    const d = atNoon(y, m - 1, day);
    if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) {
      return null;
    }
    return d;
  }

  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(t);
  if (mdy) {
    let y = Number(mdy[3]);
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    const d = atNoon(y, month - 1, day);
    if (
      d.getFullYear() !== y ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      return null;
    }
    return d;
  }

  const ms = Date.parse(t);
  if (!Number.isNaN(ms)) {
    const p = new Date(ms);
    return atNoon(p.getFullYear(), p.getMonth(), p.getDate());
  }

  return null;
}

/** Seven consecutive days ending on `end` (column 6 = week ending day). */
export function buildWeekStrip(end: Date): WeekStripDay[] {
  const out: WeekStripDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDaysLocal(end, i - 6);
    let dow = d.toLocaleDateString("en-US", { weekday: "short" });
    dow = dow.replace(/\.$/, "");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push({ dow, md: `${mm}/${dd}` });
  }
  return out;
}

function emptyWeekDayHeaders(): WeekDayHeader[] {
  return Array.from({ length: 7 }, () => ({ letter: "", date: "" }));
}

/** Derive header row labels/dates for localStorage/export; blank if unparsable. */
export function weekDayHeadersFromWeekEnding(raw: string): WeekDayHeader[] {
  const end = parseWeekEndingDate(raw);
  if (!end) return emptyWeekDayHeaders();
  return buildWeekStrip(end).map((s) => ({ letter: s.dow, date: s.md }));
}

export function weekDayHeadersEqual(
  a: WeekDayHeader[],
  b: WeekDayHeader[],
): boolean {
  if (a.length !== 7 || b.length !== 7) return false;
  return a.every(
    (x, i) => x.letter === b[i].letter && x.date === b[i].date,
  );
}
