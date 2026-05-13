/**
 * Build a `SampleTextMap` from a `Project` + `Payroll`, keyed by the same
 * registered anchor IDs the renderer uses. Mirrors the string derivation in
 * `fillWh347.ts` so the "Load from sample project" button on /dev seeds the
 * dev sample map with the exact same values the production fill would draw.
 *
 * Empty strings and false booleans are omitted so the map stays sparse and
 * `Object.keys(map).length` is a useful "populated" count.
 */

import type { Payroll, Project } from "../../types/payroll";
import {
  grossAllWork,
  grossThisProject,
  netPay,
  otHours,
  stHours,
  totalDeductions,
  totalOtherDeductions,
} from "../calc";
import { WH347_PAGE } from "./wh347Layout";
import { dayId, rowId } from "./anchorRegistry";
import { fmtDate, fmtHours, fmtMoney } from "./formatters";
import type { SampleTextMap, SampleValue } from "./sampleText";
import { displayPayrollNo, weekDaysFor } from "../dates";

export function buildSampleMap(project: Project, week: Payroll): SampleTextMap {
  const map: SampleTextMap = {};
  const set = (id: string, value: SampleValue) => {
    if (typeof value === "string") {
      if (value.length === 0) return;
    } else if (!value) {
      return;
    }
    map[id] = value;
  };

  // ---- Page 1 header ----
  set("HEADER_P1.finalSubmissionCheck", week.isFinal);
  set("HEADER_P1.primeContractorCheck", project.contractor.role === "prime");
  set("HEADER_P1.subcontractorCheck", project.contractor.role !== "prime");
  set("HEADER_P1.projectName", project.project.name);
  set("HEADER_P1.projectNo", project.project.projectNo);
  set("HEADER_P1.payrollNo", displayPayrollNo(week));
  set("HEADER_P1.businessName", project.contractor.name);
  set("HEADER_P1.projectLocation", project.project.location);
  set("HEADER_P1.wageDeterminationNo", project.project.wageDeterminationNo);
  set("HEADER_P1.weekEndingDate", fmtDate(week.weekEnding));
  set("HEADER_P1.businessAddress", project.contractor.address);

  // ---- Page 1 day-of-week + date header row ----
  weekDaysFor(week.weekEnding).forEach((d, i) => {
    set(`DAY_HEADER.letter@day=${i}`, d.letter);
    // Stacked "M/" \n "dd" - PDF draws two lines; this seed value is what
    // the dev page shows inside the overlay box for inspection.
    set(`DAY_HEADER.date@day=${i}`, `${d.monthLine}\n${d.dayLine}`);
  });

  // ---- Page 1 rows ----
  const visibleEntries = week.entries.slice(0, WH347_PAGE.rowsPerPage);
  visibleEntries.forEach((entry, rowIndex) => {
    const profile = project.employees.find((e) => e.id === entry.employeeId);
    if (!profile) return;
    const rx = (key: string) => rowId("ROW_X", key, rowIndex);

    set(rx("entryNo"), String(rowIndex + 1));
    set(rx("lastName"), profile.lastName);
    set(rx("firstName"), profile.firstName);
    set(rx("middleInitial"), (profile.middleInitial || "").slice(0, 1));
    set(rx("identifyingNo"), profile.identifyingNo);

    if (profile.status === "journeyworker") {
      set(rx("journeyworkerCheck"), "J");
    } else {
      set(rx("apprenticeCheck"), "RA");
    }

    set(rx("classification"), profile.classification);

    entry.days.forEach((d, dayIndex) => {
      set(dayId("st", rowIndex, dayIndex), fmtHours(d.st));
      set(dayId("ot", rowIndex, dayIndex), fmtHours(d.ot));
    });

    set(rx("totalHours"), fmtHours(stHours(entry)));
    set(rx("totalHoursOT"), fmtHours(otHours(entry)));
    set(rx("rateOfPay"), fmtMoney(entry.rateOfPay));
    set(rx("fringeCredit"), fmtMoney(entry.fringeCredit));
    set(rx("paymentInLieu"), fmtMoney(entry.paymentInLieu));
    set(rx("grossThisProject"), fmtMoney(grossThisProject(entry)));
    set(rx("grossAllWork"), fmtMoney(grossAllWork(entry)));
    set(rx("taxWithholdings"), fmtMoney(entry.deductions.taxWithholdings));
    set(rx("fica"), fmtMoney(entry.deductions.fica));
    set(rx("otherDeductions"), fmtMoney(totalOtherDeductions(entry)));
    set(rx("totalDeductions"), fmtMoney(totalDeductions(entry)));
    set(rx("netPay"), fmtMoney(netPay(entry)));
  });

  // ---- Page 2 header ----
  set("HEADER_P2.projectName", project.project.name);
  set("HEADER_P2.projectNo", project.project.projectNo);
  set("HEADER_P2.payrollNo", displayPayrollNo(week));
  set("HEADER_P2.businessName", project.contractor.name);
  set("HEADER_P2.projectLocation", project.project.location);
  set("HEADER_P2.weekEndingDate", fmtDate(week.weekEnding));
  set(
    "HEADER_P2.certifyingOfficial",
    [
      project.defaultCompliance.certifyingOfficialName,
      project.defaultCompliance.certifyingOfficialTitle,
    ]
      .filter(Boolean)
      .join(", "),
  );

  // ---- Page 2 acknowledgements ----
  const acks = project.defaultCompliance.acknowledgements;
  set("ACK_P2.ack1", acks.payrollIsAccurate);
  set("ACK_P2.ack2", acks.recordsWillBeProvided);
  set("ACK_P2.ack3", acks.classificationsCorrect);
  set("ACK_P2.ack4", acks.apprenticesRegistered);
  set("ACK_P2.ack5", acks.fringeBenefitsPaid);
  set("ACK_P2.ack6", acks.workersPaidFullWages);

  // ---- Page 2 apprentice rows ----
  (project.defaultCompliance.apprenticePrograms ?? []).slice(0, 3).forEach((prog, i) => {
    set(`APPRENTICE.programName@row=${i}`, prog.programName);
    set(`APPRENTICE.classification@row=${i}`, prog.classification);
    if (prog.registeredWith === "OA") set(`APPRENTICE.oaCheck@row=${i}`, true);
    if (prog.registeredWith === "SAA") set(`APPRENTICE.saaCheck@row=${i}`, true);
  });

  // ---- Page 2 signature block ----
  set("SIGNATURE_BLOCK.remarks", project.defaultCompliance.remarks);
  set("SIGNATURE_BLOCK.signature", project.defaultCompliance.certifyingOfficialName);
  set("SIGNATURE_BLOCK.printedName", project.defaultCompliance.certifyingOfficialName);
  set("SIGNATURE_BLOCK.title", project.defaultCompliance.certifyingOfficialTitle);
  set("SIGNATURE_BLOCK.date", fmtDate(project.defaultCompliance.signatureDate));

  const samplePhone = (project.defaultCompliance.phoneDigits ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);
  for (let d = 0; d < 10; d++) {
    const ch = samplePhone[d];
    if (ch) set(`SIGNATURE_BLOCK.phone@digit=${d}`, ch);
  }
  set("SIGNATURE_BLOCK.email", project.defaultCompliance.email ?? "");

  return map;
}
