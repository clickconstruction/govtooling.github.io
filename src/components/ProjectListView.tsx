import { useRef } from "react";
import type { Project } from "../types/payroll";
import { Button, EmptyState, SectionCard } from "./ui";
import { makeEmptyProject } from "../lib/factory";
import { exportProjectJson, importProjectJson, downloadFile } from "../lib/storage";

export function ProjectListView({
  projects,
  onSelect,
  onCreate,
  onDelete,
  onImport,
}: {
  projects: Project[];
  onSelect: (id: string) => void;
  onCreate: (p: Project) => void;
  onDelete: (id: string) => void;
  onImport: (p: Project) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const project = importProjectJson(text);
      onImport(project);
    } catch (err) {
      alert(`Could not import: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      e.currentTarget.value = "";
    }
  };

  return (
    <SectionCard
      title="Projects"
      actions={
        <>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Import JSON
          </Button>
          <Button onClick={() => onCreate(makeEmptyProject("Untitled project"))}>
            + New project
          </Button>
        </>
      }
    >
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project to start filling weekly WH-347 forms."
          action={
            <Button onClick={() => onCreate(makeEmptyProject("Untitled project"))}>
              Create your first project
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-200">
          {projects.map((p) => (
            <li
              key={p.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className="flex-1 text-left group"
              >
                <div className="text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                  {p.label || "Untitled project"}
                </div>
                <div className="text-xs text-slate-500">
                  {p.contractor.name || "No contractor"} ·{" "}
                  {p.weeks.length} {p.weeks.length === 1 ? "week" : "weeks"} ·{" "}
                  {p.employees.length}{" "}
                  {p.employees.length === 1 ? "worker" : "workers"}
                </div>
              </button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    downloadFile(
                      `${(p.label || "project").replace(/[^\w-]+/g, "_")}.json`,
                      new Blob([exportProjectJson(p)], { type: "application/json" }),
                    )
                  }
                >
                  Export
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm(`Delete "${p.label || "Untitled project"}"? This cannot be undone.`)) {
                      onDelete(p.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
