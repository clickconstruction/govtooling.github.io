import { describe, expect, it } from "vitest";
import { derivePayrollNo, displayPayrollNo, weekDaysFor } from "./dates";

describe("payroll number", () => {
  it("is the week-ending date as MMddyyyy, keeping leading zeros", () => {
    expect(derivePayrollNo("2025-03-01")).toBe("03012025");
  });

  it("is empty for a missing or malformed date rather than 'undefined…'", () => {
    expect(derivePayrollNo("")).toBe("");
    expect(derivePayrollNo("2025-03")).toBe("");
  });

  it("shows a customised number, and re-derives for blank or legacy numeric values", () => {
    expect(displayPayrollNo({ payrollNo: "7-R1", weekEnding: "2025-03-01" })).toBe("7-R1");
    expect(displayPayrollNo({ payrollNo: "  ", weekEnding: "2025-03-01" })).toBe("03012025");
    expect(displayPayrollNo({ payrollNo: 3, weekEnding: "2025-03-01" })).toBe("03012025");
  });
});

describe("weekDaysFor", () => {
  it("returns the seven days ending on the week-ending date, oldest first", () => {
    const days = weekDaysFor("2026-09-19");
    expect(days).toHaveLength(7);
    expect(days[0].iso).toBe("2026-09-13");
    expect(days[6].iso).toBe("2026-09-19");
  });

  it("crosses a month boundary", () => {
    const days = weekDaysFor("2026-10-03");
    expect(days.map((d) => d.iso)).toEqual([
      "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03",
    ]);
  });
});
