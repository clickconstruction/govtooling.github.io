/**
 * Per-anchor sample-text map used by the /dev calibration page. Parallel to
 * `LayoutOverrides`, but instead of coordinate patches it stores the actual
 * strings (or booleans for checkboxes) drawn into the PDF.
 *
 * Keys are fully-qualified `RegisteredAnchor.id` strings: there is no
 * shared-key (`stripRowSuffix`) fallback. Typing into row 1 must not bleed
 * into rows 2..N.
 */

export type SampleValue = string | boolean;
export type SampleTextMap = Record<string, SampleValue>;

export function isEmptySample(v: SampleValue | undefined): boolean {
  if (v == null) return true;
  if (typeof v === "boolean") return !v;
  return v.length === 0;
}
