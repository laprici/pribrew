import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search, ListChecks, History, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, MethodBadge, ScreenHeader } from "@/components/ui";
import { Pills, Select } from "@/components/form";
import { Author } from "@/components/Author";
import { ShareBadge } from "@/components/ShareGroups";
import { useAuth } from "@/lib/auth";
import { useRecetas } from "@/data/recetas";
import { useRecetaCounts } from "@/data/brews";
import { useProfiles } from "@/data/profiles";

export const Route = createFileRoute("/recetas/")({
  component: RecetasPage,
});

type ShareFilter = "privado" | "compartido";

/** Etiqueta encima de cada control de filtro (mismo patrón que el historial). */
function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="tag text-[10px] text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function RecetasPage() {
  const { data: recetas = [], isLoading } = useRecetas();
  const { data: counts = {} } = useRecetaCounts();
  const { data: profiles } = useProfiles();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [share, setShare] = useState<ShareFilter | null>(null);
  const [method, setMethod] = useState("");
  const [author, setAuthor] = useState("");
  const uid = session?.user.id;

  // Una receta es "compartida" si la veo por compartición: ajena, o propia
  // publicada en algún grupo. "Privada" = propia y sin grupos.
  const isShared = (r: (typeof recetas)[number]) =>
    r.ownerId !== uid || r.sharedGroupIds.length > 0;

  // Métodos presentes en las recetas (evita opciones que no filtran nada).
  const methodOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of recetas) seen.set(r.methodKey, r.method);
    return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [recetas]);

  // Autores presentes: yo primero ("Tú"), luego el resto del grupo por nombre.
  const authorOptions = useMemo(() => {
    const ids = new Set(recetas.map((r) => r.ownerId));
    const opts = [...ids]
      .filter((id) => id !== uid)
      .map((id) => ({ value: id, label: profiles?.get(id) ?? "Miembro" }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (uid && ids.has(uid)) opts.unshift({ value: uid, label: "Tú" });
    return opts;
  }, [recetas, profiles, uid]);

  // El nombre es el valor principal; el resto son filtros combinables (AND).
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return recetas.filter((r) => {
      if (term && !(r.name.toLowerCase().includes(term) || r.method.toLowerCase().includes(term)))
        return false;
      if (method && r.methodKey !== method) return false;
      if (author && r.ownerId !== author) return false;
      if (share === "privado" && isShared(r)) return false;
      if (share === "compartido" && !isShared(r)) return false;
      return true;
    });
  }, [recetas, q, method, author, share, uid]);

  const hasFilters = !!(q.trim() || share || method || author);
  const clearFilters = () => {
    setQ("");
    setShare(null);
    setMethod("");
    setAuthor("");
  };

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
        <div className="mb-2.5 flex items-center gap-2 rounded-md border border-hairline-strong bg-surface-2 px-3">
          <Search size={16} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar receta…"
            className="min-w-0 flex-1 border-none bg-transparent py-3 text-[14px] text-ink outline-none placeholder:text-faint"
          />
        </div>

        {/* filtros: visibilidad, método y autor */}
        {recetas.length > 0 && (
          <div className="mb-3.5 flex flex-col gap-2.5">
            <FilterField label="Visibilidad">
              <Pills
                allowNull
                value={share}
                onChange={setShare}
                options={[
                  { value: "privado", label: "Privado" },
                  { value: "compartido", label: "Compartido" },
                ]}
              />
            </FilterField>
            <div className={`grid gap-2 ${authorOptions.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              <FilterField label="Método">
                <Select
                  value={method}
                  onChange={setMethod}
                  placeholder="Todos"
                  options={methodOptions}
                />
              </FilterField>
              {authorOptions.length > 1 && (
                <FilterField label="Autor">
                  <Select
                    value={author}
                    onChange={setAuthor}
                    placeholder="Todos"
                    options={authorOptions}
                  />
                </FilterField>
              )}
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mono inline-flex items-center gap-1 self-start text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-accent"
              >
                <X size={13} /> Limpiar filtros
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <Card className="text-center text-sm text-muted">Cargando…</Card>
        ) : recetas.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            Aún no hay recetas. Crea una plantilla para empezar a registrar extracciones.
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            Sin recetas que coincidan con los filtros.
          </Card>
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
                        {r.ownerId === uid && <ShareBadge count={r.sharedGroupIds.length} />}
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
