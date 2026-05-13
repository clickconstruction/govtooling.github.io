import { FORM_META } from "../constants";
import { FRINGE_PLAN_COUNT } from "../state/formDefaults";
import type { Wh347FormState } from "../types/wh347";

type Props = { state: Wh347FormState; onChange: (next: Partial<Wh347FormState>) => void };

export function Page2({ state, onChange }: Props) {
  return (
    <section className="wh-page wh-page--p2">
      <h2 className="wh-p2h2">Statement of Compliance</h2>

      <div className="wh-field wh-field--full">
        <label>PROJECT NAME</label>
        <input
          value={state.projectName}
          onChange={(e) => onChange({ projectName: e.target.value })}
          aria-label="Project name (page 2)"
        />
      </div>
      <div className="wh-fieldgrid">
        <div className="wh-field">
          <label>PROJECT NO. or CONTRACT NO.</label>
          <input
            value={state.projectOrContractNo}
            onChange={(e) => onChange({ projectOrContractNo: e.target.value })}
            aria-label="Project or contract number (page 2)"
          />
        </div>
        <div className="wh-field">
          <label>PAYROLL NO.</label>
          <input
            value={state.payrollNo}
            onChange={(e) => onChange({ payrollNo: e.target.value })}
            aria-label="Payroll number (page 2)"
          />
        </div>
      </div>
      <div className="wh-field wh-field--full">
        <label>PRIME CONTRACTOR&apos;S/SUBCONTRACTOR&apos;S BUSINESS NAME</label>
        <input
          value={state.businessName}
          onChange={(e) => onChange({ businessName: e.target.value })}
          aria-label="Business name (page 2)"
        />
      </div>
      <div className="wh-field wh-field--full">
        <label>PROJECT LOCATION</label>
        <input
          value={state.projectLocation}
          onChange={(e) => onChange({ projectLocation: e.target.value })}
          aria-label="Project location (page 2)"
        />
      </div>
      <div className="wh-field wh-field--full">
        <label>WEEK ENDING DATE</label>
        <input
          type="date"
          value={state.weekEndingDate}
          onChange={(e) => onChange({ weekEndingDate: e.target.value })}
          aria-label="Week ending date (page 2)"
        />
      </div>

      <div className="wh-field wh-field--full">
        <label>CERTIFYING OFFICIAL&apos;s NAME AND TITLE</label>
        <input
          value={state.certifyingOfficial}
          onChange={(e) => onChange({ certifyingOfficial: e.target.value })}
          aria-label="Certifying official name and title"
        />
      </div>

      <div className="wh-compliance">
        <p className="wh-comp-p">
          I paid or supervised the payment of the laborers or mechanics working on the above project during
          the stated time period. I certify the following:
        </p>

        <label className="wh-comp-item">
          <input
            type="checkbox"
            checked={state.compliance1}
            onChange={(e) => onChange({ compliance1: e.target.checked })}
          />
          <span>
            The payroll information submitted with this statement is correct and complete for the above project
            during the above period, and the wage and fringe benefit rates paid to the workers,{" "}
            <em>
              including credit taken for the reasonably anticipated costs of a bona fide fringe benefit plan,
              fund or program,
            </em>{" "}
            are not less than the applicable wage and fringe benefits rates for the classification(s) of work
            actually performed, as specified in the wage determination(s) incorporated into the contract.
          </span>
        </label>

        <label className="wh-comp-item">
          <input
            type="checkbox"
            checked={state.compliance2}
            onChange={(e) => onChange({ compliance2: e.target.checked })}
          />
          <span>
            All regular payrolls and all other basic records that the contractor is required to maintain for
            this payroll period are complete and accurate and will be made available upon request from the agency
            or the Department of Labor.
          </span>
        </label>

        <label className="wh-comp-item">
          <input
            type="checkbox"
            checked={state.compliance3}
            onChange={(e) => onChange({ compliance3: e.target.checked })}
          />
          <span>
            The classifications reported for each laborer or mechanic are the classification(s) of work that
            each worker actually performed.
          </span>
        </label>

        <label className="wh-comp-item">
          <input
            type="checkbox"
            checked={state.compliance4}
            onChange={(e) => onChange({ compliance4: e.target.checked })}
          />
          <span>
            Any workers paid as apprentices during the above period are duly registered in a bona fide
            apprenticeship program registered with the Office of Apprenticeship, Employment and Training
            Administration, United States Department of Labor (&quot;OA&quot;), or a State Apprenticeship Agency
            (&quot;SAA&quot;) recognized by Department of Labor. I have verified the registered apprenticeship
            program information provided below as accurate and applicable to any apprentices identified on page
            1 of this form.
          </span>
        </label>

        <table className="wh-appr" role="grid">
          <thead>
            <tr>
              <th scope="col">APPRENTICESHIP PROGRAM NAME</th>
              <th scope="col">REGISTERED</th>
              <th scope="col">NAME OF LABOR CLASSIFICATION</th>
            </tr>
          </thead>
          <tbody>
            {state.apprenticePrograms.map((row, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={row.programName}
                    onChange={(e) => {
                      const apprenticePrograms = [...state.apprenticePrograms];
                      apprenticePrograms[i] = { ...row, programName: e.target.value };
                      onChange({ apprenticePrograms });
                    }}
                    aria-label={`Apprenticeship program name row ${i + 1}`}
                  />
                </td>
                <td>
                  <div className="wh-appr-flags">
                    <label>
                      <input
                        type="checkbox"
                        checked={row.oa}
                        onChange={(e) => {
                          const apprenticePrograms = [...state.apprenticePrograms];
                          apprenticePrograms[i] = { ...row, oa: e.target.checked };
                          onChange({ apprenticePrograms });
                        }}
                      />{" "}
                      OA
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={row.saa}
                        onChange={(e) => {
                          const apprenticePrograms = [...state.apprenticePrograms];
                          apprenticePrograms[i] = { ...row, saa: e.target.checked };
                          onChange({ apprenticePrograms });
                        }}
                      />{" "}
                      SAA
                    </label>
                  </div>
                </td>
                <td>
                  <input
                    value={row.classification}
                    onChange={(e) => {
                      const apprenticePrograms = [...state.apprenticePrograms];
                      apprenticePrograms[i] = { ...row, classification: e.target.value };
                      onChange({ apprenticePrograms });
                    }}
                    aria-label={`Labor classification for apprenticeship row ${i + 1}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <label className="wh-comp-item">
          <input
            type="checkbox"
            checked={state.compliance5}
            onChange={(e) => onChange({ compliance5: e.target.checked })}
          />
          <span>
            Fringe benefits have been paid in cash and/or to bona fide fringe benefit plans, funds, or programs.
            Where the contractor is claiming an hourly credit for their contributions to or reasonably anticipated
            costs of a bona fide fringe benefit plan, fund, or program, provide plan information and the hourly credit
            claimed for each worker listed on the previous page of this form.
          </span>
        </label>

        <h3 className="wh-fringe-h3">HOURLY CREDIT FOR FRINGE BENEFITS</h3>
        <p className="wh-small">
          If an amount is listed in (6B) on the first page of this certified payroll form, enter the hourly credit
          claimed under each plan name, type and number for each worker and check whether the plan is funded or
          unfunded.
        </p>

        <div className="wh-fringe-meta">
          {state.fringePlans.map((plan, pi) => (
            <div key={pi} className="wh-fringe-plan">
              <div className="wh-fr-plan-label">FB NAME</div>
              <input
                aria-label={`Fringe benefit ${pi + 1} name`}
                value={plan.name}
                onChange={(e) => {
                  const fringePlans = [...state.fringePlans];
                  fringePlans[pi] = { ...plan, name: e.target.value };
                  onChange({ fringePlans });
                }}
              />
              <div className="wh-fr-plan-label">FB TYPE</div>
              <input
                aria-label={`Fringe benefit ${pi + 1} type`}
                value={plan.type}
                onChange={(e) => {
                  const fringePlans = [...state.fringePlans];
                  fringePlans[pi] = { ...plan, type: e.target.value };
                  onChange({ fringePlans });
                }}
              />
              <div className="wh-fr-plan-label">PLAN NO.</div>
              <input
                aria-label={`Fringe benefit ${pi + 1} plan number`}
                value={plan.planNo}
                onChange={(e) => {
                  const fringePlans = [...state.fringePlans];
                  fringePlans[pi] = { ...plan, planNo: e.target.value };
                  onChange({ fringePlans });
                }}
              />
              <div className="wh-fr-plan-fu">
                <label>
                  <input
                    type="checkbox"
                    checked={plan.funded}
                    onChange={(e) => {
                      const fringePlans = [...state.fringePlans];
                      fringePlans[pi] = { ...plan, funded: e.target.checked };
                      onChange({ fringePlans });
                    }}
                  />{" "}
                  Funded
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={plan.unfunded}
                    onChange={(e) => {
                      const fringePlans = [...state.fringePlans];
                      fringePlans[pi] = { ...plan, unfunded: e.target.checked };
                      onChange({ fringePlans });
                    }}
                  />{" "}
                  Unfunded
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="wh-fringe-workers-wrap">
          <table className="wh-fringe-workers" role="grid">
            <thead>
              <tr>
                <th scope="col">NAME OF WORKER</th>
                {Array.from({ length: FRINGE_PLAN_COUNT }, (_, i) => (
                  <th key={i} scope="col">{`PLAN ${i + 1} HOURLY CREDIT`}</th>
                ))}
                <th scope="col">TOTAL HOURLY CREDIT</th>
              </tr>
            </thead>
            <tbody>
              {state.fringeRows.map((fr, ri) => (
                <tr key={ri}>
                  <td>
                    <div className="wh-fw-name">
                      <input
                        className="wh-fw-entry"
                        aria-label={`Fringe row ${ri + 1} worker entry number`}
                        value={fr.workerEntryNo}
                        onChange={(e) => {
                          const fringeRows = [...state.fringeRows];
                          fringeRows[ri] = { ...fr, workerEntryNo: e.target.value };
                          onChange({ fringeRows });
                        }}
                      />
                      <input
                        aria-label={`Fringe row ${ri + 1} worker name`}
                        value={fr.workerName}
                        onChange={(e) => {
                          const fringeRows = [...state.fringeRows];
                          fringeRows[ri] = { ...fr, workerName: e.target.value };
                          onChange({ fringeRows });
                        }}
                      />
                    </div>
                  </td>
                  {Array.from({ length: FRINGE_PLAN_COUNT }, (__, ci) => (
                    <td key={ci}>
                      <input
                        aria-label={`Fringe row ${ri + 1} plan ${ci + 1} hourly credit`}
                        value={fr.hourlyCredits[ci] ?? ""}
                        onChange={(e) => {
                          const fringeRows = [...state.fringeRows];
                          const hourlyCredits = [...fr.hourlyCredits];
                          while (hourlyCredits.length < FRINGE_PLAN_COUNT) {
                            hourlyCredits.push("");
                          }
                          hourlyCredits[ci] = e.target.value;
                          fringeRows[ri] = { ...fr, hourlyCredits };
                          onChange({ fringeRows });
                        }}
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      aria-label={`Fringe row ${ri + 1} total hourly credit`}
                      value={fr.totalHourlyCredit}
                      onChange={(e) => {
                        const fringeRows = [...state.fringeRows];
                        fringeRows[ri] = { ...fr, totalHourlyCredit: e.target.value };
                        onChange({ fringeRows });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <label className="wh-comp-item">
          <input
            type="checkbox"
            checked={state.compliance6}
            onChange={(e) => onChange({ compliance6: e.target.checked })}
          />
          <span>
            All workers on the project have been paid the full weekly wages earned, and no rebates or deductions
            have been or will be made either directly or indirectly, other than permissible deductions as defined
            in 29 CFR part 3.
          </span>
        </label>
      </div>

      <div className="wh-field wh-field--full">
        <label>ADDITIONAL REMARKS</label>
        <textarea
          rows={4}
          value={state.additionalRemarks}
          onChange={(e) => onChange({ additionalRemarks: e.target.value })}
          aria-label="Additional remarks"
        />
      </div>

      <div className="wh-siggrid">
        <div className="wh-field">
          <label>SIGNATURE OF CERTIFYING OFFICIAL</label>
          <input
            value={state.signature}
            onChange={(e) => onChange({ signature: e.target.value })}
            aria-label="Signature of certifying official"
          />
        </div>
        <div className="wh-field">
          <label>DATE</label>
          <input
            type="date"
            value={state.dateSigned}
            onChange={(e) => onChange({ dateSigned: e.target.value })}
            aria-label="Date signed"
          />
        </div>
        <div className="wh-field">
          <label>TELEPHONE NUMBER</label>
          <input
            value={state.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            aria-label="Telephone number"
            placeholder="(___) ___-____"
          />
        </div>
        <div className="wh-field">
          <label>EMAIL ADDRESS</label>
          <input
            type="email"
            value={state.email}
            onChange={(e) => onChange({ email: e.target.value })}
            aria-label="Email address"
          />
        </div>
      </div>

      <p className="wh-legal">
        THE WILLFUL FALSIFICATION OF ANY OF THE ABOVE STATEMENTS MAY SUBJECT THE CONTRACTOR OR SUBCONTRACTOR TO
        CIVIL OR CRIMINAL PROSECUTION (SEE SECTION 1001 OF TITLE 18 AND SECTION 3729 OF TITLE 31 OF THE UNITED
        STATES CODE), AS WELL AS DEBARMENT FROM FUTURE FEDERAL AND FEDERALLY-ASSISTED CONTRACTS. INFORMATION
        REPORTED IN CERTIFIED PAYROLLS MAY BE SUBJECT TO DISCLOSURE IN RESPONSE TO A FREEDOM OF INFORMATION ACT
        REQUEST.
      </p>

      <p className="wh-footer-meta">
        Form WH-347 · Rev. {FORM_META.revision} · OMB {FORM_META.omb} · Expires {FORM_META.expires}
      </p>
    </section>
  );
}
