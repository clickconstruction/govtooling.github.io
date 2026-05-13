import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { nanoid } from "nanoid";
import { Button } from "../components/ui";
import { loadWorkspace, saveWorkspace } from "../lib/storage";
import { displayPayrollNo } from "../lib/dates";
import type { EmployeeProfile, Project, Workspace } from "../types/payroll";
import { displayName, type Ledger, type Transaction } from "./storage";
import {
  findMatchingEmployee,
  mergeIntoProject,
  totalHours,
  workweekFor,
} from "./calc";

function rosterLabel(emp: EmployeeProfile): string {
  const last = emp.lastName.trim();
  const first = emp.firstName.trim();
  const mi = emp.middleInitial.trim();
  const head = last || "—";
  const tail = [first, mi].filter(Boolean).join(" ");
  const name = tail ? `${head}, ${tail}` : head;
  const id = emp.identifyingNo ? ` · #${emp.identifyingNo}` : "";
  const cls = emp.classification ? ` · ${emp.classification}` : "";
  return `${name}${id}${cls}`;
}

type Resolution =
  | { kind: "match-id"; emp: EmployeeProfile }
  | { kind: "match-name"; emp: EmployeeProfile }
  | { kind: "manual"; emp: EmployeeProfile }
  | { kind: "create" };

