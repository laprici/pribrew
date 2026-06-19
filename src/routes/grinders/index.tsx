import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Bean as BeanIcon, Search, X, Copy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, ScreenHeader } from "@/components/ui";
import { Pills, Select } from "@/components/form";
import { Author } from "@/components/Author";
import { ShareBadge } from "@/components/ShareGroups";
import { useAuth } from "@/lib/auth";
import { useGrinders, useCloneGrinder, type GrinderRow } from "@/data/grinders";
import { useProfiles } from "@/data/profiles";
import { isActiveInventory } from "@/domain/view";

export const Route = createFileRoute("/grinders/")({
  component: GrindersPage,
});

type ShareFilter = "privado" | "compartido";
type TypeFilter = "manual" | "electric";

/** Etiqueta encima de cada control de filtro (mismo patrón que recetas/granos). */
function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="tag text-[10px] text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function GrinderCard({
  g,
  onClick,
  mine,
  readOnly,
  onAdopt,
  adopting,
}: {
  g: GrinderRow;
  onClick?: () => void;
  mine: boolean;
  readOnly?: boolean;
  onAdopt?: () => void;
  adopting?: boolean;
}) {
  const range =
    g.min_setting != null && g.max_setting != null
      ? `${g.min_setting}–${g.max_setting}${g.unit_label ? " " + g.unit_label : ""}`
      : g.unit_label || "—";
  return (
    <Card onClick={readOnly ? undefined : onClick} className={`flex flex-col gap-3.5 ${readOnly ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-[17px] font-semibold tracking-[-0.02em]">{g.name}</div>
            {mine ? <ShareBadge count={g.sharedGroupIds.length} /> : <Author ownerId={g.ownerId} />}
          </div>
          <div className="tag mt-1">
            {g.type === "manual" ? "Manual" : "Eléctrico"}
            {g.brand ? ` · ${g.brand}` : ""}
            {g.model ? ` ${g.model}` : ""}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="tag text-[9px]">{g.setting_kind === "stepped" ? "Por pasos" : "Continuo"}</span>
          <span className="mono text-[13px] text-ink-soft">{range}</span>
        </div>
      </div>

      {onAdopt && (
        <div className="flex border-t border-hairline pt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdopt();
            }}
            disabled={adopting}
            className="btn-ghost ml-auto !px-3 !py-1.5 text-[12px] disabled:opacity-50"
          >
            <Copy size={14} /> Guardar copia
          </button>
        </div>
      )}
    </Card>
  );
}

function GrindersPage() {
  const { data: grinders = [], isLoading } = useGrinders();
  const { data: profiles } = useProfiles();
  const { session } = useAuth();
  const navigate = useNavigate();
  const cloneGrinder = useCloneGrinder();

  const uid = session?.user.id;
  const [q, setQ] = useState("");
  const [share, setShare] = useState<ShareFilter | null>(null);
  const [type, setType] = useState("");
  const [author, setAuthor] = useState("");

  const isShared = (g: GrinderRow) => g.ownerId !== uid || g.sharedGroupIds.length > 0;

  // Tipos presentes en el inventario (Manual / Eléctrico).
  const typeOptions = useMemo(() => {
    const seen = new Set<TypeFilter>();
    for (const g of grinders) seen.add(g.type);
    return [...seen].map((t) => ({ value: t, label: t === "manual" ? "Manual" : "Eléctrico" }));
  }, [grinders]);

  const authorOptions = useMemo(() => {
    const ids = new Set(grinders.map((g) => g.ownerId));
    const opts = [...ids]
      .filter((id) => id !== uid)
      .map((id) => ({ value: id, label: profiles?.get(id) ?? "Miembro" }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (uid && ids.has(uid)) opts.unshift({ value: uid, label: "Tú" });
    return opts;
  }, [grinders, profiles, uid]);

  // Predicado base (búsqueda + tipo + autor); la visibilidad se aplica aparte
  // para no esconder el Histórico (que no es ni privado ni compartido).
  const matches = (g: GrinderRow) => {
    const term = q.trim().toLowerCase();
    if (term && ![g.name, g.brand, g.model].filter(Boolean).join(" ").toLowerCase().includes(term))
      return false;
    if (type && g.type !== type) return false;
    if (author && g.ownerId !== author) return false;
    return true;
  };

  const base = grinders.filter(matches);
  const visible = base.filter(
    (g) => share === null || (share === "privado" ? !isShared(g) : isShared(g))
  );

  const mine = visible.filter((g) => g.ownerId === uid);
  const shared = visible.filter((g) => g.ownerId !== uid && isActiveInventory(g, uid));
  // Heredados solo por historial (ajenos, ya no compartidos): solo lectura.
  const historico = base.filter((g) => g.ownerId !== uid && !isActiveInventory(g, uid));

  const hasFilters = !!(q.trim() || share || type || author);
  const clearFilters = () => {
    setQ("");
    setShare(null);
    setType("");
    setAuthor("");
  };

  const open = (id: string) => navigate({ to: "/grinders/$grinderId/edit", params: { grinderId: id } });
  const adopt = async (id: string) => {
    const newId = await cloneGrinder.mutateAsync(id);
    navigate({ to: "/grinders/$grinderId/edit", params: { grinderId: newId } });
  };

  return (
    <AppShell title="Moledores">
      <div className="mx-auto max-w-2xl">
        <ScreenHeader
          sub="Inventario"
          title="Moledores"
          right={
            <Link to="/grinders/new" className="btn-primary">
              <Plus size={17} /> Agregar
            </Link>
          }
        />

        <Link
          to="/beans"
          className="mb-3 flex items-center gap-2 text-[12px] font-medium text-ink-soft transition-colors hover:text-accent"
        >
          <BeanIcon size={14} /> Ver granos →
        </Link>

        {/* búsqueda por nombre/marca/modelo */}
        <div className="mb-2.5 flex items-center gap-2 rounded-md border border-hairline-strong bg-surface-2 px-3">
          <Search size={16} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar moledor…"
            className="min-w-0 flex-1 border-none bg-transparent py-3 text-[14px] text-ink outline-none placeholder:text-faint"
          />
        </div>

        {/* filtros: visibilidad, tipo y autor */}
        {grinders.length > 0 && (
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
              <FilterField label="Tipo">
                <Select value={type} onChange={setType} placeholder="Todos" options={typeOptions} />
              </FilterField>
              {authorOptions.length > 1 && (
                <FilterField label="Autor">
                  <Select value={author} onChange={setAuthor} placeholder="Todos" options={authorOptions} />
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
        ) : grinders.length === 0 ? (
          <Card className="text-center text-sm text-muted">Aún no hay moledores en el inventario.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {mine.map((g) => (
              <GrinderCard key={g.id} g={g} mine onClick={() => open(g.id)} />
            ))}
            {mine.length === 0 && shared.length === 0 && historico.length === 0 && (
              <Card className="text-center text-sm text-muted">
                Sin moledores que coincidan con los filtros.
              </Card>
            )}

            {shared.length > 0 && (
              <>
                <div className="tag mt-2 px-1 text-faint">Compartidos conmigo</div>
                {shared.map((g) => (
                  <GrinderCard
                    key={g.id}
                    g={g}
                    mine={false}
                    onAdopt={() => adopt(g.id)}
                    adopting={cloneGrinder.isPending}
                  />
                ))}
              </>
            )}

            {historico.length > 0 && (
              <>
                <div className="tag mt-2 px-1 text-faint">Histórico</div>
                {historico.map((g) => (
                  <GrinderCard key={g.id} g={g} mine={false} readOnly />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
