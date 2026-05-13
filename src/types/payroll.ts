/**
 * Data model for the WH-347 (Rev. January 2025) Davis-Bacon weekly certified
 * payroll form. Field names match column codes on the official form so that
 * the data layer, UI labels, and PDF filler all line up.
 */

export type ContractorRole = "prime" | "sub";

export interface Contractor {
  /** PRIME CONTRACTOR'S/SUBCONTRACTOR'S BUSINESS NAME */
  name: string;
  /** PRIME CONTRACTOR'S/SUBCONTRACTOR'S BUSINESS ADDRESS */
  address: string;
  /** Determines which checkbox is marked on each weekly form. */
  role: ContractorRole;
}

export interface ProjectInfo {
  /** PROJECT NAME */
  name: string;
  /** PROJECT LOCATION */
  location: string;
  /** PROJECT NO. or CONTRACT NO. */
  projectNo: string;
  /** WAGE DETERMINATION NO. */
  wageDeterminationNo: string;
}

export type WorkerStatus = "journeyworker" | "apprentice";

export interface EmployeeProfile {
  id: string;
  /** Sequential worker entry number (column 1A). 1-based. */
  entryNo?: number;
  /** Column (1B) */
  lastName: string;
  /** Column (1C) */
  firstName: string;
  /** Column (1D) - usually a single letter. */
  middleInitial: string;
  /** Column (1E) - last 4 of SSN or another unique identifier. */
  identifyingNo: string;
  /** Column (2) - whether the worker is a journeyworker or a registered apprentice. */
  status: WorkerStatus;
  /** Column (3) - e.g. "Carpenter", "Electrician (Apprentice 1st period)". */
  classification: string;
}

export interface OtherDeduction {
  label: string;
  amount: number;
}

export interface DayHours {
  /** ISO date (yyyy-mm-dd) for the day-of-week column. */
  date: string;
  /** Straight time hours. */
  st: number;
  /** Overtime hours. */
  ot: number;
}

export interface EmployeeEntry {
  /** Foreign key to EmployeeProfile.id */
  employeeId: string;
  /** Exactly 7 entries, in week-ending order (last entry = week ending date). */
  days: DayHours[];
  /** Column (6A) hourly wage rate paid for ST and OT. */
  rateOfPay: number;
  /** Column (6B) total fringe benefit credit per hour. */
  fringeCredit: number;
  /** Column (6C) payment in lieu of fringe benefits per hour (cash fringes). */
  paymentInLieu: number;
  /** Column (7A) gross amount earned on this project (optional override; defaults to computed). */
  grossThisProjectOverride?: number;
  /** Column (7B) gross amount earned for all work this week (optional override). */
  grossAllWorkOverride?: number;
  /** Column (8) deductions */
  deductions: {
    taxWithholdings: number;
    fica: number;
    other: OtherDeduction[];
  };
}

export interface Payroll {
  id: string;
  /**
   * Certified payroll number drawn into the WH-347 PAYROLL NO. box.
   * Auto-seeded as MMddyyyy from `weekEnding` when a week is created, but
   * editable for resubmissions / non-standard numbering. Stored as a string
   * so leading zeros (e.g. "03012025") survive round-trips through JSON and
   * `<input type="text">`.
   */
  payrollNo: string;
  /** ISO date string for "WEEK ENDING DATE" (last day of the work week). */
  weekEnding: string;
  /** Marks this as the final submission for the contract. */
  isFinal: boolean;
  /** Entries, in display order. */
  entries: EmployeeEntry[];
}

export interface ApprenticeProgram {
  /** APPRENTICESHIP PROGRAM NAME */
  programName: string;
  /** REGISTERED with Office of Apprenticeship (OA) or State Apprenticeship Agency (SAA). */
  registeredWith: "OA" | "SAA" | null;
  /** NAME OF LABOR CLASSIFICATION */
  classification: string;
}

export interface FringeBenefitPlan {
  /** Refers to EmployeeProfile.id; the credit applies per worker. */
  employeeId: string;
  plans: Array<{
    name: string;
    type: string;
    /** Hourly credit claimed under this plan. */
    hourlyCredit: number;
    funded: boolean;
  }>;
}

export interface StatementOfCompliance {
  certifyingOfficialName: string;
  certifyingOfficialTitle: string;
  /** Free-text remarks/exceptions field. */
  remarks: string;
  /** Date signed (ISO string). */
  signatureDate: string;
  /** All 6 declaration acknowledgements - must all be true to sign. */
  acknowledgements: {
    payrollIsAccurate: boolean;
    recordsWillBeProvided: boolean;
    classificationsCorrect: boolean;
    apprenticesRegistered: boolean;
    fringeBenefitsPaid: boolean;
    workersPaidFullWages: boolean;
  };
  apprenticePrograms: ApprenticeProgram[];
  fringePlansByEmployee: FringeBenefitPlan[];
  /** 10 digits of the certifying official's phone number, no formatting. */
  phoneDigits: string;
  /** Certifying official's email address. */
  email: string;
}

export interface Project {
  id: string;
  /** Human-readable label for the project list. */
  label: string;
  contractor: Contractor;
  project: ProjectInfo;
  employees: EmployeeProfile[];
  weeks: Payroll[];
  /** Optional default statement-of-compliance values copied into each week's signature. */
  defaultCompliance: StatementOfCompliance;
  /**
   * When true, fringe (6B/6C) and deduction (Tax W/H, FICA, Other, Total)
   * columns are hidden in the editor and HTML preview, and left blank on the
   * generated PDF. The underlying values are preserved; toggling the flag off
   * restores the original numbers. Independent of `contractor.role`.
   */
  hideSubColumns?: boolean;
  /**
   * Default Rate (6A) seeded into newly created EmployeeEntry records.
   * Existing entries are never overwritten when this value changes.
   * Undefined / 0 means "no default" (entries start at 0).
   */
  prevailingWage?: number;
  createdAt: string;
  updatedAt: string;
}

/** Top-level storage shape, kept under a versioned key so we can migrate later. */
export interface Workspace {
  schemaVersion: 1;
  projects: Project[];
}

export const EMPTY_COMPLIANCE: StatementOfCompliance = {
  certifyingOfficialName: "",
  certifyingOfficialTitle: "",
  remarks: "",
  signatureDate: "",
  acknowledgements: {
    payrollIsAccurate: false,
    recordsWillBeProvided: false,
    classificationsCorrect: false,
    apprenticesRegistered: false,
    fringeBenefitsPaid: false,
    workersPaidFullWages: false,
  },
  apprenticePrograms: [],
  fringePlansByEmployee: [],
  phoneDigits: "",
  email: "",
};
