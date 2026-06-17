import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";
import { Field, NumInput, Pills, Select, Toggle, FormScaffold } from "@/components/form";
import { useBeans } from "@/data/beans";
import { useMethods } from "@/data/methods";
import { useGrinders } from "@/data/grinders";
import { useBrewRow, useCreateBrew, useUpdateBrew, useDeleteBrew } from "@/data/brews";
import { brewSchema } from "@/domain/brew.schema";
import type { MethodKey } from "@/domain/method";

/* Campos específicos por método — reflejan el discriminatedUnion de
   brew.schema.ts (method_params). El form los muestra según el método activo. */
type PField =
  | { key: string; label: string; kind: "num"; unit?: string }
  | { key: string; label: string; kind: "bool" }
  | { key: string; label: string; kind: "enum"; options: { value: string; label: string }[] };

const METHOD_FIELDS: Record<MethodKey, PField[]> = {
  espresso: [
    { key: "pressure_bar", label: "Presión", kind: "num", unit: "bar" },
    { key: "preinfusion_s", label: "Preinfusión", kind: "num", unit: "s" },
    { key: "basket_size_g", label: "Canasta", kind: "num", unit: "g" },
  ],
  v60: [
    { key: "bloom_water_g", label: "Agua bloom", kind: "num", unit: "g" },
    { key: "bloom_time_s", label: "Tiempo bloom", kind: "num", unit: "s" },
    { key: "pours", label: "Vertidos", kind: "num" },
    { key: "swirl", label: "Swirl", kind: "bool" },
  ],
  aeropress: [
    { key: "inverted", label: "Invertida", kind: "bool" },
    { key: "steep_time_s", label: "Reposo", kind: "num", unit: "s" },
    { key: "plunge_time_s", label: "Prensado", kind: "num", unit: "s" },
    { key: "bypass_g", label: "Bypass", kind: "num", unit: "g" },
  ],
  french_press: [
    { key: "steep_time_s", label: "Reposo", kind: "num", unit: "s" },
    { key: "break_crust", label: "Romper costra", kind: "bool" },
  ],
  moka: [
    {
      key: "heat_level",
      label: "Fuego",
      kind: "enum",
      options: [
        { value: "low", label: "Bajo" },
        { value: "medium", label: "Medio" },
        { value: "high", label: "Alto" },
      ],
    },
    { key: "prewarmed_water", label: "Agua precalentada", kind: "bool" },
  ],
  cold_brew: [
    { key: "steep_hours", label: "Reposo", kind: "num", unit: "h" },
    { key: "in_fridge", label: "En nevera", kind: "bool" },
    { key: "concentrate_ratio", label: "Ratio concentrado", kind: "num" },
  ],
  cold_drip: [
    { key: "drops_per_min", label: "Gotas/min", kind: "num" },
    { key: "total_drip_hours", label: "Goteo total", kind: "num", unit: "h" },
  ],
};

const numOrUndef = (s: unknown) => {
  const n = parseFloat(String(s));
  return Number.isFinite(n) ? n : undefined;
};

