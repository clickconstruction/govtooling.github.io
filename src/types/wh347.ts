/** Client-side model for WH-347; optional fields use empty strings when blank */

export type ContractorRole = "" | "prime" | "sub";

export interface DayHours {
  st: string;
  ot: string;
}

export interface EmployeeRow {
  lastName: string;
  firstName: string;
  middleInitial: string;
  identifyingNo: string;
  journeyOrApprentice: "" | "J" | "RA";
  apprenticeDetails: string;
  laborClassification: string;
  /** Seven workdays; align with header letters/dates */
  days: DayHours[];
  totalHours: string;
  wageSt: string;
  wageOt: string;
  fringeCredit: string;
  cashInLieuFringe: string;
  grossProject: string;
  grossAllWork: string;
  deductTax: string;
  deductFica: string;
  deductOther: string;
  deductTotal: string;
  netPay: string;
}

export interface WeekDayHeader {
  letter: string;
  date: string;
}

export interface ApprenticeProgramRow {
  programName: string;
  classification: string;
  oa: boolean;
  saa: boolean;
}

export interface FringePlanColumn {
  name: string;
  type: string;
  planNo: string;
  funded: boolean;
  unfunded: boolean;
}

export interface FringeCreditRow {
  workerEntryNo: string;
  workerName: string;
  hourlyCredits: string[];
  /** Last column total hourly credit */
  totalHourlyCredit: string;
}

export interface Wh347FormState {
  exportVersion: number;

  isFinalPayroll: boolean;
  contractorRole: ContractorRole;

  projectName: string;
  projectOrContractNo: string;
  payrollNo: string;
  businessName: string;
  projectLocation: string;
  wageDeterminationNo: string;
  weekEndingDate: string;
  businessAddress: string;

  weekDayHeaders: WeekDayHeader[];

  employees: EmployeeRow[];

  certifyingOfficial: string;
  compliance1: boolean;
  compliance2: boolean;
  compliance3: boolean;
  compliance4: boolean;
  compliance5: boolean;
  compliance6: boolean;

  apprenticePrograms: ApprenticeProgramRow[];

  fringePlans: FringePlanColumn[];
  fringeRows: FringeCreditRow[];

  additionalRemarks: string;
  signature: string;
  dateSigned: string;
  phone: string;
  email: string;
}
