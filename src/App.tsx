import { useState } from "react";
import { ProjectListView } from "./components/ProjectListView";
import { ProjectDetailView } from "./components/ProjectDetailView";
import { useWorkspace } from "./lib/useWorkspace";
import { makeSampleProject } from "./lib/sample";
import { Button } from "./components/ui";

export function App() {
  const { workspace, upsertProject, removeProject } = useWorkspace();
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = activeId ? workspace.projects.find((p) => p.id === activeId) : null;

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 no-print">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-flex items-center justify-center size-8 rounded-md bg-brand-600 text-white font-bold"
            >
              W
            </span>
            <div>
              <h1 className="text-base font-semibold tracking-tight">
                WH-347 Certified Payroll Generator
              </h1>
              <p className="text-xs text-slate-500">
                Davis-Bacon weekly payroll filler · runs entirely in your browser
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {workspace.projects.length === 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  const sample = makeSampleProject();
                  upsertProject(sample);
                  setActiveId(sample.id);
                }}
              >
                Load sample data
              </Button>
            )}
            <a
              href="https://www.dol.gov/agencies/whd/forms/wh347"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-brand-700 underline"
            >
              Official form &amp; instructions
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4">
        {active ? (
          <ProjectDetailView
            project={active}
            onChange={upsertProject}
            onBack={() => setActiveId(null)}
          />
        ) : (
          <ProjectListView
            projects={workspace.projects}
            onSelect={setActiveId}
            onCreate={(p) => {
              upsertProject(p);
              setActiveId(p.id);
            }}
            onDelete={removeProject}
            onImport={(p) => {
              upsertProject(p);
              setActiveId(p.id);
            }}
          />
        )}
      </main>

          <footer className="border-t border-slate-200 bg-white no-print">
            <div className="max-w-[1400px] mx-auto px-4 py-3 text-xs text-slate-500 flex items-center justify-between">
              <span>
                Data stays on this device. Nothing is uploaded.
                {" · "}
                <a
                  href="https://github.com/govtooling2/govtooling2.github.io"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Source
                </a>
                {" · "}
                <a href={`${import.meta.env.BASE_URL}dev.html`} className="underline">
                  Dev calibration
                </a>
                {" · "}
                <a href={`${import.meta.env.BASE_URL}generator.html`} className="underline">
                  Generator
                </a>
              </span>
              <span>This is a formatting tool, not legal advice.</span>
            </div>
          </footer>
    </div>
  );
}
