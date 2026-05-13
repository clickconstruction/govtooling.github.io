import type { Project } from "../types/payroll";
import { SectionCard, TextInput } from "./ui";

export function ContractorForm({
  project,
  onChange,
}: {
  project: Project;
  onChange: (next: Project) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionCard title="Contractor and project information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Project label (internal)"
            value={project.label}
            onChange={(e) => onChange({ ...project, label: e.currentTarget.value })}
            hint="Used in the project list — does not appear on the form."
          />

          <div>
            <span className="text-xs font-medium text-slate-700">Role on contract</span>
            <div className="mt-1 flex gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="role"
                  checked={project.contractor.role === "prime"}
                  onChange={() =>
                    onChange({
                      ...project,
                      contractor: { ...project.contractor, role: "prime" },
                    })
                  }
                />{" "}
                Prime contractor
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="role"
                  checked={project.contractor.role === "sub"}
                  onChange={() =>
                    onChange({
                      ...project,
                      contractor: { ...project.contractor, role: "sub" },
                    })
                  }
                />{" "}
                Subcontractor
              </label>
            </div>
          </div>

          <TextInput
            label="Business name"
            value={project.contractor.name}
            onChange={(e) =>
              onChange({
                ...project,
                contractor: { ...project.contractor, name: e.currentTarget.value },
              })
            }
          />
          <TextInput
            label="Business address"
            value={project.contractor.address}
            onChange={(e) =>
              onChange({
                ...project,
                contractor: { ...project.contractor, address: e.currentTarget.value },
              })
            }
          />

          <TextInput
            label="Project name"
            value={project.project.name}
            onChange={(e) =>
              onChange({
                ...project,
                project: { ...project.project, name: e.currentTarget.value },
              })
            }
          />
          <TextInput
            label="Project location"
            value={project.project.location}
            onChange={(e) =>
              onChange({
                ...project,
                project: { ...project.project, location: e.currentTarget.value },
              })
            }
          />
          <TextInput
            label="Project or contract no."
            value={project.project.projectNo}
            onChange={(e) =>
              onChange({
                ...project,
                project: { ...project.project, projectNo: e.currentTarget.value },
              })
            }
          />
          <TextInput
            label="Wage determination no."
            value={project.project.wageDeterminationNo}
            onChange={(e) =>
              onChange({
                ...project,
                project: {
                  ...project.project,
                  wageDeterminationNo: e.currentTarget.value,
                },
              })
            }
          />
        </div>
      </SectionCard>

      <SectionCard title="Special Settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Prevailing Wage (default Rate 6A)"
            type="number"
            step="0.01"
            min={0}
            value={project.prevailingWage ?? ""}
            onChange={(e) => {
              const n = e.currentTarget.valueAsNumber;
              onChange({
                ...project,
                prevailingWage:
                  Number.isFinite(n) && n > 0 ? n : undefined,
              });
            }}
            hint="Used as the default Rate (6A) when a new week is created or a worker is added to the roster. Existing rates are never overwritten."
          />
        </div>
      </SectionCard>
    </div>
  );
}
