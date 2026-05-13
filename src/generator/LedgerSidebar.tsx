import { Button, SectionCard } from "../components/ui";
import { displayName, type Ledger } from "./storage";

export function LedgerSidebar({
  ledgers,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: {
  ledgers: Ledger[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <SectionCard
      title="Workers"
      actions={
        <Button onClick={onCreate} variant="primary">
          + New worker
        </Button>
      }
    >
      {ledgers.length === 0 ? (
        <p className="text-sm text-slate-500">
          Add a worker to start tracking weekly checks.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {ledgers.map((l) => {
            const txCount = l.transactions.length;
            const isActive = activeId === l.id;
            const name = displayName(l.worker);
            return (
              <li
                key={l.id}
                className="py-1.5 flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => onSelect(l.id)}
                  className={`flex-1 text-left px-2 py-1 rounded ${
                    isActive ? "bg-brand-50 text-brand-700" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="text-sm font-medium truncate">{name}</div>
                  <div className="text-[11px] text-slate-500">
                    {txCount} {txCount === 1 ? "check" : "checks"}
                    {l.hourlyRate > 0 ? ` · $${l.hourlyRate}/hr` : ""}
                    {l.worker.classification ? ` · ${l.worker.classification}` : ""}
                  </div>
                </button>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline px-1"
                  onClick={() => {
                    if (confirm(`Delete ledger for ${name}?`)) {
                      onDelete(l.id);
                    }
                  }}
                  aria-label="delete worker ledger"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
