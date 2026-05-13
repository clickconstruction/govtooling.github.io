import type { EmployeeProfile, Project } from "../types/payroll";
import { Button, SectionCard } from "./ui";
import { makeEmptyEmployee } from "../lib/factory";

export function EmployeeRoster({
  project,
  onChange,
}: {
  project: Project;
  onChange: (next: Project) => void;
}) {
  const updateEmployee = (id: string, patch: Partial<EmployeeProfile>) => {
    onChange({
      ...project,
      employees: project.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  };

  const removeEmployee = (id: string) => {
    onChange({
      ...project,
      employees: project.employees.filter((e) => e.id !== id),
      weeks: project.weeks.map((w) => ({
        ...w,
        entries: w.entries.filter((entry) => entry.employeeId !== id),
      })),
    });
  };

  const addEmployee = () => {
    onChange({
      ...project,
      employees: [...project.employees, makeEmptyEmployee()],
    });
  };

  return (
    <SectionCard
      title="Workers (roster)"
      actions={<Button onClick={addEmployee}>+ Add worker</Button>}
    >
      {project.employees.length === 0 ? (
        <p className="text-sm text-slate-500">
          Add the workers covered by this contract. Each worker appears in every weekly payroll.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-600 uppercase tracking-wide">
                <th className="py-2 pr-3">Last name (1B)</th>
                <th className="py-2 pr-3">First (1C)</th>
                <th className="py-2 pr-3">MI (1D)</th>
                <th className="py-2 pr-3">ID / SSN-last4 (1E)</th>
                <th className="py-2 pr-3">Status (2)</th>
                <th className="py-2 pr-3">Classification (3)</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {project.employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="py-1.5 pr-3">
                    <input
                      className="w-full px-1.5 py-1 border border-slate-200 rounded bg-white"
                      value={emp.lastName}
                      onChange={(e) => updateEmployee(emp.id, { lastName: e.currentTarget.value })}
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      className="w-full px-1.5 py-1 border border-slate-200 rounded bg-white"
                      value={emp.firstName}
                      onChange={(e) =>
                        updateEmployee(emp.id, { firstName: e.currentTarget.value })
                      }
                    />
                  </td>
                  <td className="py-1.5 pr-3 w-12">
                    <input
                      className="w-full px-1.5 py-1 border border-slate-200 rounded bg-white text-center"
                      maxLength={2}
                      value={emp.middleInitial}
                      onChange={(e) =>
                        updateEmployee(emp.id, { middleInitial: e.currentTarget.value })
                      }
                    />
                  </td>
                  <td className="py-1.5 pr-3 w-28">
                    <input
                      className="w-full px-1.5 py-1 border border-slate-200 rounded bg-white"
                      placeholder="1234"
                      value={emp.identifyingNo}
                      onChange={(e) =>
                        updateEmployee(emp.id, { identifyingNo: e.currentTarget.value })
                      }
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <select
                      className="px-1.5 py-1 border border-slate-200 rounded bg-white"
                      value={emp.status}
                      onChange={(e) =>
                        updateEmployee(emp.id, {
                          status: e.currentTarget.value as EmployeeProfile["status"],
                        })
                      }
                    >
                      <option value="journeyworker">Journeyworker (J)</option>
                      <option value="apprentice">Registered Apprentice (RA)</option>
                    </select>
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      className="w-full px-1.5 py-1 border border-slate-200 rounded bg-white"
                      placeholder="e.g., Carpenter"
                      value={emp.classification}
                      onChange={(e) =>
                        updateEmployee(emp.id, { classification: e.currentTarget.value })
                      }
                    />
                  </td>
                  <td className="py-1.5 pr-3 w-20 text-right">
                    <Button variant="danger" onClick={() => removeEmployee(emp.id)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
