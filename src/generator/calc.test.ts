import { describe, expect, it } from "vitest";
import { defaultDistribute, randomDistribute, totalHours, workweekFor } from "./calc";

describe("workweekFor — which Mon–Fri a check pays for", () => {
  // 2026-09-18 is a Friday.
  const WEEK = { monday: "2026-09-14", friday: "2026-09-18", saturday: "2026-09-19" };

  it("a Friday check covers that same week", () => {
    expect(workweekFor("2026-09-18")).toEqual(WEEK);
  });

  it("a Saturday or Sunday check covers the week that just ended", () => {
    expect(workweekFor("2026-09-19")).toEqual(WEEK);
    expect(workweekFor("2026-09-20")).toEqual(WEEK);
  });

  it("a Monday–Thursday check covers the previous completed week", () => {
    expect(workweekFor("2026-09-21")).toEqual(WEEK);
    expect(workweekFor("2026-09-24")).toEqual(WEEK);
  });

  it("the next Friday rolls to the next week", () => {
    expect(workweekFor("2026-09-25")).toEqual({ monday: "2026-09-21", friday: "2026-09-25", saturday: "2026-09-26" });
  });
});

describe("defaultDistribute — a check amount as Mon–Fri hours", () => {
  it("$1,200 at $30 is five straight eights", () => {
    const d = defaultDistribute(1200, 30);
    expect(d).toEqual({
      mon: { st: 8, ot: 0 }, tue: { st: 8, ot: 0 }, wed: { st: 8, ot: 0 }, thu: { st: 8, ot: 0 }, fri: { st: 8, ot: 0 },
    });
  });

  it("hours past 40 land on Friday as overtime", () => {
    const d = defaultDistribute(1350, 30); // 45 h
    expect(d.fri).toEqual({ st: 8, ot: 5 });
    expect(totalHours(d)).toBe(45);
  });

  it("a short week fills from Monday and stops", () => {
    const d = defaultDistribute(600, 30); // 20 h
    expect([d.mon.st, d.tue.st, d.wed.st, d.thu.st, d.fri.st]).toEqual([8, 8, 4, 0, 0]);
  });

  it("rounds total hours to the quarter hour", () => {
    const d = defaultDistribute(1000, 30); // 33.33 h -> 33.25
    expect(totalHours(d)).toBe(33.25);
    expect(d.fri.st).toBe(1.25);
  });

  it("is all zeros for a zero, negative or non-numeric amount or rate", () => {
    for (const [a, r] of [[0, 30], [-5, 30], [1200, 0], [1200, -1], [NaN, 30], [1200, Infinity]] as const) {
      expect(totalHours(defaultDistribute(a, r))).toBe(0);
    }
  });
});

describe("randomDistribute — same total, spread differently", () => {
  it("KNOWN LIMIT: a check implying more than 80 hours is clamped to 80 (the excess is dropped), unlike defaultDistribute", () => {
    // Documented on spreadQuanta(). Pinned here so a change to it is a decision, not an accident:
    // a clamped week shows fewer hours on the WH-347 than the check paid for.
    expect(totalHours(randomDistribute(2700, 30))).toBe(80); // 90 h implied
    expect(totalHours(defaultDistribute(2700, 30))).toBe(90);
  });


  it("always keeps the total, never more than 8 ST or 8 OT a day, never more than 40 ST", () => {
    for (let i = 0; i < 300; i++) {
      const amount = 300 + i * 7.5;
      const d = randomDistribute(amount, 30);
      const implied = Math.round((amount / 30) * 4) / 4;
      // Up to 80 h (40 ST + 5 x 8 OT) the total is kept exactly.
      expect(totalHours(d)).toBe(Math.min(implied, 80));
      const days = [d.mon, d.tue, d.wed, d.thu, d.fri];
      for (const day of days) {
        expect(day.st).toBeGreaterThanOrEqual(0);
        expect(day.st).toBeLessThanOrEqual(8);
        expect(day.ot).toBeGreaterThanOrEqual(0);
        expect(day.ot).toBeLessThanOrEqual(8);
      }
      expect(days.reduce((s, x) => s + x.st, 0)).toBeLessThanOrEqual(40);
    }
  });
});
