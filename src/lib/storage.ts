import type { Project, Workspace } from "../types/payroll";

const STORAGE_KEY = "wh347:v1";

export function loadWorkspace(): Workspace {
  if (typeof window === "undefined") return { schemaVersion: 1, projects: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { schemaVersion: 1, projects: [] };
    const parsed = JSON.parse(raw) as Partial<Workspace> | undefined;
    if (!parsed || typeof parsed !== "object") return { schemaVersion: 1, projects: [] };
    if (parsed.schemaVersion !== 1) return { schemaVersion: 1, projects: [] };
    return {
      schemaVersion: 1,
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    };
  } catch (err) {
    console.warn("Failed to load workspace from localStorage:", err);
    return { schemaVersion: 1, projects: [] };
  }
}

export function saveWorkspace(workspace: Workspace): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch (err) {
    console.warn("Failed to save workspace to localStorage:", err);
  }
}

export function exportProjectJson(project: Project): string {
  return JSON.stringify({ schemaVersion: 1, project }, null, 2);
}

export function downloadFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function importProjectJson(text: string): Project {
  const parsed = JSON.parse(text) as unknown;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("project" in parsed) ||
    typeof (parsed as { project: unknown }).project !== "object"
  ) {
    throw new Error("Invalid project file: missing `project` field.");
  }
  return (parsed as { project: Project }).project;
}
