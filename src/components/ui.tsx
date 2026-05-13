import { useId, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500";
  const variants: Record<string, string> = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
    secondary:
      "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 shadow-sm",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    danger:
      "bg-white text-red-700 border border-red-300 hover:bg-red-50 shadow-sm",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}

export function TextInput({
  label,
  hint,
  error,
  className = "",
  ...rest
}: {
  label?: string;
  hint?: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`px-2.5 py-1.5 rounded-md border bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
          error ? "border-red-400" : "border-slate-300"
        } ${className}`}
        {...rest}
      />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function NumberCell({
  value,
  onChange,
  className = "",
  step = "0.01",
  min,
  max,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  step?: string;
  min?: number;
  max?: number;
  ariaLabel?: string;
}) {
  return (
    <input
      type="number"
      aria-label={ariaLabel}
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const n = e.currentTarget.valueAsNumber;
        onChange(Number.isFinite(n) ? n : 0);
      }}
      className={`w-full px-1 py-0.5 text-right text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-brand-500 rounded ${className}`}
    />
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  className = "",
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  label?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={`flex items-center gap-2 text-sm cursor-pointer ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      {label && <span>{label}</span>}
    </label>
  );
}

export function Field({
  label,
  children,
  ...labelProps
}: { label: string; children: ReactNode } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-700" {...labelProps}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SectionCard({
  title,
  actions,
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-sm">
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
