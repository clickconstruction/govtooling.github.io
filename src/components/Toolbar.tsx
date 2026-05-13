import { useRef } from "react";
import type { Wh347FormState } from "../types/wh347";

type Props = {
  state: Wh347FormState;
  onPrint: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  onAddRow: () => void;
  onRemoveRow: () => void;
};

export function Toolbar({
  state,
  onPrint,
  onExport,
  onImport,
  onReset,
  onAddRow,
  onRemoveRow,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const missingWeekEnd = !state.weekEndingDate.trim();

  return (
    <header className="app-toolbar no-print">
      <div className="app-toolbar__title">
        <strong>WH-347</strong>
        <span className="app-toolbar__hint">
          Data stays in this browser. Save a JSON export for backup.
        </span>
      </div>
      <div className="app-toolbar__actions">
        {missingWeekEnd && (
          <span className="app-toolbar__warn">
            Week ending date is blank (required for filing).
          </span>
        )}
        <button type="button" onClick={onPrint}>
          Print / Save PDF
        </button>
        <button type="button" onClick={onExport}>
          Export JSON
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              onImport(f);
            }
            e.target.value = "";
          }}
        />
        <button type="button" onClick={onAddRow}>
          Add worker row
        </button>
        <button
          type="button"
          onClick={onRemoveRow}
          disabled={state.employees.length <= 1}
        >
          Remove last row
        </button>
        <button
          type="button"
          className="app-toolbar__danger"
          onClick={() => {
            if (
              window.confirm(
                "Clear all fields and reset the form to defaults?",
              )
            ) {
              onReset();
            }
          }}
        >
          Clear form
        </button>
        <span className="app-toolbar__autosave">Autosave (this device)</span>
      </div>
    </header>
  );
}
