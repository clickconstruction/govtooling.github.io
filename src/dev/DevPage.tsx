import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnchorBox, type ScreenRect } from "./AnchorBox";
import { Inspector, type Scope } from "./Inspector";
import { PdfBackdrop } from "./PdfBackdrop";
import { PdfPreview } from "./PdfPreview";
import { SamplePanel } from "./SamplePanel";
import { exportJson, exportTsOverrides, exportTsPatch, importJson, pruneOverrides } from "./exportPatch";
import {
  buildRegistry,
  stripRowSuffix,
  type AnchorPatch,
  type LayoutOverrides,
  type RegisteredAnchor,
} from "../lib/pdf/anchorRegistry";
import { WH347_PAGE } from "../lib/pdf/wh347Layout";
import { fillWh347 } from "../lib/pdf/fillWh347";
import { renderSamplePdf } from "../lib/pdf/renderSamplePdf";
import { buildSampleMap } from "../lib/pdf/sampleMap";
import { isEmptySample, type SampleTextMap, type SampleValue } from "../lib/pdf/sampleText";
import { makeSampleProject } from "../lib/sample";

const SCALE = 1.5; // CSS pixels per PDF point. Matches PdfBackdrop and the layout grid.
const PDF_URL = `${import.meta.env.BASE_URL}wh347.pdf`;
const STORAGE_KEY = "wh347:layout-overrides";
const SAMPLE_STORAGE_KEY = "wh347:sample-text";

type SidebarTab = "inspector" | "samples" | "export";

const PAGE_W_PT = WH347_PAGE.width;
const PAGE_H_PT = WH347_PAGE.height;
const PAGE_SIZE_PX = { width: PAGE_W_PT * SCALE, height: PAGE_H_PT * SCALE } as const;

function toScreen(a: { x: number; y: number; width: number; height: number }): ScreenRect {
  return {
    left: a.x * SCALE,
    top: (PAGE_H_PT - a.y - a.height) * SCALE,
    width: a.width * SCALE,
    height: a.height * SCALE,
  };
}

function fromScreen(r: ScreenRect): { x: number; y: number; width: number; height: number } {
  const x = r.left / SCALE;
  const width = r.width / SCALE;
  const height = r.height / SCALE;
  const y = PAGE_H_PT - r.top / SCALE - height;
  return { x, y, width, height };
}

