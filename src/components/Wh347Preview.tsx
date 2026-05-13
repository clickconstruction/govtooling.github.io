import { Fragment, useMemo } from "react";
import { format, parseISO } from "date-fns";
import type { Payroll, Project } from "../types/payroll";
import {
  grossAllWork,
  grossThisProject,
  netPay,
  otHours,
  stHours,
  totalDeductions,
  totalOtherDeductions,
} from "../lib/calc";
import { displayPayrollNo } from "../lib/dates";

/**
 * On-screen HTML preview that approximates the official WH-347 layout. This is
 * for quick visual QA in the browser — the downloadable PDF is produced by
 * `fillWh347` which writes onto the actual DOL PDF.
 */
export function Wh347Preview({ project, week }: { project: Project; week: Payroll }) {
  const hideSubCols = !!project.hideSubColumns;
  const calcOpts = { ignoreSubColumns: hideSubCols } as const;
  const dayHeaderDates = useMemo(() => {
    const first = week.entries[0];
    if (!first) return Array(7).fill("");
    return first.days.map((d) => {
      try {
        return format(parseISO(d.date), "EEE M/d");
      } catch {
        return "";
      }
    });
  }, [week.entries]);

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-x-auto">
      <div className="p-4 text-[10px] leading-tight font-sans" style={{ minWidth: 1024 }}>
        <div className="border border-slate-800 px-2 py-1 flex justify-between items-start gap-2 text-[11px]">
          <div className="flex-1">
            <div className="font-semibold uppercase tracking-wide">U.S. Department of Labor</div>
            <div className="text-[9px]">Wage and Hour Division</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-[13px] font-bold">
              Davis-Bacon and Related Acts Weekly Certified Payroll Form
            </div>
            <div className="text-[9px] italic">For Contractor's Optional Use</div>
          </div>
          <div className="text-right text-[9px]">
            Rev. January 2025
            <br />
            OMB No.: 1235-0008
            <br />
            Expires: 01/31/2028
          </div>
        </div>

        <div className="border-l border-r border-slate-800 px-2 py-1 flex items-center gap-4 text-[11px]">
          <label className="flex items-center gap-1">
            <span
              className={`inline-block size-3 border border-slate-800 ${week.isFinal ? "bg-slate-800" : ""}`}
            />
            SUBMISSION OF FINAL DBRA CERTIFIED PAYROLL FORM
          </label>
          <span className="ml-auto inline-flex gap-2 items-center">
            <label className="flex items-center gap-1">
              <span
                className={`inline-block size-3 border border-slate-800 ${project.contractor.role === "prime" ? "bg-slate-800" : ""}`}
              />
              PRIME CONTRACTOR
            </label>
            <label className="flex items-center gap-1">
              <span
                className={`inline-block size-3 border border-slate-800 ${project.contractor.role === "sub" ? "bg-slate-800" : ""}`}
              />
              SUBCONTRACTOR
            </label>
          </span>
        </div>

        <table className="w-full border-collapse border border-slate-800 text-[10px]">
          <thead>
            <tr>
              <Th>PROJECT NAME</Th>
              <Th>PROJECT NO. or CONTRACT NO.</Th>
              <Th>CERTIFIED PAYROLL NO.</Th>
              <Th>PRIME CONTRACTOR'S/SUBCONTRACTOR'S BUSINESS NAME</Th>
            </tr>
            <tr>
              <Td>{project.project.name}</Td>
              <Td>{project.project.projectNo}</Td>
              <Td>{displayPayrollNo(week)}</Td>
              <Td>{project.contractor.name}</Td>
            </tr>
            <tr>
              <Th>PROJECT LOCATION</Th>
              <Th>WAGE DETERMINATION NO.</Th>
              <Th>WEEK ENDING DATE</Th>
              <Th>PRIME CONTRACTOR'S/SUBCONTRACTOR'S BUSINESS ADDRESS</Th>
            </tr>
            <tr>
              <Td>{project.project.location}</Td>
              <Td>{project.project.wageDeterminationNo}</Td>
              <Td>
                {(() => {
                  try {
                    return format(parseISO(week.weekEnding), "MM/dd/yyyy");
                  } catch {
                    return week.weekEnding;
                  }
                })()}
              </Td>
              <Td>{project.contractor.address}</Td>
            </tr>
          </thead>
        </table>

        <table className="w-full border-collapse border border-slate-800 text-[9px] mt-0">
          <thead className="bg-slate-100">
            <tr>
              <Th rowSpan={2} className="w-10">
                (1A)
                <br />
                #
              </Th>
              <Th rowSpan={2}>(1B) Last Name</Th>
              <Th rowSpan={2}>(1C) First</Th>
              <Th rowSpan={2} className="w-8">
                (1D) MI
              </Th>
              <Th rowSpan={2} className="w-14">
                (1E) ID #
              </Th>
              <Th rowSpan={2} className="w-10">
                (2)
                <br />
                J / RA
              </Th>
              <Th rowSpan={2}>(3) Classification</Th>
              <Th className="w-6">ST/OT</Th>
              {dayHeaderDates.map((d, i) => (
                <Th key={i} className="w-10 text-center">
                  {d}
                </Th>
              ))}
              <Th rowSpan={2} className="w-12">
                (5) Total
              </Th>
              <Th rowSpan={2} className="w-12">
                (6A) Rate
              </Th>
              {!hideSubCols && (
                <Th rowSpan={2} className="w-12">
                  (6B) Fringe
                </Th>
              )}
              {!hideSubCols && (
                <Th rowSpan={2} className="w-12">
                  (6C) Cash
                </Th>
              )}
              <Th rowSpan={2} className="w-14">
                (7A) Gross
              </Th>
              <Th rowSpan={2} className="w-14">
                (7B) Gross All
              </Th>
              {!hideSubCols && (
                <Th rowSpan={2} className="w-12">
                  Tax W/H
                </Th>
              )}
              {!hideSubCols && (
                <Th rowSpan={2} className="w-12">
                  FICA
                </Th>
              )}
              {!hideSubCols && (
                <Th rowSpan={2} className="w-12">
                  Other
                </Th>
              )}
              {!hideSubCols && (
                <Th rowSpan={2} className="w-12">
                  Total Ded
                </Th>
              )}
              <Th rowSpan={2} className="w-14">
                (9) Net
              </Th>
            </tr>
            <tr>
              <Th className="text-center">
                ST
                <br />
                OT
              </Th>
            </tr>
          </thead>
          <tbody>
            {project.employees.map((emp, idx) => {
              const entry = week.entries.find((e) => e.employeeId === emp.id);
              if (!entry) return null;
              const stT = stHours(entry);
              return (
                <Fragment key={emp.id}>
                  <Tr>
                    <Td rowSpan={2} className="text-center">
                      {idx + 1}
                    </Td>
                    <Td rowSpan={2}>{emp.lastName}</Td>
                    <Td rowSpan={2}>{emp.firstName}</Td>
                    <Td rowSpan={2} className="text-center">
                      {emp.middleInitial}
                    </Td>
                    <Td rowSpan={2} className="text-center">
                      {emp.identifyingNo}
                    </Td>
                    <Td rowSpan={2} className="text-center">
                      {emp.status === "apprentice" ? "RA" : "J"}
                    </Td>
                    <Td rowSpan={2}>{emp.classification}</Td>
                    <Td className="text-center font-semibold">ST</Td>
                    {entry.days.map((d, i) => (
                      <Td key={`st-${i}`} className="text-center">
                        {d.st || ""}
                      </Td>
                    ))}
                    <Td className="text-right">{stT || ""}</Td>
                    <Td rowSpan={2} className="text-right">
                      {entry.rateOfPay.toFixed(2)}
                    </Td>
                    {!hideSubCols && (
                      <Td rowSpan={2} className="text-right">
                        {entry.fringeCredit.toFixed(2)}
                      </Td>
                    )}
                    {!hideSubCols && (
                      <Td rowSpan={2} className="text-right">
                        {entry.paymentInLieu.toFixed(2)}
                      </Td>
                    )}
                    <Td rowSpan={2} className="text-right">
                      {grossThisProject(entry, calcOpts).toFixed(2)}
                    </Td>
                    <Td rowSpan={2} className="text-right">
                      {grossAllWork(entry, calcOpts).toFixed(2)}
                    </Td>
                    {!hideSubCols && (
                      <Td rowSpan={2} className="text-right">
                        {entry.deductions.taxWithholdings.toFixed(2)}
                      </Td>
                    )}
                    {!hideSubCols && (
                      <Td rowSpan={2} className="text-right">
                        {entry.deductions.fica.toFixed(2)}
                      </Td>
                    )}
                    {!hideSubCols && (
                      <Td rowSpan={2} className="text-right">
                        {totalOtherDeductions(entry).toFixed(2)}
                      </Td>
                    )}
                    {!hideSubCols && (
                      <Td rowSpan={2} className="text-right">
                        {totalDeductions(entry).toFixed(2)}
                      </Td>
                    )}
                    <Td rowSpan={2} className="text-right font-semibold">
                      {netPay(entry, calcOpts).toFixed(2)}
                    </Td>
                  </Tr>
                  <tr>
                    <Td className="text-center font-semibold">OT</Td>
                    {entry.days.map((d, i) => (
                      <Td key={`ot-${i}`} className="text-center">
                        {d.ot || ""}
                      </Td>
                    ))}
                    <Td className="text-right">{otHours(entry) || ""}</Td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>

        <p className="text-[9px] text-slate-500 mt-2">
          This is an HTML approximation; the downloadable PDF uses the official DOL form layout
          exactly.
        </p>
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
  ...rest
}: React.ThHTMLAttributes<HTMLTableCellElement> & { className?: string }) {
  return (
    <th
      className={`border border-slate-800 px-1 py-0.5 font-semibold text-[8px] uppercase text-slate-700 ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { className?: string }) {
  return (
    <td className={`border border-slate-800 px-1 py-0.5 align-top ${className}`} {...rest}>
      {children}
    </td>
  );
}

function Tr({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tr className={className}>{children}</tr>;
}
