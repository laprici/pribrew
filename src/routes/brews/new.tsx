import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";
import { useBeans } from "@/data/beans";
import { useMethods } from "@/data/methods";
import { useCreateBrew } from "@/data/brews";
import { brewSchema } from "@/domain/brew.schema";

export const Route = createFileRoute("/brews/new")({
  component: NewBrewPage,
});

function Field({
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

function NumInput({
  value,
  onChange,
  unit,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  error?: boolean;
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

function NewBrewPage() {
  const navigate = useNavigate();
  const { data: beans = [] } = useBeans();
  const { data: methods = [] } = useMethods();
  const createBrew = useCreateBrew();

  const [beanId, setBeanId] = useState<string | null>(null);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [dose, setDose] = useState("18");
  const [water, setWater] = useState("297");
  const [temp, setTemp] = useState("93");
  const [grind, setGrind] = useState("22");
  const [notes, setNotes] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);

  // Defaults una vez cargan los catálogos.
  useEffect(() => {
    if (beanId === null && beans.length) setBeanId(beans[0].id);
  }, [beans, beanId]);
  useEffect(() => {
    if (methodId === null && methods.length) {
      setMethodId(methods.find((m) => m.key === "v60")?.id ?? methods[0].id);
    }
  }, [methods, methodId]);

  const d = parseFloat(dose) || 0;
  const w = parseFloat(water) || 0;
  const t = parseFloat(temp) || 0;
  const ratio = d > 0 ? w / d : 0;
  const tempErr = t && (t < 80 || t > 100) ? "Fuera de rango habitual (80–100 °C)" : null;

  async function handleSave() {
    setFormErr(null);
    const method = methods.find((m) => m.id === methodId);
    if (!method) {
      setFormErr("Selecciona un método.");
      return;
    }
    const parsed = brewSchema.safeParse({
      bean_id: beanId,
      method_id: method.id,
      grinder_id: null,
      grind_setting: grind.trim() || undefined,
      dose_g: d || undefined,
      yield_g: w || undefined,
      water_temp_c: t || undefined,
      method_params: { method: method.key },
      outcome_tags: [],
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      setFormErr(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    try {
      await createBrew.mutateAsync(parsed.data);
      navigate({ to: "/brews" });
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "No se pudo guardar la extracción.");
    }
  }

  return (
    <AppShell title="Nueva extracción">
      <div className="mx-auto max-w-xl">
        <div className="flex items-start gap-3 pb-4">
          <button
            onClick={() => navigate({ to: "/brews" })}
            aria-label="Atrás"
            className="grid h-10 w-10 flex-none place-items-center rounded-md border border-hairline text-ink transition-colors hover:bg-chip"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="tag mb-1">Nueva tanda</div>
            <h1 className="text-2xl font-semibold leading-none tracking-[-0.03em]">Registrar</h1>
          </div>
        </div>

        {/* grano */}
        <Field label="Grano" help={beans.length === 0 ? "Sin granos en el inventario — se guardará sin grano." : undefined}>
          <div className="-mx-0.5 flex gap-2 overflow-x-auto pb-1">
            {beans.map((b) => {
              const sel = b.id === beanId;
              return (
                <button
                  key={b.id}
                  onClick={() => setBeanId(b.id)}
                  className="flex flex-none items-center gap-2.5 rounded-pill py-2 pl-2 pr-3.5"
                  style={{
                    border: `1px solid ${sel ? "var(--accent)" : "var(--hairline-strong)"}`,
                    background: sel ? "var(--glow)" : "var(--surface-2)",
                  }}
                >
                  <span className="h-[22px] w-[22px] flex-none rounded-[7px]" style={{ background: b.color }} />
                  <span className="whitespace-nowrap text-[13.5px] font-semibold">{b.origin}</span>
                </button>
              );
            })}
          </div>
        </Field>

        {/* método */}
        <Field label="Método">
          <div className="flex flex-wrap gap-2">
            {methods.map((m) => {
              const sel = m.id === methodId;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethodId(m.id)}
                  className="mono rounded-pill px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.1em]"
                  style={{
                    border: `1px solid ${sel ? "var(--accent)" : "var(--hairline)"}`,
                    background: sel ? "var(--accent)" : "transparent",
                    color: sel ? "var(--accent-ink)" : "var(--ink-soft)",
                  }}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Dosis">
            <NumInput value={dose} onChange={setDose} unit="g" />
          </Field>
          <Field label="Agua">
            <NumInput value={water} onChange={setWater} unit="g" />
          </Field>
        </div>

        {/* ratio derivado en vivo */}
        <Card className="mb-4 flex items-center gap-3 bg-surface-2">
          <span className="tag">Ratio derivado</span>
          <span className="mono ml-auto text-[26px] font-medium text-accent">
            1:{ratio ? ratio.toFixed(1).replace(/\.0$/, "") : "—"}
          </span>
        </Card>

        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Temperatura" error={tempErr}>
            <NumInput value={temp} onChange={setTemp} unit="°C" error={!!tempErr} />
          </Field>
          <Field label="Molienda" help="Tamaño de partícula (μm)">
            <NumInput value={grind} onChange={setGrind} unit="μm" />
          </Field>
        </div>

        <Field label="Notas de cata" opt>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Aroma, acidez, cuerpo, final…"
            className="field resize-none leading-relaxed"
            style={{ fontFamily: "var(--font-display)" }}
          />
        </Field>

        {formErr && <div className="mono mb-2 text-[12px] text-warn">{formErr}</div>}

        <div className="mt-2 flex flex-col gap-2.5">
          <button
            onClick={handleSave}
            disabled={createBrew.isPending}
            className="btn-primary disabled:opacity-60"
          >
            <Check size={17} /> {createBrew.isPending ? "Guardando…" : "Guardar extracción"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