function loadInitialOverrides(): LayoutOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LayoutOverrides;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function loadInitialSamples(): SampleTextMap {
  try {
    const raw = localStorage.getItem(SAMPLE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SampleTextMap;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function DevPage() {
  const allAnchors = useMemo(() => buildRegistry(), []);
  const [activePage, setActivePage] = useState<1 | 2>(1);
  const [overrides, setOverrides] = useState<LayoutOverrides>(loadInitialOverrides);
  const [sampleText, setSampleText] = useState<SampleTextMap>(loadInitialSamples);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("shared");
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [exportTab, setExportTab] = useState<"ts" | "tspatch" | "json">("tspatch");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showSampleText, setShowSampleText] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("inspector");
  const pageSize = PAGE_SIZE_PX;

  const populatedSampleCount = useMemo(
    () => Object.values(sampleText).filter((v) => !isEmptySample(v)).length,
    [sampleText],
  );

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);

  // Persist overrides debounced.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      } catch {
        /* quota or disabled - ignore */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [overrides]);

  // Persist sample text debounced (same pattern as overrides).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(SAMPLE_STORAGE_KEY, JSON.stringify(sampleText));
      } catch {
        /* quota or disabled - ignore */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [sampleText]);

  const visibleAnchors = useMemo(
    () => allAnchors.filter((a) => a.page === activePage),
    [allAnchors, activePage],
  );

  const resolveAnchor = useCallback(
    (a: RegisteredAnchor): RegisteredAnchor => {
      const sharedId = stripRowSuffix(a.id);
      const shared = sharedId !== a.id ? overrides[sharedId] : undefined;
      const exact = overrides[a.id];
      return {
        ...a,
        x: exact?.x ?? shared?.x ?? a.x,
        y: exact?.y ?? shared?.y ?? a.y,
        width: exact?.width ?? shared?.width ?? a.width,
        height: exact?.height ?? shared?.height ?? a.height,
      };
    },
    [overrides],
  );

  const isModified = useCallback(
    (a: RegisteredAnchor): boolean => {
      if (overrides[a.id]) return true;
      const sharedId = stripRowSuffix(a.id);
      if (sharedId !== a.id && overrides[sharedId]) return true;
      return false;
    },
    [overrides],
  );

  const modifiedCount = Object.keys(overrides).length;

  const setOverrideFor = useCallback(
    (id: string, patch: AnchorPatch | null) => {
      setOverrides((prev) => {
        const next = { ...prev };
        if (patch === null) {
          delete next[id];
          return next;
        }
        const existing = next[id] ?? {};
        next[id] = { ...existing, ...patch };
        return next;
      });
    },
    [],
  );

  // Round to 0.5pt.
  const snap = (n: number) => Math.round(n * 2) / 2;

  const applyScreenRect = useCallback(
    (id: string, rect: ScreenRect, opts: { snap: boolean }) => {
      const pdf = fromScreen(rect);
      const full: AnchorPatch = opts.snap
        ? { x: snap(pdf.x), y: snap(pdf.y), width: snap(pdf.width), height: snap(pdf.height) }
        : { x: pdf.x, y: pdf.y, width: pdf.width, height: pdf.height };
      const anchor = allAnchors.find((a) => a.id === id);
      if (!anchor) return;
      // Row-templated anchors are tiled across N rows at different y values.
      // The "shared" scope only makes sense for x/width; y and height are
      // inherently row-specific, so we never write those into the shared key.
      const isRowTemplated = anchor.id.includes("@row=");
      const useShared = scope === "shared" && isRowTemplated;
      const target = useShared ? stripRowSuffix(anchor.id) : anchor.id;
      const patch: AnchorPatch = useShared
        ? { x: full.x, width: full.width }
        : full;
      setOverrideFor(target, patch);
    },
    [allAnchors, scope, setOverrideFor],
  );

  const handleAnchorChange = useCallback(
    (id: string, rect: ScreenRect) => {
      draggingRef.current = true;
      applyScreenRect(id, rect, { snap: false });
    },
    [applyScreenRect],
  );

  // Snap on pointer up - only when an actual drag happened.
  useEffect(() => {
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (!selectedId) return;
      const anchor = allAnchors.find((a) => a.id === selectedId);
      if (!anchor) return;
      const resolved = resolveAnchor(anchor);
      applyScreenRect(selectedId, toScreen(resolved), { snap: true });
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [allAnchors, applyScreenRect, resolveAnchor, selectedId]);

  // Keyboard handlers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when editing an input.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }

      if (e.key === "Tab" && cursorRef.current) {
        e.preventDefault();
        cycleAtCursor(e.shiftKey);
        return;
      }

      if (!selectedId) return;
      const anchor = allAnchors.find((a) => a.id === selectedId);
      if (!anchor) return;

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        resetSelected();
        return;
      }

      const step = e.shiftKey ? 5 : 0.5;
      let dx = 0;
      let dy = 0;
      switch (e.key) {
        case "ArrowLeft":
          dx = -step;
          break;
        case "ArrowRight":
          dx = step;
          break;
        case "ArrowUp":
          dy = step; // PDF y is up
          break;
        case "ArrowDown":
          dy = -step;
          break;
        default:
          return;
      }
      e.preventDefault();
      const resolved = resolveAnchor(anchor);
      const isRowTemplated = anchor.id.includes("@row=");
      const useShared = scope === "shared" && isRowTemplated;
      const target = useShared ? stripRowSuffix(anchor.id) : anchor.id;
      const next: AnchorPatch = useShared
        ? { x: snap(resolved.x + dx) }
        : { x: snap(resolved.x + dx), y: snap(resolved.y + dy) };
      setOverrideFor(target, next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnchors, resolveAnchor, scope, selectedId]);

  function resetSelected() {
    if (!selectedId) return;
    const anchor = allAnchors.find((a) => a.id === selectedId);
    if (!anchor) return;
    const target =
      scope === "shared" && anchor.id.includes("@row=") ? stripRowSuffix(anchor.id) : anchor.id;
    setOverrideFor(target, null);
  }

  function resetAll() {
    if (modifiedCount === 0) return;
    if (!confirm(`Reset all ${modifiedCount} override(s)?`)) return;
    setOverrides({});
  }

  function cycleAtCursor(reverse: boolean) {
    if (!cursorRef.current) return;
    const { x, y } = cursorRef.current;
    // Find every anchor whose screen rect contains (x, y).
    const hits = visibleAnchors.filter((a) => {
      const r = toScreen(resolveAnchor(a));
      return x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height;
    });
    if (hits.length === 0) return;
    const idx = hits.findIndex((a) => a.id === selectedId);
    const nextIdx = (idx + (reverse ? -1 : 1) + hits.length) % hits.length;
    setSelectedId(hits[nextIdx]!.id);
  }

  // Track cursor over the overlay for Tab cycling.
  function onOverlayMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    cursorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onOverlayLeave() {
    cursorRef.current = null;
  }

  // Click empty area deselects.
  function onOverlayPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
  }

  const selectedAnchor = useMemo(
    () => (selectedId ? allAnchors.find((a) => a.id === selectedId) ?? null : null),
    [allAnchors, selectedId],
  );
  const resolvedSelected = selectedAnchor ? resolveAnchor(selectedAnchor) : null;

  // Auto-pick scope based on current target's existence in overrides.
  useEffect(() => {
    if (!selectedAnchor) return;
    if (!selectedAnchor.id.includes("@row=")) return;
    const sharedId = stripRowSuffix(selectedAnchor.id);
    if (overrides[selectedAnchor.id] && !overrides[sharedId]) {
      setScope("row");
    } else if (overrides[sharedId] && !overrides[selectedAnchor.id]) {
      setScope("shared");
    }
    // otherwise keep whatever the user chose
  }, [selectedAnchor, overrides]);

  function patchSelected(field: keyof AnchorPatch, value: number) {
    if (!selectedAnchor) return;
    const isRowTemplated = selectedAnchor.id.includes("@row=");
    const useShared = scope === "shared" && isRowTemplated;
    // y / height are row-specific for row-templated anchors; silently route
    // them to the row-specific key even when "shared" scope is active.
    const fieldIsRowLocal = field === "y" || field === "height";
    const target =
      useShared && !fieldIsRowLocal ? stripRowSuffix(selectedAnchor.id) : selectedAnchor.id;
    setOverrideFor(target, { [field]: value });
  }

  async function renderPreview() {
    setPreviewing(true);
    try {
      const sample = makeSampleProject();
      const week = sample.weeks[0]!;
      const blob = await fillWh347(sample, week, { overrides: pruneOverrides(overrides) });
      const buf = await blob.arrayBuffer();
      setPreviewBytes(new Uint8Array(buf));
    } catch (e) {
      alert(`Preview failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPreviewing(false);
    }
  }

  async function renderTypedSample() {
    setPreviewing(true);
    try {
      const blob = await renderSamplePdf(sampleText, { overrides: pruneOverrides(overrides) });
      const buf = await blob.arrayBuffer();
      setPreviewBytes(new Uint8Array(buf));
    } catch (e) {
      alert(`Preview failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPreviewing(false);
    }
  }

  const setSampleValue = useCallback((id: string, value: SampleValue | null) => {
    setSampleText((prev) => {
      const next = { ...prev };
      if (value === null || isEmptySample(value)) {
        delete next[id];
      } else {
        next[id] = value;
      }
      return next;
    });
  }, []);

  function loadFromSampleProject(overwriteExisting: boolean) {
    const project = makeSampleProject();
    const week = project.weeks[0]!;
    const seed = buildSampleMap(project, week);
    setSampleText((prev) => {
      const next: SampleTextMap = { ...prev };
      for (const [id, v] of Object.entries(seed)) {
        if (!overwriteExisting && !isEmptySample(next[id])) continue;
        next[id] = v;
      }
      return next;
    });
  }

  function clearAllSamples() {
    if (populatedSampleCount === 0) return;
    if (!confirm(`Clear all ${populatedSampleCount} sample value(s)?`)) return;
    setSampleText({});
  }

  function jumpToAnchor(id: string) {
    const target = allAnchors.find((a) => a.id === id);
    if (!target) return;
    if (target.page !== activePage) setActivePage(target.page);
    setSelectedId(id);
  }

  // Lazy object URL for the "Open in new tab" link. Created on demand from the
  // current preview bytes; revoked when the bytes change or the page unmounts.
  const previewObjectUrl = useMemo(() => {
    if (!previewBytes) return null;
    const blob = new Blob([previewBytes.slice().buffer], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  }, [previewBytes]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fall back: select in a textarea
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  function importJsonText() {
    setImportError(null);
    try {
      const next = importJson(importText);
      setOverrides((prev) => ({ ...prev, ...next }));
      setImportText("");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-900/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center size-7 rounded-md bg-amber-400 text-slate-900 font-bold">
              W
            </span>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">WH-347 calibration</h1>
              <p className="text-[11px] text-slate-400">
                Drag, resize, or nudge anchors. Edits live in localStorage and the runtime override
                map.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-md overflow-hidden border border-slate-700">
              <button
                className={`px-3 py-1 text-xs ${activePage === 1 ? "bg-amber-400 text-slate-900 font-semibold" : "bg-slate-800 hover:bg-slate-700"}`}
                onClick={() => {
                  setActivePage(1);
                  setSelectedId(null);
                }}
              >
                Page 1
              </button>
              <button
                className={`px-3 py-1 text-xs border-l border-slate-700 ${activePage === 2 ? "bg-amber-400 text-slate-900 font-semibold" : "bg-slate-800 hover:bg-slate-700"}`}
                onClick={() => {
                  setActivePage(2);
                  setSelectedId(null);
                }}
              >
                Page 2
              </button>
            </div>

            <label className="text-xs flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded border border-slate-700">
              <input
                type="checkbox"
                checked={showOverlays}
                onChange={(e) => setShowOverlays(e.currentTarget.checked)}
              />
              Anchors
            </label>

            <label className="text-xs flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded border border-slate-700">
              <input
                type="checkbox"
                checked={showSampleText}
                onChange={(e) => setShowSampleText(e.currentTarget.checked)}
              />
              Sample text
            </label>

            <button
              onClick={renderPreview}
              disabled={previewing}
              className="px-3 py-1 text-xs font-medium rounded-md bg-amber-400 text-slate-900 hover:bg-amber-300 disabled:opacity-50"
            >
              {previewing ? "Rendering…" : "Render preview PDF"}
            </button>

            <button
              onClick={renderTypedSample}
              disabled={previewing}
              className="px-3 py-1 text-xs font-medium rounded-md bg-emerald-400 text-slate-900 hover:bg-emerald-300 disabled:opacity-50"
            >
              {previewing ? "Rendering…" : "Render typed sample"}
            </button>

            <div className="flex rounded-md overflow-hidden border border-slate-700 text-xs">
              <button
                onClick={() => setSidebarTab("inspector")}
                className={`px-2 py-1 ${
                  sidebarTab === "inspector"
                    ? "bg-amber-400 text-slate-900 font-semibold"
                    : "bg-slate-800 hover:bg-slate-700"
                }`}
              >
                Inspector
              </button>
              <button
                onClick={() => setSidebarTab("samples")}
                className={`px-2 py-1 border-l border-slate-700 ${
                  sidebarTab === "samples"
                    ? "bg-amber-400 text-slate-900 font-semibold"
                    : "bg-slate-800 hover:bg-slate-700"
                }`}
              >
                Samples
              </button>
              <button
                onClick={() => setSidebarTab("export")}
                className={`px-2 py-1 border-l border-slate-700 ${
                  sidebarTab === "export"
                    ? "bg-amber-400 text-slate-900 font-semibold"
                    : "bg-slate-800 hover:bg-slate-700"
                }`}
              >
                Export
              </button>
            </div>

            <button
              onClick={resetAll}
              disabled={modifiedCount === 0}
              className="px-3 py-1 text-xs font-medium rounded-md bg-rose-700/30 text-rose-200 hover:bg-rose-700/50 border border-rose-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset all
            </button>

            <a
              href={`${import.meta.env.BASE_URL}`}
              className="px-3 py-1 text-xs text-slate-300 hover:text-amber-300 underline"
            >
              ← Main app
            </a>
          </div>
        </div>

        {(modifiedCount > 0 || populatedSampleCount > 0) && (
          <div className="border-t border-slate-700 bg-amber-900/30 text-amber-100 px-4 py-1.5 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
            {modifiedCount > 0 && (
              <span>
                {modifiedCount} live override{modifiedCount === 1 ? "" : "s"} active.
              </span>
            )}
            {populatedSampleCount > 0 && (
              <span className="text-emerald-200">
                {populatedSampleCount} typed sample value{populatedSampleCount === 1 ? "" : "s"}.
              </span>
            )}
            <span className="text-amber-200/70">
              Generated PDFs from this browser use these values. Export overrides and paste into{" "}
              <code className="font-mono">wh347Layout.ts</code> to make them permanent.
            </span>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-[1700px] mx-auto w-full p-4 flex gap-4">
        <div className="flex-1 min-w-0 overflow-auto">
          <div
            ref={overlayRef}
            onPointerDown={onOverlayPointerDown}
            onMouseMove={onOverlayMove}
            onMouseLeave={onOverlayLeave}
            style={{ width: pageSize.width, height: pageSize.height, position: "relative" }}
            className="relative inline-block"
          >
            <div className="absolute inset-0">
              <PdfBackdrop url={PDF_URL} page={activePage} scale={SCALE} />
            </div>
            {showOverlays &&
              visibleAnchors.map((a) => {
                const resolved = resolveAnchor(a);
                const rect = toScreen(resolved);
                return (
                  <AnchorBox
                    key={a.id}
                    anchor={a}
                    rect={rect}
                    selected={a.id === selectedId}
                    modified={isModified(a)}
                    sampleValue={sampleText[a.id]}
                    showSample={showSampleText}
                    scale={SCALE}
                    onSelect={setSelectedId}
                    onChange={handleAnchorChange}
                  />
                );
              })}
          </div>

          {previewBytes && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-200">Preview PDF</h3>
                {previewObjectUrl && (
                  <a
                    href={previewObjectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-300 hover:text-amber-200 underline"
                  >
                    Open in new tab
                  </a>
                )}
              </div>
              <PdfPreview data={previewBytes} scale={SCALE} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 w-80 shrink-0">
          {sidebarTab === "inspector" && (
            <Inspector
              anchor={selectedAnchor}
              resolved={resolvedSelected}
              scope={scope}
              overrides={overrides}
              sampleValue={selectedAnchor ? sampleText[selectedAnchor.id] : undefined}
              onScopeChange={setScope}
              onPatchField={patchSelected}
              onSampleChange={(v) => {
                if (!selectedAnchor) return;
                setSampleValue(selectedAnchor.id, v);
              }}
              onReset={resetSelected}
              onResetAll={resetAll}
              modifiedCount={modifiedCount}
            />
          )}

          {sidebarTab === "samples" && (
            <SamplePanel
              anchors={allAnchors}
              sampleText={sampleText}
              activePage={activePage}
              populatedCount={populatedSampleCount}
              onSampleChange={setSampleValue}
              onLoadSample={loadFromSampleProject}
              onClearAll={clearAllSamples}
              onJumpToAnchor={jumpToAnchor}
            />
          )}

          {sidebarTab === "export" && (
            <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-3">
              <div className="flex flex-wrap gap-1 text-xs">
                <Tab active={exportTab === "tspatch"} onClick={() => setExportTab("tspatch")}>
                  Replace constants
                </Tab>
                <Tab active={exportTab === "ts"} onClick={() => setExportTab("ts")}>
                  LAYOUT_OVERRIDES
                </Tab>
                <Tab active={exportTab === "json"} onClick={() => setExportTab("json")}>
                  JSON
                </Tab>
              </div>

              <ExportBlock
                tab={exportTab}
                overrides={overrides}
                onCopy={copy}
              />

              <div className="pt-2 border-t border-slate-700">
                <label className="text-xs text-slate-300 font-medium">Import JSON</label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.currentTarget.value)}
                  placeholder='{"overrides": { "HEADER_P1.projectName": { "x": 51 } }}'
                  className="mt-1 w-full h-20 rounded bg-slate-900 border border-slate-700 px-2 py-1 font-mono text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                {importError && <p className="text-[11px] text-rose-300 mt-1">{importError}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={importJsonText}
                    disabled={!importText.trim()}
                    className="px-2 py-1 text-xs rounded bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 disabled:opacity-40"
                  >
                    Merge into overrides
                  </button>
                  <button
                    onClick={() => {
                      setImportText("");
                      setImportError(null);
                    }}
                    className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-700 px-4 py-2 text-[11px] text-slate-500 text-center">
        Coordinates use the PDF point system (origin = bottom-left). Display scale: {SCALE}x.
      </footer>
    </div>
  );
}

function Tab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded ${
        active ? "bg-amber-400 text-slate-900 font-semibold" : "bg-slate-900 hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function ExportBlock({
  tab,
  overrides,
  onCopy,
}: {
  tab: "ts" | "tspatch" | "json";
  overrides: LayoutOverrides;
  onCopy: (text: string) => void;
}) {
  const pruned = useMemo(() => pruneOverrides(overrides), [overrides]);
  const text = useMemo(() => {
    if (tab === "ts") return exportTsOverrides(pruned);
    if (tab === "json") return exportJson(pruned);
    return exportTsPatch(pruned);
  }, [tab, pruned]);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => onCopy(text)}
          className="px-2 py-1 text-xs rounded bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300"
        >
          Copy to clipboard
        </button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
          download={
            tab === "json"
              ? "wh347-overrides.json"
              : tab === "ts"
                ? "wh347-overrides.ts"
                : "wh347-patch.ts"
          }
          className="px-2 py-1 text-xs rounded bg-slate-900 hover:bg-slate-700"
        >
          Download
        </a>
      </div>
      <pre className="max-h-72 overflow-auto rounded bg-slate-900 border border-slate-700 p-2 text-[11px] font-mono text-slate-200 whitespace-pre">
        {text}
      </pre>
    </div>
  );
}
