import { useEffect, useState } from "react";
import { format } from "date-fns";
import type {
  ApprenticeProgram,
  Payroll,
  Project,
  StatementOfCompliance,
} from "../types/payroll";
import { Button, Checkbox, TextInput } from "./ui";

export function StatementOfComplianceDialog({
  project,
  week,
  onCancel,
  onSaveAndDownload,
}: {
  project: Project;
  week: Payroll;
  onCancel: () => void;
  onSaveAndDownload: (updatedProject: Project, updatedWeek: Payroll) => void;
}) {
  const [draft, setDraft] = useState<StatementOfCompliance>(() => ({
    ...project.defaultCompliance,
    signatureDate: project.defaultCompliance.signatureDate || format(new Date(), "yyyy-MM-dd"),
    apprenticePrograms: project.defaultCompliance.apprenticePrograms ?? [],
    phoneDigits: project.defaultCompliance.phoneDigits ?? "",
    email: project.defaultCompliance.email ?? "",
  }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const updateProgram = (i: number, patch: Partial<ApprenticeProgram>) =>
    setDraft((d) => ({
      ...d,
      apprenticePrograms: d.apprenticePrograms.map((p, j) =>
        j === i ? { ...p, ...patch } : p,
      ),
    }));

  const addProgram = () =>
    setDraft((d) => ({
      ...d,
      apprenticePrograms: [
        ...d.apprenticePrograms,
        { programName: "", registeredWith: null, classification: "" },
      ],
    }));

  const removeProgram = (i: number) =>
    setDraft((d) => ({
      ...d,
      apprenticePrograms: d.apprenticePrograms.filter((_, j) => j !== i),
    }));

  const allAcked = Object.values(draft.acknowledgements).every(Boolean);
  const canSign =
    allAcked && draft.certifyingOfficialName.trim() && draft.signatureDate.trim();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <header className="px-5 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Statement of Compliance</h2>
          <p className="text-xs text-slate-500">
            Required on every weekly certified payroll (page 2 of WH-347).
          </p>
        </header>
        <div className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Certifying official's name"
              value={draft.certifyingOfficialName}
              onChange={(e) =>
                setDraft({ ...draft, certifyingOfficialName: e.currentTarget.value })
              }
            />
            <TextInput
              label="Certifying official's title"
              value={draft.certifyingOfficialTitle}
              onChange={(e) =>
                setDraft({ ...draft, certifyingOfficialTitle: e.currentTarget.value })
              }
            />
            <TextInput
              label="Signature date"
              type="date"
              value={draft.signatureDate}
              onChange={(e) => setDraft({ ...draft, signatureDate: e.currentTarget.value })}
            />
            <TextInput
              label="Phone (10 digits)"
              inputMode="numeric"
              placeholder="(555) 555-1234"
              value={formatPhoneForDisplay(draft.phoneDigits)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  phoneDigits: e.currentTarget.value.replace(/\D/g, "").slice(0, 10),
                })
              }
            />
            <TextInput
              label="Email address"
              type="email"
              inputMode="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.currentTarget.value })}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-slate-700">
              I certify the following (all must be checked to sign):
            </legend>
            <Checkbox
              checked={draft.acknowledgements.payrollIsAccurate}
              onChange={(c) =>
                setDraft({
                  ...draft,
                  acknowledgements: { ...draft.acknowledgements, payrollIsAccurate: c },
                })
              }
              label="The payroll information submitted is correct and complete; wage and fringe rates paid are not less than the applicable wage determination."
            />
            <Checkbox
              checked={draft.acknowledgements.recordsWillBeProvided}
              onChange={(c) =>
                setDraft({
                  ...draft,
                  acknowledgements: { ...draft.acknowledgements, recordsWillBeProvided: c },
                })
              }
              label="All regular payrolls and other required records are complete and accurate and will be made available upon request."
            />
            <Checkbox
              checked={draft.acknowledgements.classificationsCorrect}
              onChange={(c) =>
                setDraft({
                  ...draft,
                  acknowledgements: { ...draft.acknowledgements, classificationsCorrect: c },
                })
              }
              label="Classifications reported for each worker reflect the work actually performed."
            />
            <Checkbox
              checked={draft.acknowledgements.apprenticesRegistered}
              onChange={(c) =>
                setDraft({
                  ...draft,
                  acknowledgements: { ...draft.acknowledgements, apprenticesRegistered: c },
                })
              }
              label="Any workers paid as apprentices are duly registered (OA or SAA)."
            />
            <div className="ml-6 space-y-2 border-l-2 border-slate-200 pl-3">
              <p className="text-xs font-semibold text-slate-700">
                Apprenticeship programs (up to 3)
              </p>
              <p className="text-xs text-slate-500">
                List each registered apprenticeship program covering workers paid as
                apprentices this week. Leave empty if you employ no apprentices on this
                contract.
              </p>
              {draft.apprenticePrograms.length === 0 ? (
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 border border-dashed border-slate-300 rounded-md px-3 py-2">
                  <span>No apprentice programs yet.</span>
                  <Button variant="secondary" onClick={addProgram}>
                    + Add program
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {draft.apprenticePrograms.map((prog, i) => (
                    <div
                      key={i}
                      className="border border-slate-200 rounded-md p-3 space-y-2 bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-600">
                          Program {i + 1}
                        </span>
                        <Button variant="ghost" onClick={() => removeProgram(i)}>
                          Remove
                        </Button>
                      </div>
                      <TextInput
                        label="Apprenticeship program name"
                        value={prog.programName}
                        onChange={(e) =>
                          updateProgram(i, { programName: e.currentTarget.value })
                        }
                      />
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={prog.registeredWith === "OA"}
                          onChange={(c) =>
                            updateProgram(i, { registeredWith: c ? "OA" : null })
                          }
                          label="Office of Apprenticeship (OA)"
                        />
                        <Checkbox
                          checked={prog.registeredWith === "SAA"}
                          onChange={(c) =>
                            updateProgram(i, { registeredWith: c ? "SAA" : null })
                          }
                          label="State Apprenticeship Agency (SAA)"
                        />
                      </div>
                      <TextInput
                        label="Labor classification"
                        value={prog.classification}
                        onChange={(e) =>
                          updateProgram(i, { classification: e.currentTarget.value })
                        }
                      />
                    </div>
                  ))}
                  {draft.apprenticePrograms.length < 3 && (
                    <Button variant="secondary" onClick={addProgram}>
                      + Add program
                    </Button>
                  )}
                </div>
              )}
            </div>
            <Checkbox
              checked={draft.acknowledgements.fringeBenefitsPaid}
              onChange={(c) =>
                setDraft({
                  ...draft,
                  acknowledgements: { ...draft.acknowledgements, fringeBenefitsPaid: c },
                })
              }
              label="Fringe benefits have been paid in cash and/or to bona fide fringe benefit plans."
            />
            <Checkbox
              checked={draft.acknowledgements.workersPaidFullWages}
              onChange={(c) =>
                setDraft({
                  ...draft,
                  acknowledgements: { ...draft.acknowledgements, workersPaidFullWages: c },
                })
              }
              label="All workers on the project have been paid the full weekly wages earned, and no rebates or deductions have been or will be made either directly or indirectly, other than permissible deductions as defined in 29 CFR part 3."
            />
          </fieldset>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Remarks / exceptions (optional)
            <textarea
              rows={3}
              className="px-2 py-1.5 rounded-md border border-slate-300 bg-white shadow-sm text-sm"
              value={draft.remarks}
              onChange={(e) => setDraft({ ...draft, remarks: e.currentTarget.value })}
            />
          </label>
        </div>
        <footer className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!canSign}
            onClick={() => {
              const cleaned: StatementOfCompliance = {
                ...draft,
                apprenticePrograms: draft.apprenticePrograms.filter(
                  (p) =>
                    p.programName.trim() ||
                    p.classification.trim() ||
                    p.registeredWith,
                ),
              };
              const updatedProject: Project = {
                ...project,
                defaultCompliance: cleaned,
              };
              onSaveAndDownload(updatedProject, week);
            }}
          >
            Sign &amp; download PDF
          </Button>
        </footer>
      </div>
    </div>
  );
}

function formatPhoneForDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
