import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, SlidersHorizontal, Search, X, Copy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, NoteChip, Readout, ScreenHeader, freshnessLabel, freshnessTone } from "@/components/ui";
import { Pills, Select } from "@/components/form";
import { Author } from "@/components/Author";
import { ShareBadge } from "@/components/ShareGroups";
import { useAuth } from "@/lib/auth";
import { useBeans, useCloneBean } from "@/data/beans";
import { useProfiles } from "@/data/profiles";
import { daysSince, isActiveInventory, type BeanVM } from "@/domain/view";

export const Route = createFileRoute("/beans/")({
  component: BeansPage,
});

type ShareFilter = "privado" | "compartido";

/** Etiqueta encima de cada control de filtro (mismo patrón que recetas/historial). */
function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="tag text-[10px] text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function BeanCard({
  bean: b,
  onClick,
  mine,
  readOnly,
  onAdopt,
  adopting,
}: {
  bean: BeanVM;
  onClick?: () => void;
  mine: boolean;
  readOnly?: boolean;
  onAdopt?: () => void;
  adopting?: boolean;
}) {
  const days = daysSince(b.roastDate);
  const tone = freshnessTone(days);
  const barColor =
    tone === "warn" ? "var(--warn)" : tone === "signal" ? "var(--signal)" : "var(--accent)";
  const labelColor =
    tone === "warn" ? "text-warn" : tone === "signal" ? "text-signal" : "text-muted";
  const dim = b.finished || readOnly;
  return (
    <Card onClick={readOnly ? undefined : onClick} className={`flex flex-col gap-3.5 ${dim ? "opacity-55" : ""}`}>
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
            {mine ? <ShareBadge count={b.sharedGroupIds.length} /> : <Author ownerId={b.ownerId} />}
          </div>
          <div className="tag mt-1">
            {b.country} · {b.process}
          </div>
        </div>
        {/* Post-tueste/frescura: sin sentido para una bolsa que ya no tenés (Histórico). */}
        {!readOnly && <Readout k="Post-tueste" v={days} unit="d" tone={tone} />}
      </div>

      {readOnly ? (
        <div className="flex justify-end">
          <span className="tag text-[9px]">{b.roast}</span>
        </div>
      ) : (
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
      )}

      {b.notes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {b.notes.map((n) => (
            <NoteChip key={n}>{n}</NoteChip>
          ))}
        </div>
      )}

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

function BeansPage() {
  const { data: beans = [], isLoading } = useBeans({ includeFinished: true });
  const { data: profiles } = useProfiles();
  const { session } = useAuth();
  const navigate = useNavigate();
  const cloneBean = useCloneBean();

  const uid = session?.user.id;
  const [q, setQ] = useState("");
  const [share, setShare] = useState<ShareFilter | null>(null);
  const [process, setProcess] = useState("");
  const [author, setAuthor] = useState("");

  // Un grano es "compartido" si lo veo por compartición: ajeno, o propio
  // publicado en algún grupo. "Privado" = propio y sin grupos.
  const isShared = (b: BeanVM) => b.ownerId !== uid || b.sharedGroupIds.length > 0;

  // Procesos presentes (el VM ya trae el label; evita opciones que no filtran).
  const processOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const b of beans) if (b.process && b.process !== "—") seen.add(b.process);
    return [...seen].sort().map((p) => ({ value: p, label: p }));
  }, [beans]);

  // Autores presentes: yo primero ("Tú"), luego el resto del grupo por nombre.
  const authorOptions = useMemo(() => {
    const ids = new Set(beans.map((b) => b.ownerId));
    const opts = [...ids]
      .filter((id) => id !== uid)
      .map((id) => ({ value: id, label: profiles?.get(id) ?? "Miembro" }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (uid && ids.has(uid)) opts.unshift({ value: uid, label: "Tú" });
    return opts;
  }, [beans, profiles, uid]);

  // Predicado base (búsqueda + proceso + autor); el filtro de visibilidad se
  // aplica aparte para no esconder el Histórico (que no es ni privado ni compartido).
  const matches = (b: BeanVM) => {
    const term = q.trim().toLowerCase();
    if (term && ![b.origin, b.country, b.variety].join(" ").toLowerCase().includes(term)) return false;
    if (process && b.process !== process) return false;
    if (author && b.ownerId !== author) return false;
    return true;
  };

  const base = beans.filter(matches);
  const visible = base.filter(
    (b) => share === null || (share === "privado" ? !isShared(b) : isShared(b))
  );

  const mine = visible.filter((b) => b.ownerId === uid);
  const shared = visible.filter((b) => b.ownerId !== uid && isActiveInventory(b, uid));
  const available = mine.filter((b) => !b.finished);
  const finished = mine.filter((b) => b.finished);
  // Heredados solo por historial (ajenos, ya no compartidos): solo lectura.
  const historico = base.filter((b) => b.ownerId !== uid && !isActiveInventory(b, uid));

  const hasFilters = !!(q.trim() || share || process || author);
  const clearFilters = () => {
    setQ("");
    setShare(null);
    setProcess("");
    setAuthor("");
  };

  const open = (id: string) => navigate({ to: "/beans/$beanId/edit", params: { beanId: id } });
  const adopt = async (id: string) => {
    const newId = await cloneBean.mutateAsync(id);
    navigate({ to: "/beans/$beanId/edit", params: { beanId: newId } });
  };

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

        {/* búsqueda por nombre/origen/variedad */}
        <div className="mb-2.5 flex items-center gap-2 rounded-md border border-hairline-strong bg-surface-2 px-3">
          <Search size={16} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar grano…"
            className="min-w-0 flex-1 border-none bg-transparent py-3 text-[14px] text-ink outline-none placeholder:text-faint"
          />
        </div>

        {/* filtros: visibilidad, proceso y autor */}
        {beans.length > 0 && (
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
              <FilterField label="Proceso">
                <Select value={process} onChange={setProcess} placeholder="Todos" options={processOptions} />
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
        ) : beans.length === 0 ? (
          <Card className="text-center text-sm text-muted">Aún no hay granos en el inventario.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {available.map((b) => (
              <BeanCard key={b.id} bean={b} mine onClick={() => open(b.id)} />
            ))}
            {available.length === 0 && (
              <Card className="text-center text-sm text-muted">
                No hay granos disponibles que coincidan con los filtros.
              </Card>
            )}

            {finished.length > 0 && (
              <>
                <div className="tag mt-2 px-1 text-faint">Acabados</div>
                {finished.map((b) => (
                  <BeanCard key={b.id} bean={b} mine onClick={() => open(b.id)} />
                ))}
              </>
            )}

            {shared.length > 0 && (
              <>
                <div className="tag mt-2 px-1 text-faint">Compartidos conmigo</div>
                {shared.map((b) => (
                  <BeanCard
                    key={b.id}
                    bean={b}
                    mine={false}
                    onAdopt={() => adopt(b.id)}
                    adopting={cloneBean.isPending}
                  />
                ))}
              </>
            )}

            {historico.length > 0 && (
              <>
                <div className="tag mt-2 px-1 text-faint">Histórico</div>
                {historico.map((b) => (
                  <BeanCard key={b.id} bean={b} mine={false} readOnly />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
