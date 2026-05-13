/** Mirrors U.S. DOL Form WH-347 (Rev. January 2025) metadata from official PDF */
export const FORM_META = {
  title: "Davis-Bacon and Related Acts Weekly Certified Payroll Form",
  division: "Wage and Hour Division",
  department: "U.S. Department of Labor",
  revision: "January 2025",
  omb: "1235-0008",
  expires: "01/31/2028",
  instructionUrl: "https://www.dol.gov/agencies/whd/forms/wh347",
  optionalUseNote:
    "(For Contractor's Optional Use; See Instructions at www.dol.gov/whd/forms/wh347instr.htm)",
} as const;

export const STORAGE_KEY = "wh347-draft-v1";

export const EXPORT_VERSION = 1;
