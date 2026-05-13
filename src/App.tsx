import { useCallback } from "react";
import { FORM_META } from "./constants";
import { Page1 } from "./components/Page1";
import { Page2 } from "./components/Page2";
import { Toolbar } from "./components/Toolbar";
import { useWh347Form } from "./state/useWh347Form";
import type { EmployeeRow, Wh347FormState } from "./types/wh347";

export default function App() {
  const {
    state,
    setState,
    setEmployees,
    addEmployeeRow,
    removeLastEmployeeRow,
    resetForm,
    exportJsonFile,
    importJsonFile,
  } = useWh347Form();

  const onChange = useCallback(
    (partial: Partial<Wh347FormState>) => {
      setState((s) => ({ ...s, ...partial }));
    },
    [setState],
  );

  const onEmployeeChange = useCallback(
    (index: number, row: EmployeeRow) => {
      setEmployees((prev) => {
        const next = [...prev];
        next[index] = row;
        return next;
      });
    },
    [setEmployees],
  );

  const onPrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <>
      <Toolbar
        state={state}
        onPrint={onPrint}
        onExport={exportJsonFile}
        onImport={importJsonFile}
        onReset={resetForm}
        onAddRow={addEmployeeRow}
        onRemoveRow={removeLastEmployeeRow}
      />
      <main className="app-main">
        <Page1
          state={state}
          onChange={onChange}
          onEmployeeChange={onEmployeeChange}
        />
        <Page2 state={state} onChange={onChange} />
        <footer className="app-foot no-print">
          <p>
            This page is an independent tool and is not affiliated with the U.S. Department of Labor. Always use
            the official instructions for filing:{" "}
            <a href={FORM_META.instructionUrl}>{FORM_META.instructionUrl}</a>
          </p>
        </footer>
      </main>
    </>
  );
}
