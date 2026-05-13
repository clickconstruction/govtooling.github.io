import { useCallback, useEffect, useRef } from "react";
import type { RegisteredAnchor } from "../lib/pdf/anchorRegistry";
import type { SampleValue } from "../lib/pdf/sampleText";

/**
 * One draggable / resizable overlay box. Coordinates are passed in CSS pixel
 * space (already scaled). The component is "controlled": it never owns
 * position state; it just emits screen-space deltas via `onChange`.
 */

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Handle = "nw" | "ne" | "sw" | "se";

export interface AnchorBoxProps {
  anchor: RegisteredAnchor;
  /** Screen-space rect (post-scale). */
  rect: ScreenRect;
  selected: boolean;
  /** True when an override is in effect for this anchor. */
  modified: boolean;
  /** Z-index hint so newly selected boxes pop to the front. */
  zIndex?: number;
  /** Optional typed sample value to preview inside the box. */
  sampleValue?: SampleValue;
  /** When true, render the sample value inside the box (text or X). */
  showSample?: boolean;
  /** CSS px per PDF point so font sizes line up with the backdrop. */
  scale?: number;
  onSelect: (id: string) => void;
  onChange: (id: string, next: ScreenRect) => void;
}

export function AnchorBox({
  anchor,
  rect,
  selected,
  modified,
  zIndex,
  sampleValue,
  showSample,
  scale = 1.5,
  onSelect,
  onChange,
}: AnchorBoxProps) {
  const startRef = useRef<{
    pointerId: number;
    mode: "move" | Handle;
    pageX: number;
    pageY: number;
    rect: ScreenRect;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, mode: "move" | Handle) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(anchor.id);
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      startRef.current = {
        pointerId: e.pointerId,
        mode,
        pageX: e.pageX,
        pageY: e.pageY,
        rect: { ...rect },
      };
    },
    [anchor.id, onSelect, rect],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = startRef.current;
      if (!s || e.pointerId !== s.pointerId) return;
      const dx = e.pageX - s.pageX;
      const dy = e.pageY - s.pageY;
      let next: ScreenRect = { ...s.rect };
      if (s.mode === "move") {
        next.left = s.rect.left + dx;
        next.top = s.rect.top + dy;
      } else {
        if (s.mode === "nw" || s.mode === "sw") {
          next.left = s.rect.left + dx;
          next.width = Math.max(4, s.rect.width - dx);
        }
        if (s.mode === "ne" || s.mode === "se") {
          next.width = Math.max(4, s.rect.width + dx);
        }
        if (s.mode === "nw" || s.mode === "ne") {
          next.top = s.rect.top + dy;
          next.height = Math.max(4, s.rect.height - dy);
        }
        if (s.mode === "sw" || s.mode === "se") {
          next.height = Math.max(4, s.rect.height + dy);
        }
      }
      onChange(anchor.id, next);
    },
    [anchor.id, onChange],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    startRef.current = null;
  }, []);

  // Keyboard nudge handled at DevPage level; we just need to be focusable for screen-readers.
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selected) ref.current?.focus({ preventScroll: true });
  }, [selected]);

  const borderClass = selected
    ? "border-amber-400/90"
    : modified
      ? "border-emerald-400/70"
      : anchor.kind === "checkbox"
        ? "border-sky-400/60"
        : "border-rose-400/60";

  const bgClass = selected
    ? "bg-amber-400/15"
    : modified
      ? "bg-emerald-400/10"
      : "bg-transparent hover:bg-rose-400/10";

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="button"
      aria-label={anchor.label}
      aria-pressed={selected}
      onPointerDown={(e) => onPointerDown(e, "move")}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex: zIndex ?? (selected ? 50 : modified ? 5 : 1),
      }}
      className={`group border outline outline-1 outline-black/10 ${borderClass} ${bgClass} cursor-move select-none transition-colors`}
    >
      {selected && (
        <>
          <Handle pos="nw" onPointerDown={(e) => onPointerDown(e, "nw")} />
          <Handle pos="ne" onPointerDown={(e) => onPointerDown(e, "ne")} />
          <Handle pos="sw" onPointerDown={(e) => onPointerDown(e, "sw")} />
          <Handle pos="se" onPointerDown={(e) => onPointerDown(e, "se")} />
        </>
      )}
      {showSample && sampleValue != null && sampleValue !== false && sampleValue !== "" && (
        <SamplePreview anchor={anchor} value={sampleValue} scale={scale} />
      )}
      <span
        className={`pointer-events-none absolute left-0 -top-3.5 px-1 py-px text-[9px] font-mono leading-none rounded-sm whitespace-nowrap ${
          selected
            ? "bg-amber-400 text-slate-900"
            : "opacity-0 group-hover:opacity-100 bg-slate-900/85 text-slate-50"
        }`}
      >
        {anchor.id}
      </span>
    </div>
  );
}

function SamplePreview({
  anchor,
  value,
  scale,
}: {
  anchor: RegisteredAnchor;
  value: SampleValue;
  scale: number;
}) {
  if (anchor.kind === "checkbox") {
    if (value !== true) return null;
    const size = (anchor.size ?? 10) * scale;
    return (
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-bold text-slate-900 leading-none"
        style={{ fontSize: size }}
      >
        X
      </span>
    );
  }
  if (typeof value !== "string" || value.length === 0) return null;
  const sizePx = (anchor.size ?? 9) * scale;
  const align = anchor.align ?? "left";
  const justify = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  return (
    <span
      className="pointer-events-none absolute inset-0 flex items-end leading-none overflow-hidden text-slate-900"
      style={{
        fontSize: sizePx,
        justifyContent: justify,
        fontFamily: "Helvetica, Arial, sans-serif",
        paddingBottom: 1,
      }}
    >
      <span className="whitespace-nowrap">{value}</span>
    </span>
  );
}

function Handle({
  pos,
  onPointerDown,
}: {
  pos: Handle;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const map = {
    nw: { left: -4, top: -4, cursor: "nwse-resize" },
    ne: { right: -4, top: -4, cursor: "nesw-resize" },
    sw: { left: -4, bottom: -4, cursor: "nesw-resize" },
    se: { right: -4, bottom: -4, cursor: "nwse-resize" },
  } as const;
  const style = map[pos];
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute size-2 bg-amber-400 border border-slate-900 rounded-sm"
      style={{ ...style }}
    />
  );
}
