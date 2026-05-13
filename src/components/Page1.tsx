import { FORM_META } from "../constants";
import type { EmployeeRow, WeekDayHeader, Wh347FormState } from "../types/wh347";
import { VerticalHeaderBody } from "./VerticalHeaderBody";
import { PAYROLL_COL_PCT } from "../wh347-colwidths";
import { sumWeekHours } from "../utils/hours";

const ROWS_PER_FIRST_PAGE = 8;

type Props = {
  state: Wh347FormState;
  onChange: (next: Partial<Wh347FormState>) => void;
  onEmployeeChange: (index: number, row: EmployeeRow) => void;
};

export function Page1({ state, onChange, onEmployeeChange }: Props) {
  const { employees, weekDayHeaders } = state;

  const firstBlock = employees.slice(0, ROWS_PER_FIRST_PAGE);
  const continuationBlocks: EmployeeRow[][] = [];
  if (employees.length > ROWS_PER_FIRST_PAGE) {
    for (let i = ROWS_PER_FIRST_PAGE; i < employees.length; i += ROWS_PER_FIRST_PAGE) {
      continuationBlocks.push(employees.slice(i, i + ROWS_PER_FIRST_PAGE));
    }
  }

  return (
    <section className="wh-page wh-page--p1">
      <p className="wh-optional">{FORM_META.optionalUseNote}</p>
      <p className="wh-small">
        Unless otherwise noted, the information requested is specific to the named project
        below. Persons are not required to respond to the collection of information unless it
        displays a currently valid OMB control number.
      </p>

      <div className="wh-topgrid">
        <div className="wh-checks">
          <label className="wh-check">
            <input
              type="checkbox"
              checked={state.isFinalPayroll}
              onChange={(e) => onChange({ isFinalPayroll: e.target.checked })}
            />
            SUBMISSION OF FINAL DBRA CERTIFIED PAYROLL FORM
          </label>
          <label className="wh-check">
            <input
              type="radio"
              name="prime-sub"
              checked={state.contractorRole === "prime"}
              onChange={() => onChange({ contractorRole: "prime" })}
            />
            PRIME CONTRACTOR
          </label>
          <label className="wh-check">
            <input
              type="radio"
              name="prime-sub"
              checked={state.contractorRole === "sub"}
              onChange={() => onChange({ contractorRole: "sub" })}
            />
            SUBCONTRACTOR
          </label>
        </div>
        <div className="wh-revomb">
          <div>Rev. {FORM_META.revision}</div>
          <div>
            OMB No.: {FORM_META.omb}
          </div>
          <div>Expires: {FORM_META.expires}</div>
        </div>
      </div>

      <div className="wh-dolhead">
        <div className="wh-dolhead__dept">{FORM_META.department}</div>
        <div className="wh-dolhead__div">{FORM_META.division}</div>
        <h1 className="wh-dolhead__title">{FORM_META.title}</h1>
      </div>

      <div className="wh-field wh-field--full">
        <label>PROJECT NAME</label>
        <input
          value={state.projectName}
          onChange={(e) => onChange({ projectName: e.target.value })}
          aria-label="Project name"
        />
      </div>
      <div className="wh-fieldgrid">
        <div className="wh-field">
          <label>PROJECT NO. or CONTRACT NO.</label>
          <input
            value={state.projectOrContractNo}
            onChange={(e) => onChange({ projectOrContractNo: e.target.value })}
            aria-label="Project or contract number"
          />
        </div>
        <div className="wh-field">
          <label>CERTIFIED PAYROLL NO.</label>
          <input
            value={state.payrollNo}
            onChange={(e) => onChange({ payrollNo: e.target.value })}
            aria-label="Certified payroll number"
          />
        </div>
      </div>
      <div className="wh-field wh-field--full">
        <label>PRIME CONTRACTOR&apos;S/SUBCONTRACTOR&apos;S BUSINESS NAME</label>
        <input
          value={state.businessName}
          onChange={(e) => onChange({ businessName: e.target.value })}
          aria-label="Business name"
        />
      </div>
      <div className="wh-field wh-field--full">
        <label>PROJECT LOCATION</label>
        <input
          value={state.projectLocation}
          onChange={(e) => onChange({ projectLocation: e.target.value })}
          aria-label="Project location"
        />
      </div>
      <div className="wh-fieldgrid">
        <div className="wh-field">
          <label>WAGE DETERMINATION NO.</label>
          <input
            value={state.wageDeterminationNo}
            onChange={(e) => onChange({ wageDeterminationNo: e.target.value })}
            aria-label="Wage determination number"
          />
        </div>
        <div className="wh-field">
          <label>WEEK ENDING DATE</label>
          <input
            type="date"
            value={state.weekEndingDate}
            onChange={(e) => onChange({ weekEndingDate: e.target.value })}
            aria-label="Week ending date"
          />
        </div>
      </div>
      <div className="wh-field wh-field--full">
        <label>PRIME CONTRACTOR&apos;S/SUBCONTRACTOR&apos;S BUSINESS ADDRESS</label>
        <input
          value={state.businessAddress}
          onChange={(e) => onChange({ businessAddress: e.target.value })}
          aria-label="Business address"
        />
      </div>

      <PayrollTable
        weekDayHeaders={weekDayHeaders}
        rows={firstBlock}
        startIndex={0}
        onEmployeeChange={onEmployeeChange}
        continuation={false}
      />

      {continuationBlocks.map((block, bi) => (
        <div key={bi} className="wh-continuation">
          <p className="wh-continuation__banner">
            CERTIFIED PAYROLL — CONTINUATION (workers continued from page 1; use same project and week ending)
          </p>
          <PayrollTable
            weekDayHeaders={weekDayHeaders}
            rows={block}
            startIndex={ROWS_PER_FIRST_PAGE + bi * ROWS_PER_FIRST_PAGE}
            onEmployeeChange={onEmployeeChange}
            continuation
          />
        </div>
      ))}
    </section>
  );
}

