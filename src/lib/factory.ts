import { nanoid } from "nanoid";
import { addDays, format, parseISO } from "date-fns";
import {
  EMPTY_COMPLIANCE,
  type EmployeeEntry,
  type EmployeeProfile,
  type Payroll,
  type Project,
} from "../types/payroll";
import { derivePayrollNo } from "./dates";

export function makeEmptyEmployee(): EmployeeProfile {
  return {
    id: nanoid(8),
    lastName: "",
    firstName: "",
    middleInitial: "",
    identifyingNo: "",
    status: "journeyworker",
    classification: "",
  };
}

export function makeEmptyEntry(
  employeeId: string,
  weekEndingISO: string,
  defaultRate = 0,
): EmployeeEntry {
  const weekEnd = parseISO(weekEndingISO);
  const startOfWeek = addDays(weekEnd, -6);
  const days = Array.from({ length: 7 }, (_, i) => ({
    date: format(addDays(startOfWeek, i), "yyyy-MM-dd"),
    st: 0,
    ot: 0,
  }));
  return {
    employeeId,
    days,
    rateOfPay: defaultRate,
    fringeCredit: 0,
    paymentInLieu: 0,
    deductions: { taxWithholdings: 0, fica: 0, other: [] },
  };
}

export function makeEmptyPayroll(
  weekEnding: string,
  employees: EmployeeProfile[],
  defaultRate = 0,
): Payroll {
  return {
    id: nanoid(8),
    payrollNo: derivePayrollNo(weekEnding),
    weekEnding,
    isFinal: false,
    entries: employees.map((e) => makeEmptyEntry(e.id, weekEnding, defaultRate)),
  };
}

export function nextSundayISO(from: Date = new Date()): string {
  const dow = from.getDay();
  const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
  return format(addDays(from, daysUntilSunday), "yyyy-MM-dd");
}

export function makeEmptyProject(label: string = "New Project"): Project {
  const now = new Date().toISOString();
  return {
    id: nanoid(8),
    label,
    contractor: { name: "", address: "", role: "prime" },
    project: { name: "", location: "", projectNo: "", wageDeterminationNo: "" },
    employees: [],
    weeks: [],
    defaultCompliance: structuredClone(EMPTY_COMPLIANCE),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Duplicate the most recent week, bump the payroll number, advance the
 * week-ending date by 7 days, and zero out hours/deductions. Preserves
 * employee classifications, rates, and fringe info from the previous week.
 */
export function duplicateLastWeek(project: Project): Payroll {
  const last = project.weeks[project.weeks.length - 1];
  const baseWeekEnding = last ? last.weekEnding : nextSundayISO();
  const nextWeekEnding = last
    ? format(addDays(parseISO(last.weekEnding), 7), "yyyy-MM-dd")
    : baseWeekEnding;

  if (!last) {
    return makeEmptyPayroll(
      nextWeekEnding,
      project.employees,
      project.prevailingWage ?? 0,
    );
  }

  return {
    id: nanoid(8),
    payrollNo: derivePayrollNo(nextWeekEnding),
    weekEnding: nextWeekEnding,
    isFinal: false,
    entries: last.entries.map((prev): EmployeeEntry => {
      const fresh = makeEmptyEntry(prev.employeeId, nextWeekEnding);
      return {
        ...fresh,
        rateOfPay: prev.rateOfPay || project.prevailingWage || 0,
        fringeCredit: prev.fringeCredit,
        paymentInLieu: prev.paymentInLieu,
      };
    }),
  };
}
