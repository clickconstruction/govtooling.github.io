import { format, isValid, parse } from "date-fns";

export interface ParsedRow {
  /** 1-based source line number from the textarea. */
  lineNo: number;
  /** Original line text (for display in the preview / error messages). */
  raw: string;
  /** ISO yyyy-mm-dd parsed from the date column. */
  dateISO: string;
  /** Always positive (Math.abs of the parsed value). */
  amount: number;
}

export interface ParseError {
  lineNo: number;
  raw: string;
  reason: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: ParseError[];
}

const DATE_FORMATS = ["M/d/yy", "M/d/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"];

/**
 * Split a line into [dateToken, amountToken] using the first run of TAB,
 * comma, or 2+ spaces. A single space won't split because amounts can have
 * a leading "-" sign and there's no reliable single-token boundary in
 * formats like "5/11/26 -$540.71" that wouldn't also break "Last Name".
 */
function splitLine(line: string): [string, string] | null {
  const m = line.match(/^(.+?)(?:\t|,|\s{2,})(.+)$/);
  if (!m) return null;
  const left = m[1].trim();
  const right = m[2].trim();
  if (!left || !right) return null;
  return [left, right];
}

function tryParseDate(token: string): string | null {
  const ref = new Date();
  for (const fmt of DATE_FORMATS) {
    const d = parse(token, fmt, ref);
    if (isValid(d)) {
      return format(d, "yyyy-MM-dd");
    }
  }
  return null;
}

function tryParseAmount(token: string): number | null {
  const cleaned = token
    .replace(/[$\s]/g, "")
    .replace(/,/g, "")
    .replace(/^\((.*)\)$/, "-$1")
    .replace(/^-+/, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.abs(n);
}

/**
 * Parse a multi-line paste of `<date><sep><amount>` rows into structured
 * Transactions. Tab, comma, or 2+ spaces separate the two columns. Amount
 * is always stored positive. Blank lines are skipped silently; everything
 * else either becomes a `ParsedRow` or a `ParseError`.
 */
export function parsePastedLedger(text: string): ParseResult {
  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const raw = line;
    const trimmed = line.trim();
    if (!trimmed) return;

    const split = splitLine(trimmed);
    if (!split) {
      errors.push({
        lineNo,
        raw,
        reason: "expected two columns (date and amount)",
      });
      return;
    }

    const [dateToken, amountToken] = split;
    const dateISO = tryParseDate(dateToken);
    if (!dateISO) {
      errors.push({ lineNo, raw, reason: `could not parse date "${dateToken}"` });
      return;
    }
    const amount = tryParseAmount(amountToken);
    if (amount == null) {
      errors.push({
        lineNo,
        raw,
        reason: `could not parse amount "${amountToken}"`,
      });
      return;
    }

    rows.push({ lineNo, raw, dateISO, amount });
  });

  return { rows, errors };
}
