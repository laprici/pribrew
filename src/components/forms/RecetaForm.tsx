import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";
import { Field, NumInput, Pills, Select, Toggle, TextInput, FormScaffold } from "@/components/form";
import { ShareGroupsField } from "@/components/ShareGroups";
import { useMethods } from "@/data/methods";
import { useRecetaRow, useCreateReceta, useUpdateReceta, useDeleteReceta } from "@/data/recetas";
import { useItemShares, useSetItemShares } from "@/data/shares";
import { recetaSchema } from "@/domain/receta.schema";
import type { MethodKey } from "@/domain/method";
import { buildSteps, parseClock, fmtClock } from "@/domain/methodSteps";
import { METHOD_FIELDS } from "@/domain/methodFields";
import { Trash2, Plus } from "lucide-react";

/* Layout de objetivos por método:
   - volume "ratio": dosis + ratio editable (+ temp en la cuadrícula)
   - volume "ml": dosis + ml editable (sin ratio visible)
   - volume "ml-with-ratio": dosis + ml editable + ratio calculado (solo lectura)
   - temp: dónde vive la temperatura (cuadrícula / parámetros / eliminada)
   - showTime: añade «tiempo de extracción» (espresso)
   - steps: muestra el editor de pasos */
type RecipeCfg = {
  volume: "ratio" | "ml" | "ml-with-ratio";
  mlLabel?: string;
  showTime?: boolean;
  temp: "grid" | "param" | "none";
  steps: boolean;
};

const RECIPE_CFG: Record<MethodKey, RecipeCfg> = {
  v60: { volume: "ml-with-ratio", mlLabel: "ml agua", temp: "param", steps: true },
  moka: { volume: "ratio", temp: "grid", steps: true },
  french_press: { volume: "ratio", temp: "grid", steps: true },
  espresso: { volume: "ml", mlLabel: "ml extracción", showTime: true, temp: "param", steps: false },
  aeropress: { volume: "ml-with-ratio", mlLabel: "ml preparación", temp: "param", steps: true },
  cold_brew: { volume: "ml", mlLabel: "ml", temp: "none", steps: false },
  cold_drip: { volume: "ml", mlLabel: "ml agua", temp: "none", steps: false },
};

// Fila editable de paso: tiempo y agua como texto hasta validar al guardar.
type StepDraft = { at: string; water: string; note: string };

const numOrUndef = (s: unknown) => {
  const n = parseFloat(String(s));
  return Number.isFinite(n) ? n : undefined;
};

