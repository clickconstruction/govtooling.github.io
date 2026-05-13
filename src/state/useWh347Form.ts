import { useCallback, useEffect, useRef, useState } from "react";
import { EXPORT_VERSION, STORAGE_KEY } from "../constants";
import {
  weekDayHeadersEqual,
  weekDayHeadersFromWeekEnding,
} from "../utils/weekFromEnding";
import type { EmployeeRow, Wh347FormState } from "../types/wh347";
import {
  createInitialFormState,
  emptyEmployee,
  syncFringeRowsWithEmployees,
} from "./formDefaults";

const DEBOUNCE_MS = 450;

function parseImportedState(raw: unknown): Wh347FormState | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.exportVersion !== "number") {
    return null;
  }
  if (!Array.isArray(o.employees)) {
    return null;
  }
  return o as unknown as Wh347FormState;
}

export function useWh347Form() {
  const [state, setState] = useState<Wh347FormState>(() => {
    if (typeof window === "undefined") {
      return createInitialFormState();
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseImportedState(JSON.parse(saved) as unknown);
        if (parsed) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return createInitialFormState();
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...state, exportVersion: EXPORT_VERSION }),
        );
      } catch {
        /* quota or private mode */
      }
    }, DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [state]);

  useEffect(() => {
    setState((prev) => {
      const next = weekDayHeadersFromWeekEnding(prev.weekEndingDate);
      if (weekDayHeadersEqual(prev.weekDayHeaders, next)) {
        return prev;
      }
      return { ...prev, weekDayHeaders: next };
    });
  }, [state.weekEndingDate]);

  const setEmployees = useCallback(
    (next: EmployeeRow[] | ((prev: EmployeeRow[]) => EmployeeRow[])) => {
      setState((prev) => {
        const employees =
          typeof next === "function" ? next(prev.employees) : next;
        return {
          ...prev,
          employees,
          fringeRows: syncFringeRowsWithEmployees(employees, prev.fringeRows),
        };
      });
    },
    [],
  );

  const addEmployeeRow = useCallback(() => {
    setState((prev) => {
      const employees = [...prev.employees, emptyEmployee()];
      return {
        ...prev,
        employees,
        fringeRows: syncFringeRowsWithEmployees(employees, prev.fringeRows),
      };
    });
  }, []);

  const removeLastEmployeeRow = useCallback(() => {
    setState((prev) => {
      if (prev.employees.length <= 1) {
        return prev;
      }
      const employees = prev.employees.slice(0, -1);
      return {
        ...prev,
        employees,
        fringeRows: syncFringeRowsWithEmployees(employees, prev.fringeRows),
      };
    });
  }, []);

  const resetForm = useCallback(() => {
    setState(createInitialFormState());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const exportJsonFile = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ ...state, exportVersion: EXPORT_VERSION }, null, 2)],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wh347-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [state]);

  const importJsonFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseImportedState(JSON.parse(String(reader.result)));
        if (parsed) {
          setState({
            ...parsed,
            exportVersion: EXPORT_VERSION,
            fringeRows: syncFringeRowsWithEmployees(
              parsed.employees,
              parsed.fringeRows,
            ),
          });
        }
      } catch {
        /* invalid file */
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    state,
    setState,
    setEmployees,
    addEmployeeRow,
    removeLastEmployeeRow,
    resetForm,
    exportJsonFile,
    importJsonFile,
  };
}
