import { describe, expect, it } from "vitest";
import type { EmployeeEntry } from "../types/payroll";
import {
  grossAllWork,
  grossThisProject,
  netPay,
  otHours,
  stHours,
  totalDeductions,
  totalHours,
  totalOtherDeductions,
} from "./calc";

/** A week of days; `hours[i] = [st, ot]`. Dates are irrelevant to the arithmetic. */
function entry(hours: Array<[number, number]>, over: Partial<EmployeeEntry> = {}): EmployeeEntry {
  return {
    employeeId: "e1",
    days: hours.map(([st, ot], i) => ({ date: `2026-09-${String(13 + i).padStart(2, "0")}`, st, ot })),
    rateOfPay: 30,
    fringeCredit: 0,
    paymentInLieu: 0,
    deductions: { taxWithholdings: 0, fica: 0, other: [] },
    ...over,
  } as EmployeeEntry;
}

const FORTY: Array<[number, number]> = [[0, 0], [8, 0], [8, 0], [8, 0], [8, 0], [8, 0], [0, 0]];
const FORTY_FIVE: Array<[number, number]> = [[0, 0], [8, 0], [8, 0], [8, 0], [8, 0], [8, 5], [0, 0]];

describe("hours", () => {
  it("sums straight time and overtime separately, and together", () => {
    const e = entry(FORTY_FIVE);
    expect(stHours(e)).toBe(40);
    expect(otHours(e)).toBe(5);
    expect(totalHours(e)).toBe(45);
  });

  it("rounds away floating-point dust (0.1 + 0.2)", () => {
    const e = entry([[0.1, 0], [0.2, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]);
    expect(stHours(e)).toBe(0.3);
  });

  it("treats a blank day as zero", () => {
    const e = entry(FORTY);
    (e.days[1] as unknown as { st: undefined }).st = undefined;
    expect(stHours(e)).toBe(32);
  });
});

describe("gross (columns 7A / 7B)", () => {
  it("is ST x rate for a straight 40", () => {
    expect(grossThisProject(entry(FORTY))).toBe(1200);
  });

  it("pays overtime at time and a half", () => {
    // 40 x 30 + 5 x 45 = 1200 + 225
    expect(grossThisProject(entry(FORTY_FIVE))).toBe(1425);
  });

  it("adds payment in lieu of fringes (6C) on EVERY hour, at the straight rate", () => {
    // 45 h x $4.50 = 202.50
    expect(grossThisProject(entry(FORTY_FIVE, { paymentInLieu: 4.5 }))).toBe(1627.5);
  });

  it("drops the cash fringe in sub mode, leaving the wage", () => {
    expect(grossThisProject(entry(FORTY_FIVE, { paymentInLieu: 4.5 }), { ignoreSubColumns: true })).toBe(1425);
  });

  it("rounds to the cent", () => {
    // 7.25 h x $33.33 = 241.6425
    const e = entry([[7.25, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], { rateOfPay: 33.33 });
    expect(grossThisProject(e)).toBe(241.64);
  });

  it("honours a 7A override, including zero", () => {
    expect(grossThisProject(entry(FORTY, { grossThisProjectOverride: 999.999 }))).toBe(1000);
    expect(grossThisProject(entry(FORTY, { grossThisProjectOverride: 0 }))).toBe(0);
  });

  it("7B defaults to 7A, and takes its own override", () => {
    expect(grossAllWork(entry(FORTY_FIVE))).toBe(1425);
    expect(grossAllWork(entry(FORTY_FIVE, { grossAllWorkOverride: 2000 }))).toBe(2000);
  });
});

describe("deductions and net (columns 8 / 9)", () => {
  const withDeductions = entry(FORTY, {
    deductions: {
      taxWithholdings: 120.5,
      fica: 91.8,
      other: [
        { label: "Union dues", amount: 25 },
        { label: "Tools", amount: 10.25 },
      ],
    },
  } as Partial<EmployeeEntry>);

  it("sums the other deductions", () => {
    expect(totalOtherDeductions(withDeductions)).toBe(35.25);
  });

  it("sums tax, FICA and other", () => {
    expect(totalDeductions(withDeductions)).toBe(247.55);
  });

  it("net is gross for all work less deductions", () => {
    expect(netPay(withDeductions)).toBe(952.45);
  });

  it("net uses the 7B override when the worker had other work that week", () => {
    const e = { ...withDeductions, grossAllWorkOverride: 1500 } as EmployeeEntry;
    expect(netPay(e)).toBe(1252.45);
  });

  it("sub mode shows no deductions, so net equals gross", () => {
    expect(totalDeductions(withDeductions, { ignoreSubColumns: true })).toBe(0);
    expect(netPay(withDeductions, { ignoreSubColumns: true })).toBe(1200);
  });
});
