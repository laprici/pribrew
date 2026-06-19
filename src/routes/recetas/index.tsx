import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search, ListChecks, History } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, MethodBadge, ScreenHeader } from "@/components/ui";
import { Author } from "@/components/Author";
import { useRecetas } from "@/data/recetas";
import { useRecetaCounts } from "@/data/brews";

export const Route = createFileRoute("/recetas/")({
  component: RecetasPage,
});

function RecetasPage() {
  const { data: recetas = [], isLoading } = useRecetas();
  const { data: counts = {} } = useRecetaCounts();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  // El nombre es el valor principal: filtramos por él (también por método).
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return recetas;
    return recetas.filter(
      (r) => r.name.toLowerCase().includes(term) || r.method.toLowerCase().includes(term)
    );
  }, [recetas, q]);

  return (
    <AppShell title="Recetas">
      <div className="mx-auto max-w-2xl">
        <ScreenHeader
          sub="Plantillas"
          title="Recetas"
          right={
            <Link to="/recetas/new" className="btn-primary">
              <Plus size={17} /> Nueva
            </Link>
          }
        />

        {/* búsqueda por nombre */}
        <div className="mb-3.5 flex items-center gap-2 rounded-md border border-hairline-strong bg-surface-2 px-3">
          <Search size={16} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar receta…"
            className="min-w-0 flex-1 border-none bg-transparent py-3 text-[14px] text-ink outline-none placeholder:text-faint"
          />
        </div>

        {isLoading ? (
          <Card className="text-center text-sm text-muted">Cargando…</Card>
        ) : recetas.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            Aún no hay recetas. Crea una plantilla para empezar a registrar extracciones.
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="text-center text-sm text-muted">Sin recetas que coincidan.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((r) => {
              const count = counts[r.id] ?? 0;
              return (
                <Card
                  key={r.id}
                  onClick={() => navigate({ to: "/recetas/$recetaId", params: { recetaId: r.id } })}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center gap-2">
                        <MethodBadge method={r.method} />
                        {r.stepCount > 0 && (
                          <span className="mono inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-faint">
                            <ListChecks size={12} /> {r.stepCount} pasos
                          </span>
                        )}
                        <Author ownerId={r.ownerId} hideMine />
                      </div>
                      <div className="truncate text-[18px] font-semibold tracking-[-0.02em]">
                        {r.name}
                      </div>
                      {(r.defaultDose != null || r.defaultRatio != null || r.defaultTemp != null) && (
                        <div className="tag mt-1 text-muted">
                          {[
                            r.defaultDose != null ? `${r.defaultDose} g` : null,
                            r.defaultRatio != null ? `1:${r.defaultRatio}` : null,
                            r.defaultTemp != null ? `${r.defaultTemp}°C` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* acceso a las extracciones de esta receta (filtrables) */}
                  <div className="mt-3 flex items-center gap-3 border-t border-hairline pt-3">
                    <span className="tag text-muted">
                      {count > 0
                        ? `${count} ${count === 1 ? "extracción" : "extracciones"}`
                        : "Sin extracciones aún"}
                    </span>
                    {count > 0 && (
                      <Link
                        to="/brews"
                        search={{ receta: r.id }}
                        onClick={(e) => e.stopPropagation()}
                        className="btn-ghost ml-auto !px-3 !py-1.5 text-[12px]"
                      >
                        <History size={14} /> Ver extracciones
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
