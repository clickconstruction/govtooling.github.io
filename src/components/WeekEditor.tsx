import { useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import type { EmployeeEntry, EmployeeProfile, Payroll, Project } from "../types/payroll";
import { Button, NumberCell, SectionCard, TextInput } from "./ui";
import { makeEmptyEntry } from "../lib/factory";
import { derivePayrollNo, displayPayrollNo } from "../lib/dates";
import {
  grossAllWork,
  grossThisProject,
  netPay,
  otHours,
  stHours,
  totalDeductions,
  totalOtherDeductions,
} from "../lib/calc";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeekEditor({
  project,
  week,
  onChange,
  onProjectChange,
  onGeneratePdf,
}: {
  project: Project;
  week: Payroll;
  onChange: (next: Payroll) => void;
  onProjectChange: (next: Project) => void;
  onGeneratePdf: () => void;
}) {
  const hideSubCols = !!project.hideSubColumns;
  const toggleSubCols = () =>
    onProjectChange({ ...project, hideSubColumns: !hideSubCols });
  const updateWeek = (patch: Partial<Payroll>) => onChange({ ...week, ...patch });

  const updateEntry = (employeeId: string, patch: Partial<EmployeeEntry>) =>
    updateWeek({
      entries: week.entries.map((entry) =>
        entry.employeeId === employeeId ? { ...entry, ...patch } : entry,
      ),
    });

  const updateDay = (
    employeeId: string,
    dayIndex: number,
    kind: "st" | "ot",
    value: number,
  ) => {
    const entry = week.entries.find((e) => e.employeeId === employeeId);
    if (!entry) return;
    const days = entry.days.map((d, i) => (i === dayIndex ? { ...d, [kind]: value } : d));
    updateEntry(employeeId, { days });
  };

  const onWeekEndingChange = (iso: string) => {
    const next = makeEmptyEntry("__placeholder__", iso);
    const newDates = next.days.map((d) => d.date);
    updateWeek({
      weekEnding: iso,
      entries: week.entries.map((entry) => ({
        ...entry,
        days: entry.days.map((d, i) => ({ ...d, date: newDates[i] ?? d.date })),
      })),
    });
  };

  // Sync entries when employees are added/removed from the roster.
  useEffect(() => {
    const employeeIds = new Set(project.employees.map((e) => e.id));
    const existingIds = new Set(week.entries.map((e) => e.employeeId));
    const missing = project.employees.filter((emp) => !existingIds.has(emp.id));
    const stale = week.entries.filter((e) => !employeeIds.has(e.employeeId));
    if (missing.length === 0 && stale.length === 0) return;
    updateWeek({
      entries: [
        ...week.entries.filter((e) => employeeIds.has(e.employeeId)),
        ...missing.map((emp) =>
          makeEmptyEntry(emp.id, week.weekEnding, project.prevailingWage ?? 0),
        ),
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.employees, week.entries.length]);

  const entryByEmployee = useMemo(
    () => new Map(week.entries.map((e) => [e.employeeId, e])),
    [week.entries],
  );

  const dayHeaderDates = useMemo(() => {
    const first = week.entries[0];
    if (!first) return Array.from({ length: 7 }, () => "");
    return first.days.map((d) => {
      try {
        return format(parseISO(d.date), "MM/dd");
      } catch {
        return "";
      }
    });
  }, [week.entries]);

  return (
    <SectionCard
      title={
        <>
          Payroll #{displayPayrollNo(week)} ·{" "}
          {(() => {
            try {
              return format(parseISO(week.weekEnding), "EEE, MMM d, yyyy");
            } catch {
              return week.weekEnding;
            }
          })()}
        </>
      }
      actions={
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={week.isFinal}
              onChange={(e) => updateWeek({ isFinal: e.currentTarget.checked })}
              className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Final submission
          </label>
          <Button onClick={onGeneratePdf}>Download Week PDF</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <TextInput
          label="Week ending date"
          type="date"
          value={week.weekEnding}
          onChange={(e) => onWeekEndingChange(e.currentTarget.value)}
        />
        <TextInput
          label="Certified payroll no."
          type="text"
          inputMode="numeric"
          value={displayPayrollNo(week)}
          placeholder={derivePayrollNo(week.weekEnding)}
          onChange={(e) => updateWeek({ payrollNo: e.currentTarget.value })}
        />
      </div>

      {project.employees.length === 0 ? (
        <p className="text-sm text-slate-500">
          Add workers to the project roster before entering hours.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border border-slate-200">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th
                  rowSpan={2}
                  className="border border-slate-200 px-1.5 py-1 text-left min-w-[160px] align-top"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span>Worker</span>
                    <button
                      type="button"
                      onClick={toggleSubCols}
                      title={
                        hideSubCols
                          ? "Subcontractor mode on — show fringe & deduction columns"
                          : "Subcontractor mode — hide fringe & deduction columns"
                      }
                      aria-pressed={hideSubCols}
                      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded transition ${
                        hideSubCols
                          ? "bg-amber-100 text-amber-800 font-semibold"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      sub
                    </button>
                  </div>
                </th>
                <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                  ST/OT
                </th>
                {DAY_LABELS.map((d, i) => (
                  <th key={d} className="border border-slate-200 px-1 py-1 text-center">
                    {d}
                    <div className="text-[10px] text-slate-500">{dayHeaderDates[i]}</div>
                  </th>
                ))}
                <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                  Total (5)
                </th>
                <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                  Rate (6A)
                </th>
                {!hideSubCols && (
                  <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                    Fringe credit (6B)
                  </th>
                )}
                {!hideSubCols && (
                  <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                    Cash fringe (6C)
                  </th>
                )}
                <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                  Gross this project (7A)
                </th>
                <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                  Gross all work (7B)
                </th>
                {!hideSubCols && (
                  <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                    Tax W/H
                  </th>
                )}
                {!hideSubCols && (
                  <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                    FICA
                  </th>
                )}
                {!hideSubCols && (
                  <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                    Other ded.
                  </th>
                )}
                {!hideSubCols && (
                  <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                    Total ded.
                  </th>
                )}
                <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                  Net pay (9)
                </th>
              </tr>
              <tr />
            </thead>
            <tbody>
              {project.employees.map((emp) => {
                const entry = entryByEmployee.get(emp.id);
                if (!entry) return null;
                return (
                  <EmployeeRows
                    key={emp.id}
                    employee={emp}
                    entry={entry}
                    hideSubColumns={hideSubCols}
                    onChangeEntry={(patch) => updateEntry(emp.id, patch)}
                    onChangeDay={(i, kind, v) => updateDay(emp.id, i, kind, v)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function EmployeeRows({
  employee,
  entry,
  hideSubColumns,
  onChangeEntry,
  onChangeDay,
}: {
  employee: EmployeeProfile;
  entry: EmployeeEntry;
  hideSubColumns: boolean;
  onChangeEntry: (patch: Partial<EmployeeEntry>) => void;
  onChangeDay: (dayIndex: number, kind: "st" | "ot", v: number) => void;
}) {
  const opts = { ignoreSubColumns: hideSubColumns } as const;
  const stTot = stHours(entry);
  const otTot = otHours(entry);
  const g7a = grossThisProject(entry, opts);
  const g7b = grossAllWork(entry, opts);
  const otherDeds = totalOtherDeductions(entry, opts);
  const totalDed = totalDeductions(entry, opts);
  const net = netPay(entry, opts);

  const updateOther = (i: number, patch: Partial<{ label: string; amount: number }>) =>
    onChangeEntry({
      deductions: {
        ...entry.deductions,
        other: entry.deductions.other.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
      },
    });

  const addOther = () =>
    onChangeEntry({
      deductions: {
        ...entry.deductions,
        other: [...entry.deductions.other, { label: "", amount: 0 }],
      },
    });

  const removeOther = (i: number) =>
    onChangeEntry({
      deductions: {
        ...entry.deductions,
        other: entry.deductions.other.filter((_, idx) => idx !== i),
      },
    });

  return (
    <>
      <tr className="border-t border-slate-200">
        <td rowSpan={2} className="border border-slate-200 px-2 py-1 align-top">
          <div className="font-medium">
            {employee.lastName || "—"}, {employee.firstName} {employee.middleInitial}
          </div>
          <div className="text-[10px] text-slate-500">
            #{employee.identifyingNo || "—"} · {employee.classification || "—"} ·{" "}
            {employee.status === "apprentice" ? "RA" : "J"}
          </div>
        </td>
        <td className="border border-slate-200 px-1 py-0.5 text-center font-semibold text-slate-700">
          ST
        </td>
        {entry.days.map((d, i) => (
          <td key={`st-${i}`} className="border border-slate-200 px-0 py-0 w-12">
            <NumberCell
              ariaLabel={`${employee.lastName} ST day ${i + 1}`}
              value={d.st}
              onChange={(v) => onChangeDay(i, "st", v)}
              step="0.25"
              min={0}
              max={24}
            />
          </td>
        ))}
        <td className="border border-slate-200 px-1 py-0.5 text-right font-medium">{stTot}</td>
        <td rowSpan={2} className="border border-slate-200 px-0 py-0 w-20 align-middle">
          <NumberCell value={entry.rateOfPay} onChange={(v) => onChangeEntry({ rateOfPay: v })} />
        </td>
        {!hideSubColumns && (
          <td rowSpan={2} className="border border-slate-200 px-0 py-0 w-20 align-middle">
            <NumberCell
              value={entry.fringeCredit}
              onChange={(v) => onChangeEntry({ fringeCredit: v })}
            />
          </td>
        )}
        {!hideSubColumns && (
          <td rowSpan={2} className="border border-slate-200 px-0 py-0 w-20 align-middle">
            <NumberCell
              value={entry.paymentInLieu}
              onChange={(v) => onChangeEntry({ paymentInLieu: v })}
            />
          </td>
        )}
        <td
          rowSpan={2}
          className="border border-slate-200 px-1.5 py-0.5 text-right tabular-nums align-middle"
        >
          {g7a.toFixed(2)}
        </td>
        <td
          rowSpan={2}
          className="border border-slate-200 px-0 py-0 w-24 align-middle"
        >
          <NumberCell
            value={entry.grossAllWorkOverride ?? g7b}
            onChange={(v) => onChangeEntry({ grossAllWorkOverride: v })}
          />
        </td>
        {!hideSubColumns && (
          <td rowSpan={2} className="border border-slate-200 px-0 py-0 w-20 align-middle">
            <NumberCell
              value={entry.deductions.taxWithholdings}
              onChange={(v) =>
                onChangeEntry({
                  deductions: { ...entry.deductions, taxWithholdings: v },
                })
              }
            />
          </td>
        )}
        {!hideSubColumns && (
          <td rowSpan={2} className="border border-slate-200 px-0 py-0 w-20 align-middle">
            <NumberCell
              value={entry.deductions.fica}
              onChange={(v) =>
                onChangeEntry({ deductions: { ...entry.deductions, fica: v } })
              }
            />
          </td>
        )}
        {!hideSubColumns && (
          <td
            rowSpan={2}
            className="border border-slate-200 px-1 py-0.5 align-middle min-w-[140px]"
          >
            <div className="space-y-1">
              {entry.deductions.other.map((o, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    className="flex-1 px-1 py-0.5 text-xs border border-slate-200 rounded bg-white"
                    placeholder="label"
                    value={o.label}
                    onChange={(e) => updateOther(i, { label: e.currentTarget.value })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className="w-16 px-1 py-0.5 text-xs text-right border border-slate-200 rounded bg-white"
                    value={o.amount}
                    onChange={(e) =>
                      updateOther(i, { amount: Number(e.currentTarget.value) || 0 })
                    }
                  />
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => removeOther(i)}
                    aria-label="remove deduction"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addOther}
                className="text-[11px] text-brand-700 hover:underline"
              >
                + add deduction
              </button>
              {otherDeds > 0 && (
                <div className="text-[10px] text-slate-500">subtotal: {otherDeds.toFixed(2)}</div>
              )}
            </div>
          </td>
        )}
        {!hideSubColumns && (
          <td
            rowSpan={2}
            className="border border-slate-200 px-1.5 py-0.5 text-right tabular-nums align-middle"
          >
            {totalDed.toFixed(2)}
          </td>
        )}
        <td
          rowSpan={2}
          className="border border-slate-200 px-1.5 py-0.5 text-right tabular-nums align-middle font-semibold"
        >
          {net.toFixed(2)}
        </td>
      </tr>
      <tr>
        <td className="border border-slate-200 px-1 py-0.5 text-center font-semibold text-slate-700">
          OT
        </td>
        {entry.days.map((d, i) => (
          <td key={`ot-${i}`} className="border border-slate-200 px-0 py-0 w-12">
            <NumberCell
              ariaLabel={`${employee.lastName} OT day ${i + 1}`}
              value={d.ot}
              onChange={(v) => onChangeDay(i, "ot", v)}
              step="0.25"
              min={0}
              max={24}
            />
          </td>
        ))}
        <td className="border border-slate-200 px-1 py-0.5 text-right font-medium">{otTot}</td>
      </tr>
    </>
  );
}
