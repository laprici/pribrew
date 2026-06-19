import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Coffee, Pencil, History } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, MethodBadge, Readout } from "@/components/ui";
import { StepsReadout } from "@/components/StepsReadout";
import { useRecetaRow } from "@/data/recetas";
import { toRecetaVM } from "@/domain/view";
import { METHOD_FIELDS } from "@/domain/methodFields";
import { fmtClock } from "@/domain/methodSteps";
import type { MethodKey } from "@/domain/method";

export const Route = createFileRoute("/recetas/$recetaId/")({
  component: RecetaDetail,
});

/** method_params → pares {label, valor} legibles, según los campos del método. */
function readParams(methodKey: string, params: Record<string, any> | null | undefined) {
  if (!params) return [];
  const fields = METHOD_FIELDS[methodKey as MethodKey] ?? [];
  const out: { label: string; value: string }[] = [];
  // Espresso guarda el tiempo de extracción dentro de method_params (no en METHOD_FIELDS).
  if (params.shot_time_s != null) out.push({ label: "Tiempo", value: `${params.shot_time_s} s` });
  for (const f of fields) {
    const raw = params[f.key];
    if (raw == null || raw === "" || raw === false) continue;
    if (f.kind === "bool") {
      out.push({ label: f.label, value: "Sí" });
    } else if (f.kind === "enum") {
      const opt = f.options.find((o) => o.value === raw);
      out.push({ label: f.label, value: opt?.label ?? String(raw) });
    } else {
      out.push({ label: f.label, value: f.unit ? `${raw} ${f.unit}` : String(raw) });
    }
  }
  return out;
}

function RecetaDetail() {
  const navigate = useNavigate();
  const { recetaId } = Route.useParams();
  const { data: row, isLoading } = useRecetaRow(recetaId);

  if (isLoading) {
    return (
      <AppShell title="Receta">
        <div className="mx-auto max-w-xl">
          <Card className="text-center text-sm text-muted">Cargando…</Card>
        </div>
      </AppShell>
    );
  }

  if (!row) {
    return (
      <AppShell title="Receta">
        <div className="mx-auto max-w-xl">
          <Card className="text-center text-sm text-muted">No se encontró esta receta.</Card>
        </div>
      </AppShell>
    );
  }

  const vm = toRecetaVM(row);
  const params = readParams(vm.methodKey, row.method_params);
  const steps = Array.isArray(row.steps) ? row.steps : [];

  return (
    <AppShell title="Receta">
      <div className="mx-auto max-w-xl">
        <div className="flex items-start gap-3 pb-4">
          <button
            onClick={() => navigate({ to: "/recetas" })}
            aria-label="Atrás"
            className="grid h-10 w-10 flex-none place-items-center rounded-md border border-hairline text-ink transition-colors hover:bg-chip"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="tag mb-1">Receta</div>
            <h1 className="truncate text-xl font-semibold leading-tight tracking-[-0.02em]">
              {vm.name}
            </h1>
          </div>
        </div>

        {/* hero — método + objetivos */}
        <Card className="relative mb-3.5 overflow-hidden bg-surface-2">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(120% 90% at 85% 0%, var(--glow), transparent 60%)" }}
          />
          <div className="relative mb-3.5">
            <MethodBadge method={vm.method} />
          </div>
          <div className="relative flex items-end gap-4">
            <Readout
              k="Ratio"
              v={vm.defaultRatio != null ? `1:${vm.defaultRatio}` : "—"}
              big
              accent
            />
            <div className="flex-1" />
            {vm.defaultDose != null && <Readout k="Dosis" v={vm.defaultDose} unit="g" />}
            {vm.defaultTemp != null && <Readout k="Temp" v={vm.defaultTemp} unit="°C" />}
          </div>
        </Card>

        {/* parámetros del método */}
        {params.length > 0 && (
          <Card className="mb-3.5">
            <div className="tag mb-3">Parámetros · {vm.method}</div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {params.map((p) => (
                <Readout key={p.label} k={p.label} v={p.value} />
              ))}
            </div>
          </Card>
        )}

        {/* pasos de la receta */}
        {steps.length > 0 && (
          <Card className="mb-3.5">
            <div className="tag mb-3">Pasos de la receta</div>
            <StepsReadout steps={steps} />
          </Card>
        )}

        {/* notas */}
        {vm.notes && (
          <Card className="mb-3.5">
            <div className="tag mb-2.5">Notas</div>
            <p className="m-0 text-[14.5px] leading-relaxed text-ink-soft">{vm.notes}</p>
          </Card>
        )}

        {/* extracciones de esta receta (con filtros por fecha, grano, moledor…) */}
        <Link
          to="/brews"
          search={{ receta: recetaId }}
          className="card mb-3.5 flex items-center gap-3 transition-colors hover:border-hairline-strong"
        >
          <span className="grid h-9 w-9 flex-none place-items-center rounded-md border border-hairline text-ink-soft">
            <History size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium tracking-[-0.01em]">Ver extracciones</div>
          </div>
          <span className="text-muted">→</span>
        </Link>

        <div className="flex gap-2.5">
          <Link to="/brews/new" search={{ receta: recetaId }} className="btn-primary flex-1">
            <Coffee size={17} /> Preparar
          </Link>
          <Link
            to="/recetas/$recetaId/edit"
            params={{ recetaId }}
            className="btn-ghost flex-1 justify-center"
          >
            <Pencil size={16} /> Editar
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
