/**
 * Fetches `public/wh347.pdf` once and returns fresh `ArrayBuffer` slices on
 * subsequent calls. Shared by every renderer so a fill + a sample preview
 * don't re-download the template.
 */

const PDF_URL = `${import.meta.env.BASE_URL}wh347.pdf`;

let cached: ArrayBuffer | null = null;

export async function loadTemplate(): Promise<ArrayBuffer> {
  if (cached) return cached.slice(0);
  const res = await fetch(PDF_URL);
  if (!res.ok) throw new Error(`Failed to fetch WH-347 template: ${res.status}`);
  cached = await res.arrayBuffer();
  return cached.slice(0);
}
