import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type { Payroll, Project } from "../types/payroll";
import { Button, EmptyState, SectionCard } from "./ui";
import { ContractorForm } from "./ContractorForm";
import { EmployeeRoster } from "./EmployeeRoster";
import { WeekEditor } from "./WeekEditor";
import { Wh347Preview } from "./Wh347Preview";
import { duplicateLastWeek, makeEmptyPayroll, nextSundayISO } from "../lib/factory";
import { displayPayrollNo } from "../lib/dates";
import { downloadFile } from "../lib/storage";
import { fillWh347 } from "../lib/pdf/fillWh347";
import { StatementOfComplianceDialog } from "./StatementOfComplianceDialog";
import JSZip from "jszip";

type Tab = "info" | "workers" | "weeks" | "compliance";
type WeekMode = "edit" | "preview";

export function ProjectDetailView({
  project,
  onChange,
  onBack,
}: {
  project: Project;
  onChange: (p: Project) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>("info");
  const [activeWeekId, setActiveWeekId] = useState<string | null>(
    project.weeks[project.weeks.length - 1]?.id ?? null,
  );
  const [weekMode, setWeekMode] = useState<WeekMode>("edit");
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [complianceFor, setComplianceFor] = useState<Payroll | null>(null);

  const activeWeek = useMemo(
    () => project.weeks.find((w) => w.id === activeWeekId) ?? null,
    [project.weeks, activeWeekId],
  );

  const updateWeek = (next: Payroll) => {
    onChange({
      ...project,
      weeks: project.weeks.map((w) => (w.id === next.id ? next : w)),
    });
  };

  const addWeek = () => {
    const fresh = makeEmptyPayroll(
      project.weeks[project.weeks.length - 1]?.weekEnding ?? nextSundayISO(),
      project.employees,
      project.prevailingWage ?? 0,
    );
    onChange({ ...project, weeks: [...project.weeks, fresh] });
    setActiveWeekId(fresh.id);
    setTab("weeks");
  };

  const duplicateWeek = () => {
    const dup = duplicateLastWeek(project);
    onChange({ ...project, weeks: [...project.weeks, dup] });
    setActiveWeekId(dup.id);
    setTab("weeks");
  };

  const deleteWeek = (id: string) => {
    onChange({ ...project, weeks: project.weeks.filter((w) => w.id !== id) });
    if (activeWeekId === id) setActiveWeekId(null);
  };

  const handleGeneratePdfClick = (week: Payroll) => {
    setComplianceFor(week);
  };

  const generatePdfForWeek = async (week: Payroll, options?: { debug?: boolean }) => {
    setPdfBusy(week.id);
    try {
      const blob = await fillWh347(project, week, options);
      const suffix = options?.debug ? "_calibration" : "";
      const filename = `WH347_${slugify(project.contractor.name || project.label)}_${week.weekEnding}_${displayPayrollNo(week)}${suffix}.pdf`;
      downloadFile(filename, blob);
    } catch (err) {
      console.error(err);
      alert(
        `Could not generate PDF: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setPdfBusy(null);
    }
  };

  const generateAllPdfs = async () => {
    if (project.weeks.length === 0) return;
    setPdfBusy("__all__");
    try {
      const zip = new JSZip();
      for (const week of project.weeks) {
        const blob = await fillWh347(project, week);
        const buf = await blob.arrayBuffer();
        const filename = `WH347_${slugify(project.contractor.name || project.label)}_${week.weekEnding}_${displayPayrollNo(week)}.pdf`;
        zip.file(filename, buf);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadFile(
        `${slugify(project.label || "WH347")}_payrolls.zip`,
        zipBlob,
      );
    } catch (err) {
      console.error(err);
      alert(
        `Could not generate ZIP: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setPdfBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-brand-700"
            onClick={onBack}
          >
            ← All projects
          </button>
          <h1 className="text-2xl font-bold tracking-tight">{project.label || "Untitled project"}</h1>
          <p className="text-sm text-slate-500">
            {project.contractor.name || "—"} ·{" "}
            {project.project.name || "Project name TBD"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={duplicateWeek}>
            + Duplicate last week
          </Button>
          <Button onClick={addWeek}>+ New week</Button>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-slate-200">
        {(["info", "workers", "weeks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t === "info" ? "Project info" : t === "workers" ? "Workers" : "Weekly payrolls"}
          </button>
        ))}
      </nav>

      {tab === "info" && <ContractorForm project={project} onChange={onChange} />}
      {tab === "workers" && <EmployeeRoster project={project} onChange={onChange} />}
      {tab === "weeks" && (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <SectionCard
            title="Weeks"
            actions={
              project.weeks.length > 1 && (
                <Button
                  variant="secondary"
                  onClick={generateAllPdfs}
                  disabled={pdfBusy !== null}
                >
                  {pdfBusy === "__all__" ? "Building zip…" : "Export all (.zip)"}
                </Button>
              )
            }
          >
            {project.weeks.length === 0 ? (
              <EmptyState
                title="No weeks yet"
                description="Add a weekly payroll to start entering hours."
                action={<Button onClick={addWeek}>+ New week</Button>}
              />
            ) : (
              <ul className="divide-y divide-slate-200">
                {project.weeks.map((w) => (
                  <li key={w.id} className="py-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveWeekId(w.id)}
                      className={`flex-1 text-left px-2 py-1 rounded ${
                        activeWeekId === w.id
                          ? "bg-brand-50 text-brand-700"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-sm font-medium">
                        #{displayPayrollNo(w)} ·{" "}
                        {(() => {
                          try {
                            return format(parseISO(w.weekEnding), "MMM d");
                          } catch {
                            return w.weekEnding;
                          }
                        })()}
                      </div>
                      {w.isFinal && <div className="text-[10px] text-amber-700">FINAL</div>}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline px-1"
                      onClick={() => {
                        if (confirm(`Delete payroll #${displayPayrollNo(w)}?`)) deleteWeek(w.id);
                      }}
                      aria-label="delete week"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <div className="space-y-4">
            {activeWeek ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 shadow-sm">
                    {(["edit", "preview"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setWeekMode(m)}
                        className={`px-3 py-1 text-sm font-medium rounded transition ${
                          weekMode === m
                            ? "bg-brand-600 text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {m === "edit" ? "Edit" : "Preview"}
                      </button>
                    ))}
                  </div>
                  {pdfBusy === activeWeek.id && (
                    <span className="text-xs text-slate-500">Generating PDF…</span>
                  )}
                </div>
                {weekMode === "edit" ? (
                  <WeekEditor
                    project={project}
                    week={activeWeek}
                    onChange={updateWeek}
                    onProjectChange={onChange}
                    onGeneratePdf={() => handleGeneratePdfClick(activeWeek)}
                  />
                ) : (
                  <Wh347Preview project={project} week={activeWeek} />
                )}
              </>
            ) : (
              <SectionCard>
                <EmptyState
                  title="Select a week"
                  description="Pick a week from the list, or create a new one."
                />
              </SectionCard>
            )}
          </div>
        </div>
      )}

      {complianceFor && (
        <StatementOfComplianceDialog
          project={project}
          week={complianceFor}
          onCancel={() => setComplianceFor(null)}
          onSaveAndDownload={(updatedProject, updatedWeek) => {
            onChange(updatedProject);
            setComplianceFor(null);
            generatePdfForWeek(updatedWeek);
          }}
        />
      )}
    </div>
  );
}

function slugify(s: string): string {
  return s.replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "WH347";
}
