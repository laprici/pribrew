import { useState, type ReactNode } from "react";
import { ArrowLeft, Check, Trash2 } from "lucide-react";

/* Átomos de formulario compartidos por los formularios de granos, moledores
   y extracción. Reusan el lenguaje visual de la app (.field/.label, pills,
   NumInput mono) para mantener consistencia. */

export function Field({
  label,
  opt,
  help,
  error,
  children,
}: {
  label: string;
  opt?: boolean;
  help?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="tag text-[10px] text-ink-soft">{label}</span>
        {opt && <span className="tag text-[9px] normal-case tracking-normal">opcional</span>}
      </div>
      {children}
      {help && !error && (
        <div className="tag mt-1.5 text-[9.5px] normal-case leading-snug tracking-normal">{help}</div>
      )}
      {error && <div className="mono mt-1.5 text-[11px] text-warn">{error}</div>}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="field"
      style={error ? { borderColor: "var(--warn)" } : undefined}
    />
  );
}

export function NumInput({
  value,
  onChange,
  unit,
  error,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  error?: boolean;
  placeholder?: string;
}) {
  const [focus, setFocus] = useState(false);
  const border = error ? "var(--warn)" : focus ? "var(--accent)" : "var(--hairline-strong)";
  return (
    <div
      className="flex items-stretch overflow-hidden rounded-md bg-surface-2 transition-[border-color,box-shadow] duration-150"
      style={{ border: `1px solid ${border}`, boxShadow: focus ? "0 0 0 3px var(--glow)" : "none" }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className="mono min-w-0 flex-1 border-none bg-transparent px-3.5 py-3 text-[15px] font-medium text-ink outline-none"
      />
      {unit && (
        <span className="mono flex items-center border-l border-hairline bg-chip px-3.5 text-[13px] text-muted">
          {unit}
        </span>
      )}
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className="field appearance-none">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Selección por píldoras (enum). Con `allowNull`, re-click deselecciona. */
export function Pills<T extends string>({
  value,
  onChange,
  options,
  allowNull,
}: {
  value: T | null;
  onChange: (v: T | null) => void;
  options: { value: T; label: string }[];
  allowNull?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(sel && allowNull ? null : o.value)}
            className="mono rounded-pill px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{
              border: `1px solid ${sel ? "var(--accent)" : "var(--hairline)"}`,
              background: sel ? "var(--accent)" : "transparent",
              color: sel ? "var(--accent-ink)" : "var(--ink-soft)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Interruptor sí/no estilo píldora. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="mono flex items-center gap-2 rounded-pill px-3.5 py-2 text-[12px] font-medium"
      style={{
        border: `1px solid ${checked ? "var(--accent)" : "var(--hairline-strong)"}`,
        background: checked ? "var(--glow)" : "var(--surface-2)",
        color: checked ? "var(--accent)" : "var(--ink-soft)",
      }}
    >
      <span
        className="grid h-4 w-4 place-items-center rounded-[5px]"
        style={{ border: `1px solid ${checked ? "var(--accent)" : "var(--hairline-strong)"}` }}
      >
        {checked && <Check size={12} />}
      </span>
      {label}
    </button>
  );
}

/** Cascarón de página-formulario: cabecera con atrás + título, cuerpo, y
    pie con guardar / borrar / error. */
export function FormScaffold({
  title,
  sub,
  onBack,
  children,
  onSave,
  saving,
  saveLabel = "Guardar",
  error,
  onDelete,
  deleting,
}: {
  title: string;
  sub?: string;
  onBack: () => void;
  children: ReactNode;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  error?: string | null;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-start gap-3 pb-4">
        <button
          onClick={onBack}
          aria-label="Atrás"
          className="grid h-10 w-10 flex-none place-items-center rounded-md border border-hairline text-ink transition-colors hover:bg-chip"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          {sub && <div className="tag mb-1">{sub}</div>}
          <h1 className="text-2xl font-semibold leading-none tracking-[-0.03em]">{title}</h1>
        </div>
      </div>

      {children}

      {error && <div className="mono mb-2 text-[12px] text-warn">{error}</div>}

      <div className="mt-2 flex flex-col gap-2.5">
        <button onClick={onSave} disabled={saving} className="btn-primary disabled:opacity-60">
          <Check size={17} /> {saving ? "Guardando…" : saveLabel}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="btn-ghost text-warn disabled:opacity-60"
          >
            <Trash2 size={16} /> {deleting ? "Borrando…" : "Borrar"}
          </button>
        )}
      </div>
    </div>
  );
}
