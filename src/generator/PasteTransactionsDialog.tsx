import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "../components/ui";
import type { Ledger } from "./storage";
import { defaultDistribute, totalHours } from "./calc";
import {
  parsePastedLedger,
  type ParsedRow,
} from "./parsePastedLedger";

const PLACEHOLDER = `5/11/26\t-$540.71
5/5/26\t-$1,092.11
4/20/26\t-$1,385.48
4/14/26\t-$500.00`;

export function PasteTransactionsDialog({
  ledger,
  onClose,
  onAdd,
}: {
  ledger: Ledger;
  onClose: () => void;
  onAdd: (rows: ParsedRow[]) => void;
}) {
  const [text, setText] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  const { rows, errors } = useMemo(() => parsePastedLedger(text), [text]);

  const rateMissing = ledger.hourlyRate <= 0;

  const previewRows = useMemo(
    () =>
      rows.map((r) => {
        const days = defaultDistribute(r.amount, ledger.hourlyRate);
        return { ...r, hours: totalHours(days) };
      }),
    [rows, ledger.hourlyRate],
  );

  const canAdd = rows.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Import transactions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste rows of <span className="font-medium">date</span> and{" "}
              <span className="font-medium">amount</span>, one per line.
              Tab-, comma-, or whitespace-separated.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
            aria-label="close"
          >
            ×
          </button>
        </header>

        <div className="p-5 space-y-4">
          {rateMissing && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Hourly rate is not set on this ledger, so imported rows will
              start with 0 hours. Set the rate above and click "Recompute" on
              each row, or paste hours directly.
            </div>
          )}

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            <span>Paste here</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
              rows={10}
              spellCheck={false}
              placeholder={PLACEHOLDER}
              className="px-2 py-1.5 rounded-md border border-slate-300 bg-white shadow-sm text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 whitespace-pre"
            />
          </label>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-medium text-slate-700">
              {rows.length} {rows.length === 1 ? "row" : "rows"} ready
            </span>
            {errors.length > 0 && (
              <span className="text-red-700">
                {errors.length} {errors.length === 1 ? "line" : "lines"} skipped
              </span>
            )}
            {rows.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="ml-auto text-brand-700 hover:underline"
              >
                {showPreview ? "Hide preview" : "Show preview"}
              </button>
            )}
          </div>

          {rows.length > 0 && showPreview && (
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-2 py-1.5 text-left w-8">#</th>
                    <th className="px-2 py-1.5 text-left">Date</th>
                    <th className="px-2 py-1.5 text-right">Amount</th>
                    <th className="px-2 py-1.5 text-right">Hours @ rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((r, i) => (
                    <tr key={`${r.lineNo}-${i}`}>
                      <td className="px-2 py-1.5 text-slate-500 tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-2 py-1.5">
                        {format(parseISO(r.dateISO), "MMM d, yyyy")}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        ${r.amount.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
                        {rateMissing ? "—" : `${r.hours.toFixed(2)} hr`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {errors.length > 0 && (
            <div className="border border-red-200 bg-red-50 rounded-md px-3 py-2 space-y-1">
              <div className="text-xs font-medium text-red-800">
                Skipped lines
              </div>
              <ul className="text-[11px] text-red-700 font-mono space-y-0.5">
                {errors.map((e, i) => (
                  <li key={i}>
                    Line {e.lineNo}: "{e.raw.trim() || "(blank)"}" — {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onAdd(rows)} disabled={!canAdd}>
            Add {rows.length} transaction{rows.length === 1 ? "" : "s"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