export function BrewForm({ brewId }: { brewId?: string }) {
  const navigate = useNavigate();
  const editing = !!brewId;
  const { data: beans = [] } = useBeans();
  const { data: methods = [] } = useMethods();
  const { data: grinders = [] } = useGrinders();
  const { data: row } = useBrewRow(brewId);
  const createBrew = useCreateBrew();
  const updateBrew = useUpdateBrew();
  const deleteBrew = useDeleteBrew();

  const [beanId, setBeanId] = useState<string | null>(null);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [grinderId, setGrinderId] = useState<string | null>(null);
  const [dose, setDose] = useState("18");
  const [water, setWater] = useState("297");
  const [temp, setTemp] = useState("93");
  const [time, setTime] = useState("");
  const [grind, setGrind] = useState("22");
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  // Parámetros específicos del método (clave → string|boolean).
  const [mparams, setMparams] = useState<Record<string, string | boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  // Defaults una vez cargan catálogos (solo en creación).
  useEffect(() => {
    if (!editing && beanId === null && beans.length) setBeanId(beans[0].id);
  }, [editing, beans, beanId]);
  useEffect(() => {
    if (!editing && methodId === null && methods.length) {
      setMethodId(methods.find((m) => m.key === "v60")?.id ?? methods[0].id);
    }
  }, [editing, methods, methodId]);
  useEffect(() => {
    if (!editing && grinderId === null && grinders.length) setGrinderId(grinders[0].id);
  }, [editing, grinders, grinderId]);

  // Prellenar en edición.
  useEffect(() => {
    if (!row) return;
    setBeanId(row.bean_id ?? null);
    setMethodId(row.method_id ?? null);
    setGrinderId(row.grinder_id ?? null);
    setDose(row.dose_g != null ? String(row.dose_g) : "");
    setWater(row.yield_g != null ? String(row.yield_g) : "");
    setTemp(row.water_temp_c != null ? String(row.water_temp_c) : "");
    setTime(row.total_time_s != null ? String(row.total_time_s) : "");
    setGrind(row.grind_setting ?? "");
    setRating(row.rating ?? null);
    setNotes(row.notes ?? "");
    const mp = { ...(row.method_params ?? {}) };
    delete mp.method;
    const norm: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries(mp)) norm[k] = typeof v === "boolean" ? v : String(v);
    setMparams(norm);
  }, [row]);

  const method = methods.find((m) => m.id === methodId);
  const methodKey = method?.key as MethodKey | undefined;
  const fields = methodKey ? METHOD_FIELDS[methodKey] ?? [] : [];

  const grinder = grinders.find((g) => g.id === grinderId);
  const grindUnit = grinder?.unit_label || "μm";

  const d = parseFloat(dose) || 0;
  const w = parseFloat(water) || 0;
  const t = parseFloat(temp) || 0;
  const ratio = d > 0 ? w / d : 0;
  const tempErr = t && (t < 80 || t > 100) ? "Fuera de rango habitual (80–100 °C)" : null;

  const setParam = (k: string, v: string | boolean) => setMparams((p) => ({ ...p, [k]: v }));

  function buildMethodParams(key: MethodKey) {
    const out: Record<string, unknown> = { method: key };
    for (const f of METHOD_FIELDS[key]) {
      const raw = mparams[f.key];
      if (f.kind === "num") {
        const n = numOrUndef(raw);
        if (n !== undefined) out[f.key] = n;
      } else if (f.kind === "bool") {
        if (raw === true) out[f.key] = true;
      } else {
        if (raw) out[f.key] = raw;
      }
    }
    return out;
  }

  async function handleSave() {
    setErr(null);
    if (!method) {
      setErr("Selecciona un método.");
      return;
    }
    const parsed = brewSchema.safeParse({
      bean_id: beanId,
      method_id: method.id,
      grinder_id: grinderId,
      grind_setting: grind.trim() || undefined,
      dose_g: d || undefined,
      yield_g: w || undefined,
      water_temp_c: t || undefined,
      total_time_s: time.trim() ? Math.round(parseFloat(time)) : undefined,
      rating: rating ?? undefined,
      method_params: buildMethodParams(method.key as MethodKey),
      outcome_tags: [],
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    try {
      if (editing) await updateBrew.mutateAsync({ id: brewId!, input: parsed.data });
      else await createBrew.mutateAsync(parsed.data);
      navigate({ to: "/brews" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar la extracción.");
    }
  }

  async function handleDelete() {
    if (!brewId) return;
    try {
      await deleteBrew.mutateAsync(brewId);
      navigate({ to: "/brews" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo borrar la extracción.");
    }
  }

  return (
    <AppShell title={editing ? "Editar extracción" : "Nueva extracción"}>
      <FormScaffold
        title={editing ? "Editar" : "Registrar"}
        sub={editing ? "Extracción" : "Nueva tanda"}
        onBack={() => navigate({ to: "/brews" })}
        onSave={handleSave}
        saving={createBrew.isPending || updateBrew.isPending}
        saveLabel={editing ? "Guardar cambios" : "Guardar extracción"}
        error={err}
        onDelete={editing ? handleDelete : undefined}
        deleting={deleteBrew.isPending}
      >
        {/* grano */}
        <Field label="Grano" help={beans.length === 0 ? "Sin granos en el inventario — se guardará sin grano." : undefined}>
          <div className="-mx-0.5 flex gap-2 overflow-x-auto pb-1">
            {beans.map((b) => {
              const sel = b.id === beanId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBeanId(sel ? null : b.id)}
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
          <Pills
            value={methodId}
            onChange={(id) => id && setMethodId(id)}
            options={methods.map((m) => ({ value: m.id, label: m.name }))}
          />
        </Field>

        {/* moledor */}
        <Field
          label="Moledor"
          help={grinders.length === 0 ? "Sin moledores en el inventario — se guardará sin moledor." : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {grinders.map((g) => {
              const sel = g.id === grinderId;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGrinderId(sel ? null : g.id)}
                  className="flex items-center gap-2 rounded-pill px-3.5 py-2 text-[13px] font-semibold"
                  style={{
                    border: `1px solid ${sel ? "var(--accent)" : "var(--hairline-strong)"}`,
                    background: sel ? "var(--glow)" : "var(--surface-2)",
                  }}
                >
                  <span className="whitespace-nowrap">{g.name}</span>
                  <span className="mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    {g.type === "manual" ? "manual" : "eléctrico"}
                  </span>
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
          <Field label="Molienda" help={grinder ? `Ajuste en ${grindUnit}` : "Tamaño de partícula (μm)"}>
            <NumInput value={grind} onChange={setGrind} unit={grindUnit} />
          </Field>
        </div>

        <Field label="Tiempo total" opt help="Segundos (tiempo de vertido / extracción).">
          <NumInput value={time} onChange={setTime} unit="s" />
        </Field>

        {/* parámetros específicos del método */}
        {fields.length > 0 && (
          <div className="mb-4 rounded-lg border border-hairline bg-surface-2 p-3.5">
            <div className="tag mb-3">Parámetros · {method?.name}</div>
            <div className="grid grid-cols-2 gap-3.5">
              {fields.map((f) => {
                if (f.kind === "bool") {
                  return (
                    <div key={f.key} className="flex items-end pb-1">
                      <Toggle
                        label={f.label}
                        checked={mparams[f.key] === true}
                        onChange={(v) => setParam(f.key, v)}
                      />
                    </div>
                  );
                }
                if (f.kind === "enum") {
                  return (
                    <Field key={f.key} label={f.label} opt>
                      <Select
                        value={(mparams[f.key] as string) || ""}
                        onChange={(v) => setParam(f.key, v)}
                        options={f.options}
                        placeholder="—"
                      />
                    </Field>
                  );
                }
                return (
                  <Field key={f.key} label={f.label} opt>
                    <NumInput
                      value={(mparams[f.key] as string) ?? ""}
                      onChange={(v) => setParam(f.key, v)}
                      unit={f.unit}
                    />
                  </Field>
                );
              })}
            </div>
          </div>
        )}

        {/* calificación */}
        <Field label="Calificación" opt help="1–5 estrellas; alimenta la puntuación.">
          <Pills<string>
            value={rating != null ? String(rating) : null}
            onChange={(v) => setRating(v ? parseInt(v, 10) : null)}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
            allowNull
          />
        </Field>

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
      </FormScaffold>
    </AppShell>
  );
}
