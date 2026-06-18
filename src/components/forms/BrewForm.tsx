import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, MethodBadge } from "@/components/ui";
import { Field, NumInput, Pills, FormScaffold } from "@/components/form";
import { StepsReadout } from "@/components/StepsReadout";
import { useBeans } from "@/data/beans";
import { useGrinders } from "@/data/grinders";
import { useRecetaRow } from "@/data/recetas";
import { useBrewRow, useCreateBrew, useUpdateBrew, useDeleteBrew } from "@/data/brews";
import { brewSchema } from "@/domain/brew.schema";
import { scaleSteps } from "@/domain/view";
import type { BrewStep } from "@/domain/receta.schema";

/** Valores opcionales para pre-sembrar el form (p. ej. al «Repetir»). */
export type BrewFormInitial = {
  recetaId?: string;
  beanId?: string;
  grinderId?: string;
  dose?: string;
};

export function BrewForm({ brewId, initial }: { brewId?: string; initial?: BrewFormInitial }) {
  const navigate = useNavigate();
  const editing = !!brewId;
  const { data: beans = [] } = useBeans();
  const { data: grinders = [] } = useGrinders();
  const { data: row } = useBrewRow(brewId);

  const [recetaId, setRecetaId] = useState<string | null>(initial?.recetaId ?? null);
  const { data: recetaRow } = useRecetaRow(recetaId ?? undefined);

  const createBrew = useCreateBrew();
  const updateBrew = useUpdateBrew();
  const deleteBrew = useDeleteBrew();

  const [beanId, setBeanId] = useState<string | null>(initial?.beanId ?? null);
  const [grinderId, setGrinderId] = useState<string | null>(initial?.grinderId ?? null);
  const [dose, setDose] = useState(initial?.dose ?? "");
  const [water, setWater] = useState("");
  const [temp, setTemp] = useState("");
  const [time, setTime] = useState("");
  const [grind, setGrind] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // Defaults una vez cargan catálogos (solo en creación).
  useEffect(() => {
    if (!editing && beanId === null && beans.length) setBeanId(beans[0].id);
  }, [editing, beans, beanId]);
  useEffect(() => {
    if (!editing && grinderId === null && grinders.length) setGrinderId(grinders[0].id);
  }, [editing, grinders, grinderId]);
  // Recipe-first: la extracción nace desde una receta. Sin receta → elegir una.
  useEffect(() => {
    if (!editing && !recetaId) navigate({ to: "/recetas" });
  }, [editing, recetaId, navigate]);

  // Prellenar en edición.
  useEffect(() => {
    if (!row) return;
    setRecetaId(row.receta_id ?? null);
    setBeanId(row.bean_id ?? null);
    setGrinderId(row.grinder_id ?? null);
    setDose(row.dose_g != null ? String(row.dose_g) : "");
    setWater(row.yield_g != null ? String(row.yield_g) : "");
    setTemp(row.water_temp_c != null ? String(row.water_temp_c) : "");
    setTime(row.total_time_s != null ? String(row.total_time_s) : "");
    setGrind(row.grind_setting ?? "");
    setRating(row.rating ?? null);
    setNotes(row.notes ?? "");
  }, [row]);

  // Al elegir receta, prerellena dosis/temp/agua desde sus defaults (solo si vacíos).
  useEffect(() => {
    if (!recetaRow) return;
    setDose((d) => (d ? d : recetaRow.default_dose_g != null ? String(recetaRow.default_dose_g) : d));
    setTemp((t) => (t ? t : recetaRow.default_temp_c != null ? String(recetaRow.default_temp_c) : t));
    setWater((w) => {
      if (w) return w;
      if (recetaRow.default_dose_g != null && recetaRow.default_ratio != null) {
        return String(Math.round(recetaRow.default_dose_g * recetaRow.default_ratio));
      }
      return w;
    });
  }, [recetaRow]);

  const grinder = grinders.find((g) => g.id === grinderId);
  const grindUnit = grinder?.unit_label || "μm";

  const d = parseFloat(dose) || 0;
  const w = parseFloat(water) || 0;
  const t = parseFloat(temp) || 0;
  const ratio = d > 0 ? w / d : 0;
  const tempErr = t && (t < 80 || t > 100) ? "Fuera de rango habitual (80–100 °C)" : null;

  // Pasos de la receta, reescalados al agua real de esta extracción (modo lectura).
  const recetaSteps: BrewStep[] = Array.isArray(recetaRow?.steps) ? recetaRow!.steps : [];
  const recetaWater =
    recetaRow?.default_dose_g && recetaRow?.default_ratio
      ? recetaRow.default_dose_g * recetaRow.default_ratio
      : 0;
  const previewSteps = scaleSteps(recetaSteps, recetaWater, w);

  async function handleSave() {
    setErr(null);
    if (!recetaRow?.method_id) {
      setErr("Selecciona una receta.");
      return;
    }
    const parsed = brewSchema.safeParse({
      receta_id: recetaRow.id,
      method_id: recetaRow.method_id,
      bean_id: beanId,
      grinder_id: grinderId,
      grind_setting: grind.trim() || undefined,
      dose_g: d || undefined,
      yield_g: w || undefined,
      water_temp_c: t || undefined,
      total_time_s: time.trim() ? Math.round(parseFloat(time)) : undefined,
      rating: rating ?? undefined,
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
        {/* receta — base de la extracción (fija método y pasos), elegida antes de llegar aquí */}
        {recetaRow && (
          <Card className="mb-4 flex items-center gap-3 bg-surface-2">
            <MethodBadge method={recetaRow.method?.name ?? "—"} />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">{recetaRow.name}</span>
          </Card>
        )}

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

        {/* pasos de la receta — solo lectura, escalados a la dosis */}
        {previewSteps.length > 0 && (
          <div className="mb-4 rounded-lg border border-hairline bg-surface-2 p-3.5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="tag">Pasos de la receta</span>
              {recetaId && (
                <Link
                  to="/recetas/$recetaId/edit"
                  params={{ recetaId }}
                  className="mono text-[10px] uppercase tracking-[0.1em] text-accent hover:underline"
                >
                  Editar receta
                </Link>
              )}
            </div>
            <StepsReadout steps={previewSteps} />
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