function PayrollTable({
  weekDayHeaders,
  rows,
  startIndex,
  onEmployeeChange,
  continuation,
}: {
  weekDayHeaders: WeekDayHeader[];
  rows: EmployeeRow[];
  startIndex: number;
  onEmployeeChange: (index: number, row: EmployeeRow) => void;
  continuation: boolean;
}) {
  return (
    <div className={continuation ? "wh-paywrap wh-paywrap--cont" : "wh-paywrap"}>
      <table className="wh-paytable" role="grid">
        <colgroup>
          {PAYROLL_COL_PCT.map((pct, i) => (
            <col key={i} style={{ width: `${pct}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="wh-numrow-tags">
            <th scope="col" className="wh-c-1a wh-th-tag">(1A)</th>
            <th scope="col" className="wh-c-1b wh-th-tag">(1B)</th>
            <th scope="col" className="wh-c-1c wh-th-tag">(1C)</th>
            <th scope="col" className="wh-c-1d wh-th-tag">(1D)</th>
            <th scope="col" className="wh-c-1e wh-th-tag">(1E)</th>
            <th scope="col" className="wh-c-2 wh-th-tag">(2)</th>
            <th scope="col" className="wh-c-3 wh-th-tag">(3)</th>
            <th scope="colgroup" className="wh-c-4 wh-th-tag" colSpan={7}>
              (4)
            </th>
            <th scope="col" className="wh-c-5 wh-th-tag">(5)</th>
            <th scope="col" className="wh-c-6a wh-th-tag">(6A)</th>
            <th scope="col" className="wh-c-6b wh-th-tag">(6B)</th>
            <th scope="col" className="wh-c-6c wh-th-tag">(6C)</th>
            <th scope="col" className="wh-c-7a wh-th-tag">(7A)</th>
            <th scope="col" className="wh-c-7b wh-th-tag">(7B)</th>
            <th scope="colgroup" className="wh-c-8 wh-th-tag" colSpan={4}>
              (8)
            </th>
            <th scope="col" className="wh-c-9 wh-th-tag">(9)</th>
          </tr>
          <tr className="wh-numrow">
            <VerticalHeaderBody colClass="wh-c-1a" body="WORKER ENTRY NO." />
            <VerticalHeaderBody colClass="wh-c-1b" body="WORKER LAST NAME" />
            <VerticalHeaderBody colClass="wh-c-1c" body="WORKER FIRST NAME" />
            <VerticalHeaderBody colClass="wh-c-1d" body="WORKER MIDDLE INITIAL" />
            <VerticalHeaderBody colClass="wh-c-1e" body="WORKER IDENTIFYING NO." />
            <VerticalHeaderBody
              colClass="wh-c-2"
              body={
                <>
                  (J) JOURNEYWORKER
                  <br />
                  (RA) REGISTERED APPRENTICE
                </>
              }
            />
            <VerticalHeaderBody colClass="wh-c-3" body="LABOR CLASSIFICATION" />
            <th scope="colgroup" className="wh-c-4" colSpan={7}>
              <div className="wh-hours-head">
                <div className="wh-hours-head__title">
                  HOURS WORKED EACH DAY
                  <div className="wh-stot">ST = STRAIGHT TIME / OT = OVERTIME</div>
                </div>
                <div className="wh-hours-head__days">
                  {weekDayHeaders.map((h, i) => (
                    <div key={i} className="wh-dayhead">
                      <div className="wh-dayhead__row">
                        <span className="wh-dayabbr">
                          {h.letter || "—"}
                        </span>
                      </div>
                      <div className="wh-dayhead__row">
                        <span
                          className="wh-daydate wh-daydate--from-week-ending"
                          aria-label={
                            h.letter && h.date
                              ? `${h.date} (${h.letter})`
                              : "Date (set week ending date above)"
                          }
                        >
                          {h.date || "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </th>
            <VerticalHeaderBody colClass="wh-c-5" body="TOTAL HOURS WORKED FOR WEEK" />
            <VerticalHeaderBody
              colClass="wh-c-6a"
              body="HOURLY WAGE RATE PAID FOR ST AND OT"
            />
            <VerticalHeaderBody colClass="wh-c-6b" body="TOTAL FRINGE BENEFIT CREDIT" />
            <VerticalHeaderBody
              colClass="wh-c-6c"
              body="PAYMENT IN LIEU OF FRINGE BENEFITS"
            />
            <VerticalHeaderBody colClass="wh-c-7a" body="GROSS AMT EARNED" />
            <VerticalHeaderBody colClass="wh-c-7b" body="GROSS AMT EARNED FOR ALL WORK" />
            <th scope="colgroup" className="wh-c-8 wh-th-h" colSpan={4}>
              <div className="wh-ded-head">
                <div className="wh-ded-head__title">DEDUCTIONS FOR ALL WORK</div>
                <div className="wh-ded-head__cols">
                  <div className="wh-ded-col wh-th-v">
                    <span className="wh-th-vinner">TAX WITHHOLDINGS</span>
                  </div>
                  <div className="wh-ded-col wh-th-v">
                    <span className="wh-th-vinner">FICA</span>
                  </div>
                  <div className="wh-ded-col wh-th-v">
                    <span className="wh-th-vinner">OTHER (MUST SPECIFY)</span>
                  </div>
                  <div className="wh-ded-col wh-th-v">
                    <span className="wh-th-vinner">TOTAL DEDUCTIONS</span>
                  </div>
                </div>
              </div>
            </th>
            <VerticalHeaderBody colClass="wh-c-9" body="NET PAY TO WORKER FOR ALL WORK" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const globalIndex = startIndex + ri;
            return (
              <tr key={globalIndex} className="wh-worker">
                <td className="wh-c-1a">
                  <span className="wh-entryno">{globalIndex + 1}</span>
                </td>
                <td className="wh-c-1b">
                  <input
                    value={row.lastName}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        lastName: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} last name`}
                  />
                </td>
                <td className="wh-c-1c">
                  <input
                    value={row.firstName}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        firstName: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} first name`}
                  />
                </td>
                <td className="wh-c-1d">
                  <input
                    value={row.middleInitial}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        middleInitial: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} middle initial`}
                  />
                </td>
                <td className="wh-c-1e">
                  <input
                    value={row.identifyingNo}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        identifyingNo: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} identifying number`}
                  />
                </td>
                <td className="wh-c-2">
                  <select
                    value={row.journeyOrApprentice}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        journeyOrApprentice: e.target.value as EmployeeRow["journeyOrApprentice"],
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} J or RA`}
                  >
                    <option value=""> </option>
                    <option value="J">J</option>
                    <option value="RA">RA</option>
                  </select>
                  {row.journeyOrApprentice === "RA" && (
                    <input
                      className="wh-ra-detail"
                      placeholder="Level / program ref."
                      value={row.apprenticeDetails}
                      onChange={(e) =>
                        onEmployeeChange(globalIndex, {
                          ...row,
                          apprenticeDetails: e.target.value,
                        })
                      }
                      aria-label={`Worker ${globalIndex + 1} registered apprentice details`}
                    />
                  )}
                </td>
                <td className="wh-c-3">
                  <input
                    value={row.laborClassification}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        laborClassification: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} labor classification`}
                  />
                </td>
                {row.days.map((d, di) => (
                  <td key={di} className="wh-daycell">
                    <div className="wh-stotcell">
                      <input
                        className="wh-hr"
                        value={d.st}
                        onChange={(e) => {
                          const days = [...row.days];
                          days[di] = { ...d, st: e.target.value };
                          onEmployeeChange(globalIndex, { ...row, days });
                        }}
                        aria-label={`Worker ${globalIndex + 1} day ${di + 1} straight time hours`}
                      />
                      <input
                        className="wh-hr"
                        value={d.ot}
                        onChange={(e) => {
                          const days = [...row.days];
                          days[di] = { ...d, ot: e.target.value };
                          onEmployeeChange(globalIndex, { ...row, days });
                        }}
                        aria-label={`Worker ${globalIndex + 1} day ${di + 1} overtime hours`}
                      />
                    </div>
                  </td>
                ))}
                <td className="wh-c-5">
                  <input
                    value={row.totalHours}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        totalHours: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} total hours`}
                  />
                  <button
                    type="button"
                    className="wh-sum no-print"
                    onClick={() =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        totalHours: sumWeekHours(row),
                      })
                    }
                  >
                    Sum
                  </button>
                </td>
                <td className="wh-c-6a">
                  <div className="wh-stack">
                    <input
                      placeholder="ST rate"
                      value={row.wageSt}
                      onChange={(e) =>
                        onEmployeeChange(globalIndex, {
                          ...row,
                          wageSt: e.target.value,
                        })
                      }
                      aria-label={`Worker ${globalIndex + 1} straight time hourly rate`}
                    />
                    <input
                      placeholder="OT rate"
                      value={row.wageOt}
                      onChange={(e) =>
                        onEmployeeChange(globalIndex, {
                          ...row,
                          wageOt: e.target.value,
                        })
                      }
                      aria-label={`Worker ${globalIndex + 1} overtime hourly rate`}
                    />
                  </div>
                </td>
                <td className="wh-c-6b">
                  <input
                    value={row.fringeCredit}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        fringeCredit: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} total fringe benefit credit`}
                  />
                </td>
                <td className="wh-c-6c">
                  <input
                    value={row.cashInLieuFringe}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        cashInLieuFringe: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} payment in lieu of fringe benefits`}
                  />
                </td>
                <td className="wh-c-7a">
                  <input
                    value={row.grossProject}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        grossProject: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} gross amount earned on project`}
                  />
                </td>
                <td className="wh-c-7b">
                  <input
                    value={row.grossAllWork}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        grossAllWork: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} gross amount for all work`}
                  />
                </td>
                <td className="wh-ded">
                  <input
                    value={row.deductTax}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        deductTax: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} tax withholdings`}
                  />
                </td>
                <td className="wh-ded">
                  <input
                    value={row.deductFica}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        deductFica: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} FICA`}
                  />
                </td>
                <td className="wh-ded">
                  <input
                    value={row.deductOther}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        deductOther: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} other deductions`}
                  />
                </td>
                <td className="wh-ded">
                  <input
                    value={row.deductTotal}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        deductTotal: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} total deductions`}
                  />
                </td>
                <td className="wh-c-9">
                  <input
                    value={row.netPay}
                    onChange={(e) =>
                      onEmployeeChange(globalIndex, {
                        ...row,
                        netPay: e.target.value,
                      })
                    }
                    aria-label={`Worker ${globalIndex + 1} net pay`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
