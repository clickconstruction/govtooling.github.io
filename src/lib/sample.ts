import { nanoid } from "nanoid";
import { addDays, format } from "date-fns";
import type { EmployeeEntry, EmployeeProfile, Project } from "../types/payroll";
import { EMPTY_COMPLIANCE } from "../types/payroll";
import { nextSundayISO } from "./factory";
import { derivePayrollNo } from "./dates";

function buildEntries(
  employees: EmployeeProfile[],
  weekEnding: string,
  hours: { st: number[]; ot: number[] }[],
  rates: { rate: number; fringe: number; cash: number; fica: number; fed: number }[],
): EmployeeEntry[] {
  const start = addDays(new Date(weekEnding), -6);
  const days = Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
  return employees.map((emp, idx) => ({
    employeeId: emp.id,
    days: days.map((date, i) => ({
      date,
      st: hours[idx]?.st[i] ?? 0,
      ot: hours[idx]?.ot[i] ?? 0,
    })),
    rateOfPay: rates[idx]?.rate ?? 0,
    fringeCredit: rates[idx]?.fringe ?? 0,
    paymentInLieu: rates[idx]?.cash ?? 0,
    deductions: {
      taxWithholdings: rates[idx]?.fed ?? 0,
      fica: rates[idx]?.fica ?? 0,
      other: [],
    },
  }));
}

export function makeSampleProject(): Project {
  const now = new Date().toISOString();
  const employees: EmployeeProfile[] = [
    {
      id: nanoid(8),
      lastName: "Hernandez",
      firstName: "Maria",
      middleInitial: "L",
      identifyingNo: "4823",
      status: "journeyworker",
      classification: "Carpenter",
    },
    {
      id: nanoid(8),
      lastName: "Robinson",
      firstName: "Daniel",
      middleInitial: "K",
      identifyingNo: "7741",
      status: "journeyworker",
      classification: "Electrician",
    },
    {
      id: nanoid(8),
      lastName: "Patel",
      firstName: "Anika",
      middleInitial: "",
      identifyingNo: "1029",
      status: "apprentice",
      classification: "Carpenter Apprentice (Period 2)",
    },
  ];

  const weekEnding1 = nextSundayISO();
  const weekEnding2 = format(addDays(new Date(weekEnding1), 7), "yyyy-MM-dd");

  const baseHours = [
    { st: [0, 8, 8, 8, 8, 8, 0], ot: [0, 0, 0, 0, 0, 4, 0] },
    { st: [0, 8, 8, 8, 8, 6, 0], ot: [0, 0, 0, 0, 0, 0, 0] },
    { st: [0, 6, 6, 6, 6, 6, 0], ot: [0, 0, 0, 0, 0, 0, 0] },
  ];

  const rates = [
    { rate: 38.5, fringe: 12.3, cash: 0, fica: 0, fed: 0 },
    { rate: 42.0, fringe: 14.0, cash: 0, fica: 0, fed: 0 },
    { rate: 24.5, fringe: 7.5, cash: 0, fica: 0, fed: 0 },
  ];

  return {
    id: nanoid(8),
    label: "Sample Federal Highway project",
    contractor: {
      name: "Northwind Construction LLC",
      address: "123 Industrial Way, Springfield, IL 62704",
      role: "prime",
    },
    project: {
      name: "I-72 Bridge Rehabilitation",
      location: "Springfield, IL",
      projectNo: "FHWA-72-2026-014",
      wageDeterminationNo: "IL20240001 mod 5",
    },
    employees,
    weeks: [
      {
        id: nanoid(8),
        payrollNo: derivePayrollNo(weekEnding1),
        weekEnding: weekEnding1,
        isFinal: false,
        entries: buildEntries(employees, weekEnding1, baseHours, rates),
      },
      {
        id: nanoid(8),
        payrollNo: derivePayrollNo(weekEnding2),
        weekEnding: weekEnding2,
        isFinal: false,
        entries: buildEntries(employees, weekEnding2, baseHours, rates),
      },
    ],
    defaultCompliance: {
      ...EMPTY_COMPLIANCE,
      certifyingOfficialName: "Pat Owens",
      certifyingOfficialTitle: "Payroll Administrator",
    },
    createdAt: now,
    updatedAt: now,
  };
}
