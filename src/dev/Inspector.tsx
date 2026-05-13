import type { RegisteredAnchor, LayoutOverrides, AnchorPatch } from "../lib/pdf/anchorRegistry";
import { stripRowSuffix } from "../lib/pdf/anchorRegistry";
import type { SampleValue } from "../lib/pdf/sampleText";

export type Scope = "row" | "shared";

export interface InspectorProps {
  anchor: RegisteredAnchor | null;
  /** Resolved (post-override) anchor; what's drawn on screen. */
  resolved: RegisteredAnchor | null;
  scope: Scope;
  overrides: LayoutOverrides;
  /** Sample value currently set for the selected anchor (per-id, no fallback). */
  sampleValue: SampleValue | undefined;
  onScopeChange: (s: Scope) => void;
  onPatchField: (field: keyof AnchorPatch, value: number) => void;
  onSampleChange: (value: SampleValue | null) => void;
  onReset: () => void;
  onResetAll: () => void;
  modifiedCount: number;
}

export function Inspector({
  anchor,
  resolved,
  scope,
  overrides,
  sampleValue,
  onScopeChange,
  onPatchField,
  onSampleChange,
  onReset,
  onResetAll,
  modifiedCount,
}: InspectorProps) {
  if (!anchor || !resolved) {
    return (
      <aside className="w-80 shrink-0 bg-slate-800 rounded-lg p-4 text-sm text-slate-300 space-y-3">
        <h2 className="text-base font-semibold text-slate-100">Inspector</h2>
        <p className="text-xs text-slate-400">
          Click an anchor box to inspect or drag it. Arrow keys nudge 0.5pt
          (Shift = 5pt). <kbd className="px-1 py-px bg-slate-700 rounded">R</kbd> resets the
          selected anchor. <kbd className="px-1 py-px bg-slate-700 rounded">Tab</kbd> cycles
          overlapping anchors.
        </p>
        <div className="pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
          <span className="text-slate-400">{modifiedCount} override(s)</span>
          <button
            onClick={onResetAll}
            disabled={modifiedCount === 0}
            className="text-rose-300 hover:text-rose-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Reset all
          </button>
        </div>
      </aside>
    );
  }

  const isRowTemplated = anchor.id.includes("@row=");
  const sharedId = stripRowSuffix(anchor.id);
  const activeId = scope === "shared" && isRowTemplated ? sharedId : anchor.id;
  const activePatch: AnchorPatch | undefined = overrides[activeId];

  return (
    <aside className="w-80 shrink-0 bg-slate-800 rounded-lg p-4 text-sm text-slate-200 space-y-4">
      <header>
        <h2 className="text-base font-semibold text-slate-100">Inspector</h2>
        <p className="font-mono text-[11px] text-slate-400 break-all">{anchor.id}</p>
        <p className="text-xs text-slate-400">
          {anchor.label} · page {anchor.page} · {anchor.kind}
        </p>
      </header>

      {isRowTemplated && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-300">Scope</div>
          <div className="flex rounded-md overflow-hidden border border-slate-700">
            <button
              className={`flex-1 px-2 py-1 text-xs ${
                scope === "shared"
                  ? "bg-amber-400 text-slate-900 font-semibold"
                  : "bg-slate-900 text-slate-200 hover:bg-slate-800"
              }`}
              onClick={() => onScopeChange("shared")}
            >
              Shared X (all rows)
            </button>
            <button
              className={`flex-1 px-2 py-1 text-xs ${
                scope === "row"
                  ? "bg-amber-400 text-slate-900 font-semibold"
                  : "bg-slate-900 text-slate-200 hover:bg-slate-800"
              }`}
              onClick={() => onScopeChange("row")}
            >
              This row only
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            {scope === "shared"
              ? `Edits write to "${sharedId}" and affect every row.`
              : `Edits write to "${activeId}".`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field
          label="x (pt)"
          value={resolved.x}
          onChange={(n) => onPatchField("x", n)}
        />
        <Field
          label="y (pt)"
          value={resolved.y}
          onChange={(n) => onPatchField("y", n)}
        />
        <Field
          label="width (pt)"
          value={resolved.width}
          onChange={(n) => onPatchField("width", n)}
        />
        <Field
          label="height (pt)"
          value={resolved.height}
          onChange={(n) => onPatchField("height", n)}
        />
      </div>

      <div className="text-[11px] text-slate-400">
        Align: <span className="text-slate-200">{resolved.align ?? "left"}</span>
        {resolved.size != null && (
          <>
            {" · "}
            size: <span className="text-slate-200">{resolved.size}</span>
          </>
        )}
        {anchor.rowIndex != null && (
          <>
            {" · "}
            row: <span className="text-slate-200">{anchor.rowIndex + 1}</span>
          </>
        )}
      </div>

      <div className="pt-3 border-t border-slate-700 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-slate-300">Sample value</div>
          <button
            onClick={() => onSampleChange(null)}
            disabled={sampleValue == null || sampleValue === false || sampleValue === ""}
            className="text-[11px] text-rose-300 hover:text-rose-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
        {anchor.kind === "checkbox" ? (
          <label className="flex items-center gap-2 text-xs text-slate-200">
            <input
              type="checkbox"
              checked={sampleValue === true}
              onChange={(e) => onSampleChange(e.currentTarget.checked ? true : null)}
            />
            <span>Checked</span>
          </label>
        ) : (
          <textarea
            rows={2}
            value={typeof sampleValue === "string" ? sampleValue : ""}
            onChange={(e) => {
              const v = e.currentTarget.value;
              onSampleChange(v.length === 0 ? null : v);
            }}
            placeholder="(empty - PDF will skip this anchor)"
            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 font-mono text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        )}
        <p className="text-[10px] text-slate-500 leading-snug">
          Overlay font is an approximation. The "Render typed sample" PDF is the truth.
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-700 text-xs">
        <span className="text-slate-400">
          {activePatch ? "Modified" : "Default"}
        </span>
        <button
          onClick={onReset}
          disabled={!activePatch}
          className="text-rose-300 hover:text-rose-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reset {scope === "shared" && isRowTemplated ? "shared" : "this"}
        </button>
      </div>
    </aside>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-300">
      <span>{label}</span>
      <input
        type="number"
        step="0.5"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        onChange={(e) => {
          const n = e.currentTarget.valueAsNumber;
          if (Number.isFinite(n)) onChange(n);
        }}
        className="rounded bg-slate-900 border border-slate-700 px-2 py-1 font-mono text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
    </label>
  );
}
