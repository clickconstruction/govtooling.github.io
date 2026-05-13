/**
 * Side-panel for editing the per-anchor sample-text map on /dev. Lists every
 * registered anchor on the active page, grouped collapsibly by anchor group
 * (HEADER_P1, ROW_X, DAY_X, etc.). Each entry exposes a text input or a
 * checkbox depending on `anchor.kind`.
 *
 * Big groups (DAY_X is 112 entries on page 1) start collapsed and only
 * mount their inputs once the group is expanded.
 */

import { useMemo, useState } from "react";
import type { RegisteredAnchor } from "../lib/pdf/anchorRegistry";
import type { SampleTextMap, SampleValue } from "../lib/pdf/sampleText";
import { isEmptySample } from "../lib/pdf/sampleText";

export interface SamplePanelProps {
  anchors: RegisteredAnchor[];
  sampleText: SampleTextMap;
  activePage: 1 | 2;
  populatedCount: number;
  onSampleChange: (id: string, value: SampleValue | null) => void;
  onLoadSample: (overwriteExisting: boolean) => void;
  onClearAll: () => void;
  onJumpToAnchor: (id: string) => void;
}

const DEFAULT_OPEN_GROUPS = new Set([
  "HEADER_P1",
  "HEADER_P2",
  "SIGNATURE_BLOCK",
  "ACK_P2",
  "DAY_HEADER",
]);

export function SamplePanel({
  anchors,
  sampleText,
  activePage,
  populatedCount,
  onSampleChange,
  onLoadSample,
  onClearAll,
  onJumpToAnchor,
}: SamplePanelProps) {
  const [query, setQuery] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const visible = anchors.filter((a) => a.page === activePage);
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? visible.filter(
          (a) => a.id.toLowerCase().includes(needle) || a.label.toLowerCase().includes(needle),
        )
      : visible;
    const byGroup = new Map<string, RegisteredAnchor[]>();
    for (const a of filtered) {
      const list = byGroup.get(a.group);
      if (list) list.push(a);
      else byGroup.set(a.group, [a]);
    }
    return Array.from(byGroup.entries()).map(([group, list]) => {
      const populated = list.filter((a) => !isEmptySample(sampleText[a.id])).length;
      return { group, list, populated };
    });
  }, [anchors, activePage, sampleText, query]);

  function toggleGroup(group: string) {
    setOpenGroups((prev) => {
      const wasOpen = prev[group] ?? DEFAULT_OPEN_GROUPS.has(group);
      return { ...prev, [group]: !wasOpen };
    });
  }

  function groupOpen(group: string, hasFilter: boolean): boolean {
    if (hasFilter) return true;
    const override = openGroups[group];
    if (override != null) return override;
    return DEFAULT_OPEN_GROUPS.has(group);
  }

  const hasFilter = query.trim().length > 0;

  return (
    <aside className="w-80 shrink-0 bg-slate-800 rounded-lg p-4 text-sm text-slate-200 space-y-3">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-slate-100">Sample text</h2>
        <p className="text-[11px] text-slate-400 leading-snug">
          Type the value you want drawn into each field. Strings for text anchors, on/off for
          checkboxes. Values are per-row (no shared key); they persist in localStorage and feed
          the "Render typed sample" PDF.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onLoadSample(overwriteExisting)}
          className="px-2 py-1 text-xs rounded bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300"
        >
          Load from sample project
        </button>
        <button
          onClick={onClearAll}
          disabled={populatedCount === 0}
          className="px-2 py-1 text-xs rounded bg-rose-700/30 text-rose-200 hover:bg-rose-700/50 border border-rose-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear samples
        </button>
      </div>
      <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
        <input
          type="checkbox"
          checked={overwriteExisting}
          onChange={(e) => setOverwriteExisting(e.currentTarget.checked)}
        />
        Overwrite existing values when loading
      </label>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        placeholder="Search anchors…"
        className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />

      <div className="text-[11px] text-slate-400">
        Page {activePage} · {populatedCount} populated total
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 -mr-1">
        {grouped.length === 0 && (
          <p className="text-xs text-slate-400 italic">No anchors match.</p>
        )}
        {grouped.map(({ group, list, populated }) => {
          const open = groupOpen(group, hasFilter);
          return (
            <section
              key={group}
              className="rounded border border-slate-700 bg-slate-900/40 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs hover:bg-slate-700/50"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">{open ? "▼" : "▶"}</span>
                  <span className="font-mono font-semibold text-slate-200">{group}</span>
                  <span className="text-slate-500">({list.length})</span>
                </span>
                {populated > 0 && (
                  <span className="text-[10px] px-1.5 py-px rounded bg-emerald-700/40 text-emerald-200">
                    {populated}
                  </span>
                )}
              </button>
              {open && (
                <ul className="divide-y divide-slate-800">
                  {list.map((a) => (
                    <li key={a.id} className="px-2 py-1.5">
                      <SampleRow
                        anchor={a}
                        value={sampleText[a.id]}
                        onChange={(v) => onSampleChange(a.id, v)}
                        onJump={() => onJumpToAnchor(a.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function SampleRow({
  anchor,
  value,
  onChange,
  onJump,
}: {
  anchor: RegisteredAnchor;
  value: SampleValue | undefined;
  onChange: (next: SampleValue | null) => void;
  onJump: () => void;
}) {
  const populated = !isEmptySample(value);
  const labelEl = (
    <button
      type="button"
      onClick={onJump}
      className="text-left text-[11px] text-slate-300 hover:text-amber-300 underline-offset-2 hover:underline truncate flex-1"
      title={anchor.id}
    >
      {anchor.label}
    </button>
  );

  if (anchor.kind === "checkbox") {
    const checked = value === true;
    return (
      <div className="flex items-center gap-2">
        {labelEl}
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.currentTarget.checked ? true : null)}
          className="size-3.5"
        />
        {populated && (
          <span className="size-1.5 rounded-full bg-emerald-400" aria-label="populated" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {labelEl}
        {populated && (
          <span className="size-1.5 rounded-full bg-emerald-400" aria-label="populated" />
        )}
      </div>
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => {
          const v = e.currentTarget.value;
          onChange(v.length === 0 ? null : v);
        }}
        placeholder="(empty)"
        className="w-full rounded bg-slate-900 border border-slate-700 px-1.5 py-0.5 text-[11px] font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
    </div>
  );
}
