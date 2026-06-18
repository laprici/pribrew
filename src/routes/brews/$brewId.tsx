import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Flame, Repeat, Pencil, Thermometer, Clock, Settings2 } from "lucide-react";
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
import { useBrew } from "@/data/brews";
import { daysSince } from "@/domain/view";
import { StepsReadout } from "@/components/StepsReadout";

export const Route = createFileRoute("/brews/$brewId")({
  component: DetailPage,
});

function ParamCell({
  icon: Icon,
  k,
  v,
  unit,
  tone,
  border,
}: {
  icon: typeof Thermometer;
  k: string;
  v: string;
  unit?: string;
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
  const { data: brew, isLoading } = useBrew(brewId);

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
  const days = bean ? daysSince(bean.roastDate) : 0;

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
            <div className="tag mb-1">{fmtDate(brew.date)}</div>
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
            <Readout k="Ratio de extracción" v={fmtRatio(brew.dose, brew.water)} big accent />
            <div className="flex-1" />
            <Readout k="Dosis" v={brew.dose.toFixed(1)} unit="g" />
            <Readout k="Agua" v={brew.water} unit="g" />
          </div>
        </Card>

        {/* parámetros */}
        <Card pad={false} className="mb-3.5">
          <div className="grid grid-cols-3">
            <ParamCell icon={Thermometer} k="Temperatura" v={String(brew.temp)} unit="°C" tone={tempOk ? null : "warn"} />
            <ParamCell icon={Clock} k="Tiempo" v={fmtTime(brew.timeSec)} border />
            <ParamCell icon={Settings2} k="Molienda" v={brew.grind} border />
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
          <button
            onClick={() => navigate({ to: "/brews/$brewId/edit", params: { brewId } })}
            className="btn-ghost flex-1"
          >
            <Pencil size={16} /> Editar
          </button>
        </div>
      </div>
    </AppShell>
  );
}