export function RecetaForm({ recetaId }: { recetaId?: string }) {
  const navigate = useNavigate();
  const editing = !!recetaId;
  const { data: methods = [] } = useMethods();
  const { data: row } = useRecetaRow(recetaId);
  const createReceta = useCreateReceta();
  const updateReceta = useUpdateReceta();
  const deleteReceta = useDeleteReceta();
  const setShares = useSetItemShares("receta");
  const { data: existingShares } = useItemShares("receta", recetaId);

  const [shareGroups, setShareGroups] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [methodId, setMethodId] = useState<string | null>(null);
  const [defDose, setDefDose] = useState("18");
  const [defRatio, setDefRatio] = useState("16.5");
  const [defMl, setDefMl] = useState("");
  const [defTemp, setDefTemp] = useState("93");
  const [defTime, setDefTime] = useState("");
  const [notes, setNotes] = useState("");
  // Parámetros específicos del método (clave → string|boolean).
  const [mparams, setMparams] = useState<Record<string, string | boolean>>({});
  // Pasos de la receta (editables). `at` se escribe como mm:ss / s / Xh.
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // Default de método en creación.
  useEffect(() => {
    if (!editing && methodId === null && methods.length) {
      setMethodId(methods.find((m) => m.key === "v60")?.id ?? methods[0].id);
    }
  }, [editing, methods, methodId]);

  // Prellenar en edición.
  useEffect(() => {
    if (!row) return;
    setName(row.name ?? "");
    setMethodId(row.method_id ?? null);
    setDefDose(row.default_dose_g != null ? String(row.default_dose_g) : "");
    setDefRatio(row.default_ratio != null ? String(row.default_ratio) : "");
    setDefMl(
      row.default_dose_g != null && row.default_ratio != null
        ? String(Math.round(Number(row.default_dose_g) * Number(row.default_ratio)))
        : ""
    );
    setDefTemp(row.default_temp_c != null ? String(row.default_temp_c) : "");
    setNotes(row.notes ?? "");
    const mp = { ...(row.method_params ?? {}) };
    delete mp.method;
    if (mp.shot_time_s != null) setDefTime(String(mp.shot_time_s));
    delete mp.shot_time_s;
    const norm: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries(mp)) norm[k] = typeof v === "boolean" ? v : String(v);
    setMparams(norm);
    const rowSteps = Array.isArray(row.steps) ? row.steps : [];
    setSteps(
      rowSteps.map((s: any) => ({
        at: typeof s.at === "number" ? fmtClock(s.at) : "",
        water: s.water_to != null ? String(s.water_to) : "",
        note: s.note ?? "",
      }))
    );
  }, [row]);

  useEffect(() => {
    if (existingShares) setShareGroups(existingShares);
  }, [existingShares]);

  const method = methods.find((m) => m.id === methodId);
  const methodKey = method?.key as MethodKey | undefined;
  const cfg = (methodKey && RECIPE_CFG[methodKey]) || RECIPE_CFG.v60;
  const fields = methodKey ? METHOD_FIELDS[methodKey] ?? [] : [];
  // Checks (bool) al final: el sort es estable, así que conserva el orden relativo.
  const orderedFields = [...fields].sort(
    (a, b) => (a.kind === "bool" ? 1 : 0) - (b.kind === "bool" ? 1 : 0)
  );

  const dose = parseFloat(defDose) || 0;
  const mlVal = parseFloat(defMl) || 0;
  const ratioVal = cfg.volume === "ratio" ? parseFloat(defRatio) || 0 : dose > 0 ? mlVal / dose : 0;
  // Agua total de referencia para escalar la plantilla de pasos.
  const refWater = cfg.volume === "ratio" ? dose * ratioVal : mlVal;

  const setParam = (k: string, v: string | boolean) => setMparams((p) => ({ ...p, [k]: v }));

  const addStep = () => setSteps((s) => [...s, { at: "", water: "", note: "" }]);
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, patch: Partial<StepDraft>) =>
    setSteps((s) => s.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  // Rellena los pasos con la receta de referencia del método como punto de partida.
  const loadTemplate = () => {
    if (!methodKey) return;
    setSteps(
      buildSteps(methodKey, refWater).map((s) => ({
        at: s.time,
        water: s.waterTo != null ? String(s.waterTo) : "",
        note: s.note,
      }))
    );
  };

  /** Drafts → pasos válidos: requieren tiempo; se ordenan por tiempo. */
  function buildStepsPayload() {
    return steps
      .map((s) => {
        const at = parseClock(s.at);
        if (at == null) return null;
        const water = numOrUndef(s.water);
        const note = s.note.trim();
        return { at, water_to: water ?? null, note: note || null };
      })
      .filter((s): s is { at: number; water_to: number | null; note: string | null } => s !== null)
      .sort((a, b) => a.at - b.at);
  }

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
    const key = method.key as MethodKey;
    const mp = buildMethodParams(key);
    if (key === "espresso") {
      const ts = numOrUndef(defTime);
      if (ts !== undefined) mp.shot_time_s = ts;
    }
    // ml → ratio (lo que persistimos); para "ratio" usamos el valor directo.
    const defRatioOut =
      cfg.volume === "ratio"
        ? numOrUndef(defRatio)
        : dose > 0 && mlVal > 0
          ? Math.round((mlVal / dose) * 100) / 100
          : undefined;

    const parsed = recetaSchema.safeParse({
      name: name.trim(),
      method_id: method.id,
      method_params: mp,
      steps: cfg.steps ? buildStepsPayload() : [],
      default_dose_g: numOrUndef(defDose),
      default_ratio: defRatioOut,
      default_temp_c: cfg.temp === "none" ? undefined : numOrUndef(defTemp),
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    try {
      const id = editing
        ? (await updateReceta.mutateAsync({ id: recetaId!, input: parsed.data }), recetaId!)
        : await createReceta.mutateAsync(parsed.data);
      await setShares.mutateAsync({ itemId: id, groupIds: shareGroups });
      navigate({ to: "/recetas" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar la receta.");
    }
  }

  async function handleDelete() {
    if (!recetaId) return;
    try {
      await deleteReceta.mutateAsync(recetaId);
      navigate({ to: "/recetas" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo borrar la receta.");
    }
  }

  const showParamsBox = fields.length > 0 || cfg.temp === "param";

  return (
    <AppShell title={editing ? "Editar receta" : "Nueva receta"}>
      <FormScaffold
        title={editing ? "Editar" : "Crear"}
        sub="Receta"
        onBack={() => navigate({ to: "/recetas" })}
        onSave={handleSave}
        saving={createReceta.isPending || updateReceta.isPending || setShares.isPending}
        saveLabel={editing ? "Guardar cambios" : "Guardar receta"}
        error={err}
        onDelete={editing ? handleDelete : undefined}
        deleting={deleteReceta.isPending}
      >
        {/* nombre — valor principal de la receta */}
        <Field label="Nombre" help="Ej. «V60 dulce», «Espresso clásico».">
          <TextInput value={name} onChange={setName} placeholder="V60 dulce" />
        </Field>

        {/* método */}
        <Field label="Método">
          <Pills
            value={methodId}
            onChange={(id) => id && setMethodId(id)}
            options={methods.map((m) => ({ value: m.id, label: m.name }))}
          />
        </Field>

        {/* objetivos por método */}
        {cfg.showTime ? (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Café" opt>
              <NumInput value={defDose} onChange={setDefDose} unit="g" />
            </Field>
            <Field label="Tiempo" opt>
              <NumInput value={defTime} onChange={setDefTime} unit="s" />
            </Field>
            <Field label={cfg.mlLabel ?? "ml"} opt>
              <NumInput value={defMl} onChange={setDefMl} unit="ml" />
            </Field>
          </div>
        ) : cfg.volume === "ratio" ? (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Café" opt>
              <NumInput value={defDose} onChange={setDefDose} unit="g" />
            </Field>
            <Field label="Ratio" opt help="1:N">
              <NumInput value={defRatio} onChange={setDefRatio} />
            </Field>
            <Field label="Temp" opt>
              <NumInput value={defTemp} onChange={setDefTemp} unit="°C" />
            </Field>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Café" opt>
                <NumInput value={defDose} onChange={setDefDose} unit="g" />
              </Field>
              <Field label={cfg.mlLabel ?? "ml"} opt>
                <NumInput value={defMl} onChange={setDefMl} unit="ml" />
              </Field>
            </div>
            {cfg.volume === "ml-with-ratio" && (
              <Card className="mb-4 flex items-center gap-3 bg-surface-2">
                <span className="tag">Ratio calculado</span>
                <span className="mono ml-auto text-[22px] font-medium text-accent">
                  1:{ratioVal ? ratioVal.toFixed(1).replace(/\.0$/, "") : "—"}
                </span>
              </Card>
            )}
          </>
        )}

        {/* parámetros específicos del método (+ temperatura para algunos métodos) */}
        {showParamsBox && (
          <div className="mb-4 rounded-lg border border-hairline bg-surface-2 p-3.5">
            <div className="tag mb-3">Parámetros · {method?.name}</div>
            <div className="grid grid-cols-2 gap-3.5">
              {cfg.temp === "param" && (
                <Field label="Temperatura" opt>
                  <NumInput value={defTemp} onChange={setDefTemp} unit="°C" />
                </Field>
              )}
              {orderedFields.map((f) => {
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

        {/* pasos de la receta — editables (tiempo · agua acumulada · instrucción) */}
        {cfg.steps && (
          <div className="mb-4 rounded-lg border border-hairline bg-surface-2 p-3.5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="tag">Pasos de la receta</span>
              {methodKey && (
                <button
                  type="button"
                  onClick={loadTemplate}
                  className="mono text-[10px] uppercase tracking-[0.1em] text-accent hover:underline"
                >
                  Cargar plantilla {method?.name}
                </button>
              )}
            </div>

            {steps.length === 0 ? (
              <p className="mb-3 text-[13px] leading-snug text-muted">
                Sin pasos. Añade tu secuencia (p. ej. 0:00 → 40 g bloom, 0:45 → 180 g…) o carga una plantilla.
              </p>
            ) : (
              <div className="mb-3 flex flex-col gap-2">
                {/* cabeceras */}
                <div className="mono flex items-center gap-2 px-0.5 text-[9px] uppercase tracking-[0.1em] text-faint">
                  <span className="w-16 flex-none">Tiempo</span>
                  <span className="w-20 flex-none">Agua (g)</span>
                  <span className="flex-1">Instrucción</span>
                  <span className="w-7 flex-none" />
                </div>
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={s.at}
                      onChange={(e) => updateStep(i, { at: e.target.value })}
                      placeholder="0:45"
                      inputMode="numeric"
                      className="field mono w-16 flex-none px-2 py-2 text-center text-[13px]"
                    />
                    <input
                      value={s.water}
                      onChange={(e) => updateStep(i, { water: e.target.value })}
                      placeholder="180"
                      inputMode="decimal"
                      className="field mono w-20 flex-none px-2 py-2 text-center text-[13px]"
                    />
                    <input
                      value={s.note}
                      onChange={(e) => updateStep(i, { note: e.target.value })}
                      placeholder="Bloom, 2.º vertido, prensar…"
                      className="field flex-1 px-3 py-2 text-[13px]"
                      style={{ fontFamily: "var(--font-display)" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      aria-label="Quitar paso"
                      className="grid h-9 w-7 flex-none place-items-center rounded-md text-faint transition-colors hover:text-warn"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addStep}
              className="mono flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-hairline-strong py-2.5 text-[11px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:bg-chip"
            >
              <Plus size={15} /> Añadir paso
            </button>
          </div>
        )}

        <Field label="Notas" opt help="Detalles de la receta (no de una cata concreta).">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Objetivo de taza, trucos, ajustes recomendados…"
            className="field resize-none leading-relaxed"
            style={{ fontFamily: "var(--font-display)" }}
          />
        </Field>

        <ShareGroupsField value={shareGroups} onChange={setShareGroups} />
      </FormScaffold>
    </AppShell>
  );
}
