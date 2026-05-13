import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState, SectionCard } from "../components/ui";
import { LedgerSidebar } from "./LedgerSidebar";
import { LedgerEditor } from "./LedgerEditor";
import {
  type GeneratorWorkspace,
  type Ledger,
  loadGenerator,
  makeEmptyLedger,
  saveGenerator,
} from "./storage";

export function GeneratorPage() {
  const [workspace, setWorkspace] = useState<GeneratorWorkspace>(() => loadGenerator());
  const [activeId, setActiveId] = useState<string | null>(
    () => loadGenerator().ledgers[0]?.id ?? null,
  );
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    saveGenerator(workspace);
  }, [workspace]);

  const upsertLedger = useCallback((ledger: Ledger) => {
    setWorkspace((w) => {
      const next = { ...ledger, updatedAt: new Date().toISOString() };
      const idx = w.ledgers.findIndex((l) => l.id === ledger.id);
      const ledgers =
        idx >= 0 ? w.ledgers.toSpliced(idx, 1, next) : [...w.ledgers, next];
      return { ...w, ledgers };
    });
  }, []);

  const removeLedger = useCallback(
    (id: string) => {
      setWorkspace((w) => ({ ...w, ledgers: w.ledgers.filter((l) => l.id !== id) }));
      if (activeId === id) setActiveId(null);
    },
    [activeId],
  );

  const createLedger = useCallback(() => {
    const fresh = makeEmptyLedger();
    upsertLedger(fresh);
    setActiveId(fresh.id);
  }, [upsertLedger]);

  const active = activeId ? workspace.ledgers.find((l) => l.id === activeId) ?? null : null;

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 no-print">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-flex items-center justify-center size-8 rounded-md bg-brand-600 text-white font-bold"
            >
              G
            </span>
            <div>
              <h1 className="text-base font-semibold tracking-tight">
                Payroll Generator
              </h1>
              <p className="text-xs text-slate-500">
                Convert weekly checks into Mon-Fri hours and import into a WH-347 project
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${import.meta.env.BASE_URL}index.html`}
              className="text-xs text-slate-500 hover:text-brand-700 underline"
            >
              ← Back to WH-347 generator
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <LedgerSidebar
            ledgers={workspace.ledgers}
            activeId={activeId}
            onSelect={setActiveId}
            onCreate={createLedger}
            onDelete={removeLedger}
          />
          {active ? (
            <LedgerEditor ledger={active} onChange={upsertLedger} />
          ) : (
            <SectionCard>
              <EmptyState
                title={
                  workspace.ledgers.length === 0
                    ? "No ledgers yet"
                    : "Select a ledger"
                }
                description={
                  workspace.ledgers.length === 0
                    ? "Add a worker to start tracking weekly checks."
                    : "Pick a worker from the list, or add a new one."
                }
              />
            </SectionCard>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white no-print">
        <div className="max-w-[1400px] mx-auto px-4 py-3 text-xs text-slate-500 flex items-center justify-between">
          <span>
            Data stays on this device. Nothing is uploaded.
            {" · "}
            <a href={`${import.meta.env.BASE_URL}index.html`} className="underline">
              WH-347 generator
            </a>
            {" · "}
            <a href={`${import.meta.env.BASE_URL}dev.html`} className="underline">
              Dev calibration
            </a>
          </span>
          <span>This is a formatting tool, not legal advice.</span>
        </div>
      </footer>
    </div>
  );
}