export function ImportToProjectDialog({
  ledger,
  selectedTxIds,
  onClose,
  onImported,
}: {
  ledger: Ledger;
  selectedTxIds: Set<string>;
  onClose: () => void;
  onImported: () => void;
}) {
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspace());
  const [projectId, setProjectId] = useState<string>("");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [manualEmployeeId, setManualEmployeeId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWorkspace(loadWorkspace());
  }, []);

  const project: Project | undefined = useMemo(
    () => workspace.projects.find((p) => p.id === projectId),
    [workspace, projectId],
  );

  useEffect(() => {
    if (!projectId && workspace.projects.length > 0) {
      setProjectId(workspace.projects[0].id);
    }
  }, [workspace, projectId]);

  // Reset the override whenever the project changes.
  useEffect(() => {
    setOverrideOpen(false);
    setManualEmployeeId("");
  }, [projectId]);

  const autoMatch = useMemo(() => {
    if (!project) return undefined;
    return findMatchingEmployee(project, ledger.worker);
  }, [project, ledger.worker]);

  const matchedByIdentifier = useMemo(() => {
    if (!autoMatch) return false;
    const a = (ledger.worker.identifyingNo || "").trim().toLowerCase();
    const b = (autoMatch.identifyingNo || "").trim().toLowerCase();
    return !!a && a === b;
  }, [autoMatch, ledger.worker]);

  const resolution: Resolution = useMemo(() => {
    if (overrideOpen && manualEmployeeId) {
      const emp = project?.employees.find((e) => e.id === manualEmployeeId);
      if (emp) return { kind: "manual", emp };
    }
    if (autoMatch) {
      return matchedByIdentifier
        ? { kind: "match-id", emp: autoMatch }
        : { kind: "match-name", emp: autoMatch };
    }
    return { kind: "create" };
  }, [overrideOpen, manualEmployeeId, project, autoMatch, matchedByIdentifier]);

  const txsToImport: Transaction[] = useMemo(
    () => ledger.transactions.filter((t) => selectedTxIds.has(t.id)),
    [ledger.transactions, selectedTxIds],
  );

  const previewRows = useMemo(() => {
    if (!project) return [];
    const targetEmployeeId =
      resolution.kind === "create" ? null : resolution.emp.id;
    return txsToImport.map((tx) => {
      const ww = workweekFor(tx.date);
      const existingWeek = project.weeks.find((w) => w.weekEnding === ww.saturday);
      const conflict =
        !!existingWeek &&
        targetEmployeeId != null &&
        existingWeek.entries.some((e) => e.employeeId === targetEmployeeId);
      return {
        tx,
        ww,
        existingPayrollNo: existingWeek ? displayPayrollNo(existingWeek) : null,
        willOverwriteEntry: conflict,
        hours: totalHours(tx.days),
      };
    });
  }, [project, txsToImport, resolution]);

  const canImport = !!project && txsToImport.length > 0 && !busy;

  const doImport = () => {
    if (!project) return;
    setBusy(true);
    setError(null);
    try {
      let projectWithWorker: Project;
      let employeeId: string;

      if (resolution.kind === "create") {
        const newEmp: EmployeeProfile = {
          id: nanoid(8),
          lastName: ledger.worker.lastName,
          firstName: ledger.worker.firstName,
          middleInitial: ledger.worker.middleInitial,
          identifyingNo: ledger.worker.identifyingNo,
          status: ledger.worker.status,
          classification: ledger.worker.classification,
        };
        projectWithWorker = {
          ...project,
          employees: [...project.employees, newEmp],
        };
        employeeId = newEmp.id;
      } else {
        const existing = resolution.emp;
        const updatedEmp: EmployeeProfile = {
          ...existing,
          lastName: ledger.worker.lastName,
          firstName: ledger.worker.firstName,
          middleInitial: ledger.worker.middleInitial,
          identifyingNo: ledger.worker.identifyingNo,
          status: ledger.worker.status,
          classification: ledger.worker.classification,
        };
        projectWithWorker = {
          ...project,
          employees: project.employees.map((e) =>
            e.id === existing.id ? updatedEmp : e,
          ),
        };
        employeeId = existing.id;
      }

      const updated = mergeIntoProject(
        projectWithWorker,
        txsToImport,
        employeeId,
        ledger.hourlyRate,
      );
      const nextWorkspace: Workspace = {
        ...workspace,
        projects: workspace.projects.map((p) =>
          p.id === updated.id ? updated : p,
        ),
      };
      saveWorkspace(nextWorkspace);
      onImported();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const ledgerName = displayName(ledger.worker);

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
              Import to Project
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {txsToImport.length} {txsToImport.length === 1 ? "row" : "rows"} from{" "}
              <span className="font-medium">{ledgerName}</span>
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
          {workspace.projects.length === 0 ? (
            <div className="text-sm text-slate-600">
              <p>No WH-347 projects yet on this device.</p>
              <p className="mt-2">
                Create one first in the{" "}
                <a
                  href={`${import.meta.env.BASE_URL}index.html`}
                  className="text-brand-700 underline"
                >
                  WH-347 generator
                </a>
                , then come back to import.
              </p>
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                <span>Project</span>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.currentTarget.value)}
                  className="px-2 py-1.5 rounded-md border border-slate-300 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  {workspace.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label || "(untitled)"}
                    </option>
                  ))}
                </select>
              </label>

              {project && (
                <div className="border border-slate-200 rounded-md p-3 bg-slate-50 space-y-2">
                  {resolution.kind === "create" ? (
                    <p className="text-sm">
                      <span className="inline-block px-1.5 py-0.5 mr-2 rounded bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-wide font-semibold">
                        new
                      </span>
                      Will create new worker on this project:{" "}
                      <span className="font-medium">{ledgerName}</span>
                      {ledger.worker.classification && (
                        <span className="text-slate-600">
                          {" "}
                          · {ledger.worker.classification}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm">
                      <span className="inline-block px-1.5 py-0.5 mr-2 rounded bg-amber-100 text-amber-800 text-[10px] uppercase tracking-wide font-semibold">
                        overwrite
                      </span>
                      Will overwrite existing worker:{" "}
                      <span className="font-medium">{rosterLabel(resolution.emp)}</span>
                      {resolution.kind === "match-id" && (
                        <span className="text-slate-500">
                          {" "}
                          (matched by SSN-last4)
                        </span>
                      )}
                      {resolution.kind === "match-name" && (
                        <span className="text-slate-500"> (matched by name)</span>
                      )}
                      {resolution.kind === "manual" && (
                        <span className="text-slate-500"> (manual override)</span>
                      )}
                    </p>
                  )}

                  {project.employees.length > 0 && (
                    <div className="text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideOpen((v) => !v);
                          if (!overrideOpen && !manualEmployeeId) {
                            setManualEmployeeId(
                              autoMatch?.id ?? project.employees[0]?.id ?? "",
                            );
                          }
                        }}
                        className="text-brand-700 hover:underline"
                      >
                        {overrideOpen
                          ? "Use auto-match"
                          : "Match to a different worker..."}
                      </button>
                      {overrideOpen && (
                        <div className="mt-2">
                          <select
                            value={manualEmployeeId}
                            onChange={(e) =>
                              setManualEmployeeId(e.currentTarget.value)
                            }
                            className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          >
                            {project.employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {rosterLabel(emp)}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Selecting an existing worker will overwrite their
                            profile (1B-3) with the ledger's values on import.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {previewRows.length > 0 && (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Check date</th>
                        <th className="px-2 py-1.5 text-left">Workweek</th>
                        <th className="px-2 py-1.5 text-right">Hours</th>
                        <th className="px-2 py-1.5 text-left">Target week</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.map(
                        ({ tx, ww, existingPayrollNo, willOverwriteEntry, hours }) => (
                          <tr key={tx.id}>
                            <td className="px-2 py-1.5">
                              {format(parseISO(tx.date), "MMM d, yyyy")}
                            </td>
                            <td className="px-2 py-1.5 text-slate-600">
                              {format(parseISO(ww.monday), "MMM d")} -{" "}
                              {format(parseISO(ww.friday), "MMM d")}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {hours.toFixed(2)}
                            </td>
                            <td className="px-2 py-1.5 text-slate-600">
                              w/e {format(parseISO(ww.saturday), "MMM d")}
                              {existingPayrollNo != null ? (
                                <span
                                  className={`ml-1 text-[10px] px-1 py-0.5 rounded ${
                                    willOverwriteEntry
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {willOverwriteEntry
                                    ? `overwrites #${existingPayrollNo}`
                                    : `merges into #${existingPayrollNo}`}
                                </span>
                              ) : (
                                <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                  new week
                                </span>
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-600">Could not import: {error}</p>
              )}
            </>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={doImport} disabled={!canImport}>
            {busy ? "Importing…" : `Import ${txsToImport.length}`}
          </Button>
        </footer>
      </div>
    </div>
  );
}
