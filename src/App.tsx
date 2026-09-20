import { useState } from "react";
import { ProjectListView } from "./components/ProjectListView";
import { ProjectDetailView } from "./components/ProjectDetailView";
import { useWorkspace } from "./lib/useWorkspace";
import { makeSampleProject } from "./lib/sample";
import { Button } from "./components/ui";
import { SiteFooter, SiteHeader } from "./components/SiteShell";

export function App() {
  const { workspace, upsertProject, removeProject } = useWorkspace();
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = activeId ? workspace.projects.find((p) => p.id === activeId) : null;

  return (
    <div className="min-h-full flex flex-col">
      <SiteHeader
        current="payroll"
        tagline="WH-347 certified payroll, filled in your browser"
        actions={
          <>
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
              className="text-xs text-[#ecebe4] border border-[#4a4a4d] rounded-lg px-3 py-1.5 hover:bg-brand-700 whitespace-nowrap"
            >
              Official form &amp; instructions ↗
            </a>
          </>
        }
      />

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

      <SiteFooter />
    </div>
  );
}
