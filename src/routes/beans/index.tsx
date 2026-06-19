import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, NoteChip, Readout, ScreenHeader, freshnessLabel, freshnessTone } from "@/components/ui";
import { useBeans } from "@/data/beans";
import { daysSince, type BeanVM } from "@/domain/view";

export const Route = createFileRoute("/beans/")({
  component: BeansPage,
});

function BeanCard({ bean: b, onClick }: { bean: BeanVM; onClick: () => void }) {
  const days = daysSince(b.roastDate);
  const tone = freshnessTone(days);
  const barColor =
    tone === "warn" ? "var(--warn)" : tone === "signal" ? "var(--signal)" : "var(--accent)";
  const labelColor =
    tone === "warn" ? "text-warn" : tone === "signal" ? "text-signal" : "text-muted";
  return (
    <Card onClick={onClick} className={`flex flex-col gap-3.5 ${b.finished ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-3.5">
        <div className="h-[42px] w-[42px] flex-none rounded-md" style={{ background: b.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-[17px] font-semibold tracking-[-0.02em]">
              {b.origin} · {b.variety}
            </div>
            {b.finished && (
              <span className="mono flex-none rounded-pill border border-hairline bg-chip px-2 py-[3px] text-[9px] uppercase tracking-[0.12em] text-muted">
                Acabado
              </span>
            )}
          </div>
          <div className="tag mt-1">
            {b.country} · {b.process}
          </div>
        </div>
        <Readout k="Post-tueste" v={days} unit="d" tone={tone} />
      </div>

      <div>
        <div className="h-1.5 overflow-hidden rounded bg-chip">
          <div
            className="h-full rounded transition-[width] duration-500 ease-ease"
            style={{ width: `${Math.max(6, 100 - days * 3)}%`, background: barColor }}
          />
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className={`tag text-[9px] ${labelColor}`}>{freshnessLabel(days)}</span>
          <span className="tag text-[9px]">
            {b.roast} · {b.stock} g
          </span>
        </div>
      </div>

      {b.notes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {b.notes.map((n) => (
            <NoteChip key={n}>{n}</NoteChip>
          ))}
        </div>
      )}
    </Card>
  );
}

function BeansPage() {
  const { data: beans = [], isLoading } = useBeans({ includeFinished: true });
  const navigate = useNavigate();

  const available = beans.filter((b) => !b.finished);
  const finished = beans.filter((b) => b.finished);
  const open = (id: string) => navigate({ to: "/beans/$beanId/edit", params: { beanId: id } });

  return (
    <AppShell title="Granos">
      <div className="mx-auto max-w-2xl">
        <ScreenHeader
          sub="Inventario"
          title="Granos"
          right={
            <Link to="/beans/new" className="btn-primary">
              <Plus size={17} /> Agregar
            </Link>
          }
        />

        {/* acceso a moledores (también en inventario) */}
        <Link
          to="/grinders"
          className="mb-3 flex items-center gap-2 text-[12px] font-medium text-ink-soft transition-colors hover:text-accent"
        >
          <SlidersHorizontal size={14} /> Ver moledores →
        </Link>

        {isLoading ? (
          <Card className="text-center text-sm text-muted">Cargando…</Card>
        ) : beans.length === 0 ? (
          <Card className="text-center text-sm text-muted">Aún no hay granos en el inventario.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {available.map((b) => (
              <BeanCard key={b.id} bean={b} onClick={() => open(b.id)} />
            ))}
            {available.length === 0 && (
              <Card className="text-center text-sm text-muted">
                No hay granos disponibles. Marca uno como disponible o agrega otro.
              </Card>
            )}

            {finished.length > 0 && (
              <>
                <div className="tag mt-2 px-1 text-faint">Acabados</div>
                {finished.map((b) => (
                  <BeanCard key={b.id} bean={b} onClick={() => open(b.id)} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
