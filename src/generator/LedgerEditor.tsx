import { Fragment, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Button, NumberCell, SectionCard, TextInput } from "../components/ui";
import {
  DAY_KEYS,
  DAY_LABELS,
  type DayKey,
  type Ledger,
  type LedgerWorker,
  type Transaction,
  makeEmptyTransaction,
} from "./storage";
import { defaultDistribute, randomDistribute, totalHours, workweekFor } from "./calc";
import { ImportToProjectDialog } from "./ImportToProjectDialog";
import { PasteTransactionsDialog } from "./PasteTransactionsDialog";
import type { ParsedRow } from "./parsePastedLedger";

export function LedgerEditor({
  ledger,
  onChange,
}: {
  ledger: Ledger;
  onChange: (next: Ledger) => void;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(() => new Set());

  const updateLedger = (patch: Partial<Ledger>) => onChange({ ...ledger, ...patch });

  const updateWorker = (patch: Partial<LedgerWorker>) =>
    onChange({ ...ledger, worker: { ...ledger.worker, ...patch } });

  const updateTransaction = (id: string, patch: Partial<Transaction>) => {
    onChange({
      ...ledger,
      transactions: ledger.transactions.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    });
  };

  const updateTxDay = (
    id: string,
    day: DayKey,
    kind: "st" | "ot",
    value: number,
  ) => {
    const tx = ledger.transactions.find((t) => t.id === id);
    if (!tx) return;
    updateTransaction(id, {
      days: {
        ...tx.days,
        [day]: { ...tx.days[day], [kind]: value },
      },
    });
  };

  const addTransaction = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const tx = makeEmptyTransaction(today);
    onChange({ ...ledger, transactions: [...ledger.transactions, tx] });
  };

  const randomizeSelected = () => {
    if (selectedTxIds.size === 0) return;
    onChange({
      ...ledger,
      transactions: ledger.transactions.map((tx) =>
        selectedTxIds.has(tx.id)
          ? { ...tx, days: randomDistribute(tx.amount, ledger.hourlyRate) }
          : tx,
      ),
    });
  };

  const onAddPasted = (rows: ParsedRow[]) => {
    const newTxs = rows.map((r) => {
      const tx = makeEmptyTransaction(r.dateISO);
      tx.amount = r.amount;
      tx.days = defaultDistribute(r.amount, ledger.hourlyRate);
      return tx;
    });
    onChange({
      ...ledger,
      transactions: [...ledger.transactions, ...newTxs],
    });
    setPasteOpen(false);
  };

  const removeTransaction = (id: string) => {
    onChange({
      ...ledger,
      transactions: ledger.transactions.filter((t) => t.id !== id),
    });
    setSelectedTxIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const recompute = (id: string) => {
    const tx = ledger.transactions.find((t) => t.id === id);
    if (!tx) return;
    updateTransaction(id, { days: defaultDistribute(tx.amount, ledger.hourlyRate) });
  };

  const onAmountChange = (id: string, amount: number) => {
    const tx = ledger.transactions.find((t) => t.id === id);
    if (!tx) return;
    const isAutoFill =
      tx.amount === 0 && totalHours(tx.days) === 0;
    const days = isAutoFill ? defaultDistribute(amount, ledger.hourlyRate) : tx.days;
    updateTransaction(id, { amount, days });
  };

  const onDateChange = (id: string, date: string) => {
    updateTransaction(id, { date });
  };

  const toggleSelect = (id: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTxIds(new Set(ledger.transactions.map((t) => t.id)));
  };

  const clearSelection = () => setSelectedTxIds(new Set());

  const selectedCount = selectedTxIds.size;
  const allSelected =
    selectedCount > 0 && selectedCount === ledger.transactions.length;

  const sortedTransactions = useMemo(
    () => [...ledger.transactions].sort((a, b) => a.date.localeCompare(b.date)),
    [ledger.transactions],
  );

  const grandTotalHours = useMemo(
    () =>
      ledger.transactions.reduce((sum, t) => sum + totalHours(t.days), 0),
    [ledger.transactions],
  );
  const grandTotalAmount = useMemo(
    () => ledger.transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    [ledger.transactions],
  );

  const rateMissing = ledger.hourlyRate <= 0;

  return (
    <div className="space-y-4">
      <SectionCard title="Worker">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-3">
            <TextInput
              label="Last name (1B)"
              value={ledger.worker.lastName}
              onChange={(e) => updateWorker({ lastName: e.currentTarget.value })}
            />
          </div>
          <div className="lg:col-span-3">
            <TextInput
              label="First (1C)"
              value={ledger.worker.firstName}
              onChange={(e) => updateWorker({ firstName: e.currentTarget.value })}
            />
          </div>
          <div className="lg:col-span-1">
            <TextInput
              label="MI (1D)"
              maxLength={2}
              className="text-center"
              value={ledger.worker.middleInitial}
              onChange={(e) =>
                updateWorker({ middleInitial: e.currentTarget.value })
              }
            />
          </div>
          <div className="lg:col-span-2">
            <TextInput
              label="ID / SSN-last4 (1E)"
              placeholder="1234"
              value={ledger.worker.identifyingNo}
              onChange={(e) =>
                updateWorker({ identifyingNo: e.currentTarget.value })
              }
            />
          </div>
          <div className="lg:col-span-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-700">Status (2)</span>
              <select
                className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                value={ledger.worker.status}
                onChange={(e) =>
                  updateWorker({
                    status: e.currentTarget.value as LedgerWorker["status"],
                  })
                }
              >
                <option value="journeyworker">Journeyworker (J)</option>
                <option value="apprentice">Registered Apprentice (RA)</option>
              </select>
            </label>
          </div>
          <div className="lg:col-span-8">
            <TextInput
              label="Classification (3)"
              placeholder="e.g., Carpenter"
              value={ledger.worker.classification}
              onChange={(e) =>
                updateWorker({ classification: e.currentTarget.value })
              }
            />
          </div>
          <div className="lg:col-span-4">
            <TextInput
              label="Hourly rate ($/hr)"
              type="number"
              step="0.01"
              min={0}
              value={ledger.hourlyRate}
              onChange={(e) =>
                updateLedger({
                  hourlyRate: Number(e.currentTarget.value) || 0,
                })
              }
              hint={
                rateMissing
                  ? "Required to split check amounts into hours."
                  : "Splits each check amount into Mon-Fri hours."
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={`Ledger (${ledger.transactions.length} ${
          ledger.transactions.length === 1 ? "check" : "checks"
        })`}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={selectedCount === 0}
              onClick={randomizeSelected}
              title={
                selectedCount === 0
                  ? "Check one or more rows to randomize."
                  : `Randomize Mon-Fri hours for ${selectedCount} row${selectedCount === 1 ? "" : "s"}`
              }
            >
              Randomize Selected
            </Button>
            <Button
              variant="primary"
              disabled={selectedCount === 0}
              onClick={() => setImportOpen(true)}
              title={
                selectedCount === 0
                  ? "Check one or more rows to import."
                  : `Import ${selectedCount} row${selectedCount === 1 ? "" : "s"} into a project`
              }
            >
              Import to Project ({selectedCount})
            </Button>
          </>
        }
      >
        {ledger.transactions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500 mb-3">
              No checks yet. Add a row to start.
            </p>
            <Button onClick={addTransaction}>+ Add transaction</Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-slate-200">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="border border-slate-200 px-1.5 py-1 w-8 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el)
                            el.indeterminate =
                              selectedCount > 0 && !allSelected;
                        }}
                        onChange={() =>
                          allSelected ? clearSelection() : selectAll()
                        }
                        className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        aria-label="Select all rows"
                        title={
                          allSelected
                            ? `Clear selection (${selectedCount} selected)`
                            : selectedCount > 0
                              ? `Select all ${ledger.transactions.length} rows (${selectedCount} currently selected)`
                              : `Select all ${ledger.transactions.length} rows`
                        }
                      />
                    </th>
                    <th className="border border-slate-200 px-1.5 py-1 text-left">
                      Check date
                    </th>
                    <th className="border border-slate-200 px-1.5 py-1 text-left">
                      Workweek
                    </th>
                    <th className="border border-slate-200 px-1.5 py-1 text-right">
                      Amount
                    </th>
                    <th className="border border-slate-200 px-1.5 py-1">ST/OT</th>
                    {DAY_KEYS.map((d) => (
                      <th
                        key={d}
                        className="border border-slate-200 px-1.5 py-1 text-center"
                      >
                        {DAY_LABELS[d]}
                      </th>
                    ))}
                    <th className="border border-slate-200 px-1.5 py-1 text-right">
                      Total
                    </th>
                    <th className="border border-slate-200 px-1.5 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((tx) => {
                    const ww = (() => {
                      try {
                        return workweekFor(tx.date);
                      } catch {
                        return null;
                      }
                    })();
                    const wwLabel = ww
                      ? `${format(parseISO(ww.monday), "MMM d")} - ${format(
                          parseISO(ww.friday),
                          "MMM d",
                        )}`
                      : "—";
                    const tot = totalHours(tx.days);
                    const stTot = DAY_KEYS.reduce(
                      (s, k) => s + (tx.days[k].st || 0),
                      0,
                    );
                    const otTot = DAY_KEYS.reduce(
                      (s, k) => s + (tx.days[k].ot || 0),
                      0,
                    );
                    return (
                      <Fragment key={tx.id}>
                        <tr className="border-t border-slate-200">
                          <td
                            rowSpan={2}
                            className="border border-slate-200 px-1.5 py-1 text-center align-middle"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTxIds.has(tx.id)}
                              onChange={() => toggleSelect(tx.id)}
                              className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                              aria-label={`select ${tx.date}`}
                            />
                          </td>
                          <td
                            rowSpan={2}
                            className="border border-slate-200 px-1.5 py-1 align-middle"
                          >
                            <input
                              type="date"
                              value={tx.date}
                              onChange={(e) =>
                                onDateChange(tx.id, e.currentTarget.value)
                              }
                              className="text-xs px-1 py-0.5 border border-slate-200 rounded bg-white"
                            />
                          </td>
                          <td
                            rowSpan={2}
                            className="border border-slate-200 px-1.5 py-1 text-slate-600 align-middle whitespace-nowrap"
                          >
                            {wwLabel}
                          </td>
                          <td
                            rowSpan={2}
                            className="border border-slate-200 px-0 py-0 w-24 align-middle"
                          >
                            <NumberCell
                              value={tx.amount}
                              onChange={(v) => onAmountChange(tx.id, v)}
                              step="0.01"
                              min={0}
                              ariaLabel={`amount for ${tx.date}`}
                            />
                          </td>
                          <td className="border border-slate-200 px-1 py-0.5 text-center font-semibold text-slate-700">
                            ST
                          </td>
                          {DAY_KEYS.map((d) => (
                            <td
                              key={`st-${d}`}
                              className="border border-slate-200 px-0 py-0 w-12"
                            >
                              <NumberCell
                                value={tx.days[d].st}
                                onChange={(v) => updateTxDay(tx.id, d, "st", v)}
                                step="0.25"
                                min={0}
                                max={24}
                                ariaLabel={`${tx.date} ${d} ST`}
                              />
                            </td>
                          ))}
                          <td className="border border-slate-200 px-1.5 py-0.5 text-right font-medium">
                            {stTot.toFixed(2)}
                          </td>
                          <td
                            rowSpan={2}
                            className="border border-slate-200 px-1.5 py-1 align-middle"
                          >
                            <div className="flex flex-col items-start gap-1">
                              <button
                                type="button"
                                onClick={() => recompute(tx.id)}
                                className="text-[11px] text-brand-700 hover:underline"
                                disabled={rateMissing || !tx.amount}
                                title={
                                  rateMissing
                                    ? "Set hourly rate first"
                                    : !tx.amount
                                      ? "Enter an amount first"
                                      : "Recompute Mon-Fri hours from amount and rate"
                                }
                              >
                                Recompute
                              </button>
                              <button
                                type="button"
                                onClick={() => removeTransaction(tx.id)}
                                className="text-[11px] text-red-600 hover:underline"
                                aria-label="delete row"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 px-1 py-0.5 text-center font-semibold text-slate-700">
                            OT
                          </td>
                          {DAY_KEYS.map((d) => (
                            <td
                              key={`ot-${d}`}
                              className="border border-slate-200 px-0 py-0 w-12"
                            >
                              <NumberCell
                                value={tx.days[d].ot}
                                onChange={(v) => updateTxDay(tx.id, d, "ot", v)}
                                step="0.25"
                                min={0}
                                max={24}
                                ariaLabel={`${tx.date} ${d} OT`}
                              />
                            </td>
                          ))}
                          <td className="border border-slate-200 px-1.5 py-0.5 text-right font-medium">
                            {otTot.toFixed(2)}
                          </td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="border border-slate-200" />
                          <td
                            className="border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-500 text-right"
                            colSpan={3}
                          >
                            Row total
                          </td>
                          <td
                            className="border border-slate-200 px-1.5 py-0.5 text-right text-[11px] text-slate-700 font-semibold"
                            colSpan={6}
                          >
                            {tot.toFixed(2)} hr
                          </td>
                          <td className="border border-slate-200" colSpan={2} />
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-semibold">
                    <td className="border border-slate-200" colSpan={3} />
                    <td className="border border-slate-200 px-1.5 py-1 text-right tabular-nums">
                      ${grandTotalAmount.toFixed(2)}
                    </td>
                    <td className="border border-slate-200" colSpan={6} />
                    <td className="border border-slate-200 px-1.5 py-1 text-right tabular-nums">
                      {grandTotalHours.toFixed(2)} hr
                    </td>
                    <td className="border border-slate-200" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <Button variant="secondary" onClick={addTransaction}>
                + Add transaction
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPasteOpen(true)}
                title="Paste rows of date + amount to add multiple transactions at once"
              >
                Import multiple rows
              </Button>
            </div>

            {rateMissing && (
              <p className="mt-3 text-xs text-amber-700">
                Set the hourly rate above to auto-fill Mon-Fri hours when you enter
                an amount. You can also enter hours directly.
              </p>
            )}
          </>
        )}
      </SectionCard>

      {importOpen && (
        <ImportToProjectDialog
          ledger={ledger}
          selectedTxIds={selectedTxIds}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            clearSelection();
          }}
        />
      )}

      {pasteOpen && (
        <PasteTransactionsDialog
          ledger={ledger}
          onClose={() => setPasteOpen(false)}
          onAdd={onAddPasted}
        />
      )}
    </div>
  );
}
