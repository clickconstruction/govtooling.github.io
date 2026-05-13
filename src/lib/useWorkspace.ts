import { useCallback, useEffect, useRef, useState } from "react";
import type { Project, Workspace } from "../types/payroll";
import { loadWorkspace, saveWorkspace } from "./storage";

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspace());
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    saveWorkspace(workspace);
  }, [workspace]);

  const upsertProject = useCallback((project: Project) => {
    setWorkspace((w) => {
      const next = { ...project, updatedAt: new Date().toISOString() };
      const idx = w.projects.findIndex((p) => p.id === project.id);
      const projects = idx >= 0 ? w.projects.toSpliced(idx, 1, next) : [...w.projects, next];
      return { ...w, projects };
    });
  }, []);

  const removeProject = useCallback((id: string) => {
    setWorkspace((w) => ({ ...w, projects: w.projects.filter((p) => p.id !== id) }));
  }, []);

  const replaceWorkspace = useCallback((next: Workspace) => {
    setWorkspace(next);
  }, []);

  return {
    workspace,
    upsertProject,
    removeProject,
    replaceWorkspace,
  };
}
