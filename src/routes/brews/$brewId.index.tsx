import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Flame, Repeat, Pencil, Thermometer, Clock, Settings2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  MethodBadge,
  NoteChip,
  Readout,
  ScoreRing,
  fmtRatio,
  fmtTime,
  fmtDate,
  freshnessTone,
  ratioVal,
  type Tone,
} from "@/components/ui";
import { useBrew, useDeleteBrew } from "@/data/brews";
import { daysOffRoast } from "@/domain/calc";
import { StepsReadout } from "@/components/StepsReadout";
import { Author } from "@/components/Author";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/brews/$brewId/")({
  component: DetailPage,
});

function ParamCell({
  icon: Icon,
  k,
  v,
  unit,
  sub,
  tone,
  border,
}: {
  icon: typeof Thermometer;
  k: string;
  v: string;
  unit?: string;
  sub?: string;
  tone?: Tone;
  border?: boolean;
}) {
  return (
    <div className={`px-3.5 py-4 ${border ? "border-l border-hairline" : ""}`}>
      <div className="mb-2 flex items-center gap-1.5 text-muted">
        <Icon size={15} />
        <span className="tag text-[9px]">{k}</span>
      </div>
      <div className={`mono text-xl font-medium ${tone === "warn" ? "text-warn" : "text-ink"}`}>
        {v}
        {unit && <span className="ml-0.5 text-[0.55em] text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-1 truncate text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function TargetRow({
  label,
  range,
  ok,
  border,
}: {
  label: string;
  range: string;
  ok: boolean;
  border?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3.5 py-3 ${border ? "border-l border-hairline" : ""}`}>
      <span
        className="h-[7px] w-[7px] flex-none rounded-full"
        style={{ background: ok ? "var(--signal)" : "var(--warn)" }}
      />
      <span className="tag flex-1 text-[9px]">{label}</span>
      <span className="mono text-xs text-muted">{range}</span>
    </div>
  );
}

function DetailPage() {
  const navigate = useNavigate();
  const { brewId } = Route.useParams();
  const { session } = useAuth();
  const { data: brew, isLoading } = useBrew(brewId);
  const deleteBrew = useDeleteBrew();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  async function handleDelete() {
    setDelErr(null);
    try {
      await deleteBrew.mutateAsync(brewId);
      navigate({ to: "/brews" });
    } catch (e) {
      setDelErr(e instanceof Error ? e.message : "No se pudo borrar la extracción.");
    }
  }

  if (isLoading) {
    return (
      <AppShell title="Extracción">
        <div className="mx-auto max-w-xl">
          <Card className="text-center text-sm text-muted">Cargando…</Card>
        </div>
      </AppShell>
    );
  }

  if (!brew) {
    return (
      <AppShell title="Extracción">
        <div className="mx-auto max-w-xl">
          <Card className="text-center text-sm text-muted">No se encontró esta extracción.</Card>
        </div>
      </AppShell>
    );
  }

  const bean = brew.bean;
  const r = ratioVal(brew.dose, brew.water);
  const tgt = brew.target;
  const ratioOk = r >= tgt.ratioLow && r <= tgt.ratioHigh;
  const tempOk = brew.temp >= tgt.tempLow && brew.temp <= tgt.tempHigh;
  // Frescura al momento de la extracción (no a hoy): tueste → fecha de extracción.
  const days = bean ? daysOffRoast(bean.roastDate, brew.date) ?? 0 : 0;
  const isMine = !!session && brew.ownerId === session.user.id;
  // En espresso usamos los términos café/extracción (coherentes con la receta).
  const isEspresso = brew.methodKey === "espresso";

  return (
    <AppShell title="Extracción">
      <div className="mx-auto max-w-xl">
        <div className="flex items-start gap-3 pb-4">
          <button
            onClick={() => navigate({ to: "/brews" })}
            aria-label="Atrás"
            className="grid h-10 w-10 flex-none place-items-center rounded-md border border-hairline text-ink transition-colors hover:bg-chip"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="tag">{fmtDate(brew.date)}</span>
              <Author ownerId={brew.ownerId} />
            </div>
            <h1 className="truncate text-xl font-semibold leading-tight tracking-[-0.02em]">
              {bean ? `${bean.origin} · ${bean.variety}` : "Sin grano"}
            </h1>
          </div>
          <ScoreRing score={brew.score} size={52} />
        </div>

        {/* hero ratio */}
        <Card className="relative mb-3.5 overflow-hidden bg-surface-2">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(120% 90% at 85% 0%, var(--glow), transparent 60%)" }}
          />
          <div className="relative mb-3.5 flex flex-wrap items-center gap-2.5">
            <MethodBadge method={brew.method} />
            {brew.recetaName && (
              <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink">
                {brew.recetaName}
              </span>
            )}
            <span
              className="tag ml-auto inline-flex items-center gap-1"
              style={{ color: ratioOk ? "var(--signal)" : "var(--warn)" }}
            >
              {ratioOk ? <Check size={12} /> : <Flame size={12} />} {brew.verdict}
            </span>
          </div>
          <div className="relative flex items-end gap-4">
            <Readout k="Ratio" v={fmtRatio(brew.dose, brew.water)} big accent />
            <div className="flex-1" />
            <Readout k="Café" v={brew.dose.toFixed(1)} unit="g" />
            <Readout k={isEspresso ? "Extracción" : "Agua"} v={brew.water} unit="g" />
          </div>
        </Card>

        {/* parámetros */}
        <Card pad={false} className="mb-3.5">
          <div className="grid grid-cols-3">
            <ParamCell icon={Thermometer} k="Temperatura" v={String(brew.temp)} unit="°C" tone={tempOk ? null : "warn"} />
            <ParamCell icon={Clock} k="Tiempo" v={fmtTime(brew.timeSec)} border />
            <ParamCell
              icon={Settings2}
              k="Molienda"
              v={brew.grind}
              sub={brew.grinder ?? "Sin moledor"}
              border
            />
          </div>
          <div className="grid grid-cols-2 border-t border-hairline">
            <TargetRow label="Ratio objetivo" range={`1:${tgt.ratioLow}–${tgt.ratioHigh}`} ok={ratioOk} />
            <TargetRow label="Temp objetivo" range={`${tgt.tempLow}–${tgt.tempHigh}°`} ok={tempOk} border />
          </div>
        </Card>

        {/* cata */}
        <Card className="mb-3.5">
          <div className="tag mb-2.5">Cata</div>
          {bean && bean.notes.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {bean.notes.map((n) => (
                <NoteChip key={n}>{n}</NoteChip>
              ))}
            </div>
          )}
          <p className="m-0 text-[14.5px] leading-relaxed text-ink-soft">
            {brew.notes || "Sin notas de cata."}
          </p>
        </Card>

        {/* pasos de la receta */}
        {brew.steps.length > 0 && (
          <Card className="mb-3.5">
            <div className="tag mb-3">Pasos de la receta</div>
            <StepsReadout steps={brew.steps} />
          </Card>
        )}

        {/* grano */}
        {bean && (
          <Card className="mb-4 flex items-center gap-3.5">
            <div className="h-[38px] w-[38px] flex-none rounded-md opacity-85" style={{ background: bean.color }} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">
                {bean.process} · {bean.roast}
              </div>
              <div className="tag mt-1">{bean.country}</div>
            </div>
            <Readout k="Post-tueste" v={days} unit="d" tone={freshnessTone(days)} />
          </Card>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={() =>
              navigate({
                to: "/brews/new",
                search: {
                  receta: brew.recetaId ?? undefined,
                  bean: brew.bean?.id,
                  dose: brew.dose ? String(brew.dose) : undefined,
                },
              })
            }
            className="btn-primary flex-1"
          >
            <Repeat size={17} /> Repetir
          </button>
          {isMine && (
            <button
              onClick={() => navigate({ to: "/brews/$brewId/edit", params: { brewId } })}
              className="btn-ghost flex-1"
            >
              <Pencil size={16} /> Editar
            </button>
          )}
        </div>

        {/* eliminar — con confirmación en dos pasos (solo el dueño) */}
        {isMine && (
        <div className="mt-2.5">
          {confirmDelete ? (
            <div className="flex items-center gap-2.5">
              <span className="flex-1 text-[13px] text-muted">¿Eliminar esta extracción?</span>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleteBrew.isPending}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteBrew.isPending}
                className="btn-ghost text-warn disabled:opacity-60"
              >
                <Trash2 size={16} /> {deleteBrew.isPending ? "Borrando…" : "Eliminar"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost w-full justify-center text-warn"
            >
              <Trash2 size={16} /> Eliminar extracción
            </button>
          )}
          {delErr && <div className="mono mt-2 text-[12px] text-warn">{delErr}</div>}
        </div>
        )}
      </div>
    </AppShell>
  );
}
