import { EXPORT_VERSION } from "../constants";
import type {
  ApprenticeProgramRow,
  EmployeeRow,
  FringeCreditRow,
  FringePlanColumn,
  WeekDayHeader,
  Wh347FormState,
} from "../types/wh347";

export const FRINGE_PLAN_COUNT = 6;

export function emptyDayHours(): EmployeeRow["days"] {
  return Array.from({ length: 7 }, () => ({ st: "", ot: "" }));
}

export function emptyEmployee(): EmployeeRow {
  return {
    lastName: "",
    firstName: "",
    middleInitial: "",
    identifyingNo: "",
    journeyOrApprentice: "",
    apprenticeDetails: "",
    laborClassification: "",
    days: emptyDayHours(),
    totalHours: "",
    wageSt: "",
    wageOt: "",
    fringeCredit: "",
    cashInLieuFringe: "",
    grossProject: "",
    grossAllWork: "",
    deductTax: "",
    deductFica: "",
    deductOther: "",
    deductTotal: "",
    netPay: "",
  };
}

export function defaultWeekDayHeaders(): WeekDayHeader[] {
  return Array.from({ length: 7 }, () => ({ letter: "", date: "" }));
}

export function emptyFringePlan(): FringePlanColumn {
  return { name: "", type: "", planNo: "", funded: false, unfunded: false };
}

export function defaultFringePlans(): FringePlanColumn[] {
  return Array.from({ length: FRINGE_PLAN_COUNT }, () => emptyFringePlan());
}

export function fringeRowForEmployee(
  index: number,
  e: EmployeeRow,
  prev?: FringeCreditRow,
): FringeCreditRow {
  const hourlyCredits = [...(prev?.hourlyCredits ?? [])];
  while (hourlyCredits.length < FRINGE_PLAN_COUNT) {
    hourlyCredits.push("");
  }
  return {
    workerEntryNo: String(index + 1),
    workerName: formatWorkerName(e),
    hourlyCredits: hourlyCredits.slice(0, FRINGE_PLAN_COUNT),
    totalHourlyCredit: prev?.totalHourlyCredit ?? "",
  };
}

export function formatWorkerName(e: EmployeeRow): string {
  const parts = [e.lastName, e.firstName].filter(Boolean);
  return parts.join(", ");
}

export function syncFringeRowsWithEmployees(
  employees: EmployeeRow[],
  prevRows: FringeCreditRow[],
): FringeCreditRow[] {
  return employees.map((e, i) =>
    fringeRowForEmployee(i, e, prevRows[i]),
  );
}

export function emptyApprenticeRow(): ApprenticeProgramRow {
  return { programName: "", classification: "", oa: false, saa: false };
}

const DEFAULT_EMPLOYEE_COUNT = 8;

export function createInitialFormState(): Wh347FormState {
  const employees = Array.from({ length: DEFAULT_EMPLOYEE_COUNT }, () =>
    emptyEmployee(),
  );
  return {
    exportVersion: EXPORT_VERSION,
    isFinalPayroll: false,
    contractorRole: "",
    projectName: "",
    projectOrContractNo: "",
    payrollNo: "",
    businessName: "",
    projectLocation: "",
    wageDeterminationNo: "",
    weekEndingDate: "",
    businessAddress: "",
    weekDayHeaders: defaultWeekDayHeaders(),
    employees,
    certifyingOfficial: "",
    compliance1: false,
    compliance2: false,
    compliance3: false,
    compliance4: false,
    compliance5: false,
    compliance6: false,
    apprenticePrograms: Array.from({ length: 3 }, () => emptyApprenticeRow()),
    fringePlans: defaultFringePlans(),
    fringeRows: syncFringeRowsWithEmployees(employees, []),
    additionalRemarks: "",
    signature: "",
    dateSigned: "",
    phone: "",
    email: "",
  };
}
