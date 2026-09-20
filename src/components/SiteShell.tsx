import type { ReactNode } from "react";

/**
 * The Tooling family's shell, shared by the two tools: the courthouse-and-seal mark, the name,
 * one line on what this page does, and the two tools as pills. The pages behind it are
 * untouched — same addresses, same storage, same PDF.
 */

export type Tool = "payroll" | "hours";

const BASE = import.meta.env.BASE_URL;

const TOOLS: ReadonlyArray<{ key: Tool; label: string; href: string }> = [
  { key: "payroll", label: "Certified payroll (WH-347)", href: `${BASE}index.html` },
  { key: "hours", label: "Hours from checks", href: `${BASE}generator.html` },
];

export function SiteHeader({
  current,
  tagline,
  actions,
}: {
  current: Tool;
  tagline: string;
  actions?: ReactNode;
}) {
  return (
    <div className="no-print">
      <header className="bg-brand-600 text-white">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <a href={`${BASE}index.html`} className="flex items-center gap-3 min-w-0">
            <img
              src={`${BASE}icons/favicon.svg`}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-[9px] shrink-0"
            />
            <span className="min-w-0 leading-tight">
              <span className="block text-lg font-bold tracking-tight">GovTooling</span>
              <span className="hidden sm:block text-[13px] text-[#bdbbb3] truncate">
                {tagline} · Click Plumbing and Electrical
              </span>
            </span>
          </a>
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        </div>
      </header>
      <nav
        aria-label="Tools"
        className="bg-white border-b border-slate-200"
      >
        <div className="max-w-[1400px] mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {TOOLS.map((t) => (
              <a
                key={t.key}
                href={t.href}
                aria-current={t.key === current ? "page" : undefined}
                className={
                  t.key === current
                    ? "px-3 py-1 rounded-full text-[13px] font-semibold bg-brand-600 text-[#e8c547] border border-brand-600"
                    : "px-3 py-1 rounded-full text-[13px] text-slate-600 border border-slate-200 hover:border-slate-400"
                }
              >
                {t.label}
              </a>
            ))}
          </div>
          <span className="text-xs text-slate-500">
            Data stays on this device. Nothing is uploaded.
          </span>
        </div>
      </nav>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white no-print">
      <div className="max-w-[1400px] mx-auto px-4 py-3 text-xs text-slate-500 flex items-center justify-between gap-4 flex-wrap">
        <span>
          A formatting tool, not legal advice.
          {" · "}
          <a
            href="https://github.com/clickconstruction/govtooling.github.io"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Source on GitHub
          </a>
          {" · "}
          <a href={`${BASE}dev.html`} className="underline">
            For developers: PDF calibration
          </a>
        </span>
        <span>WH-347 · Rev. January 2025</span>
      </div>
    </footer>
  );
}
