/**
 * Fetches `public/fonts/HomemadeApple-Regular.ttf` once and returns fresh
 * `ArrayBuffer` slices on subsequent calls. Used by `fillWh347` to render
 * the signature field in a cursive script font instead of Helvetica.
 *
 * Homemade Apple is licensed under Apache 2.0 (see
 * `public/fonts/HomemadeApple-LICENSE.txt`).
 */

const FONT_URL = `${import.meta.env.BASE_URL}fonts/HomemadeApple-Regular.ttf`;

let cached: ArrayBuffer | null = null;

export async function loadSignatureFont(): Promise<ArrayBuffer> {
  if (cached) return cached.slice(0);
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`Failed to fetch signature font: ${res.status}`);
  cached = await res.arrayBuffer();
  return cached.slice(0);
}
