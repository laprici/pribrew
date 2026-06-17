import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Link2, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useMyGroups, useCreateGroup, useCreateInvitation } from "@/data/groups";

export const Route = createFileRoute("/groups/")({
  component: GroupsPage,
});

function GroupsPage() {
  const { data: groups, isLoading } = useMyGroups();
  const createGroup = useCreateGroup();
  const createInvite = useCreateInvitation();
  const [name, setName] = useState("");
  const [copiedFor, setCopiedFor] = useState<string | null>(null);

  const onCreate = async () => {
    if (!name.trim()) return;
    await createGroup.mutateAsync(name.trim());
    setName("");
  };

  const onInvite = async (groupId: string) => {
    const token = await createInvite.mutateAsync(groupId);
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiedFor(groupId);
    setTimeout(() => setCopiedFor(null), 2500);
  };

  return (
    <AppShell title="Grupos">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Crear grupo */}
        <div className="card p-4">
          <label className="label" htmlFor="gname">Crear un grupo</label>
          <div className="flex gap-2">
            <input
              id="gname"
              className="field"
              placeholder="Ej: Casa, Oficina, Club de café"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreate()}
            />
            <button className="btn-primary shrink-0" onClick={onCreate} disabled={createGroup.isPending}>
              <Plus size={18} /> Crear
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Al crear un grupo, todas tus recetas y las de quienes se unan se comparten entre todos.
          </p>
        </div>

        {/* Lista de grupos */}
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted">Cargando grupos…</p>}

          {!isLoading && (groups?.length ?? 0) === 0 && (
            <div className="card p-6 text-center text-sm text-muted">
              Aún no tienes grupos. Crea uno o pide a alguien que te comparta un link de invitación.
            </div>
          )}

          {groups?.map((g) => (
            <div key={g.id} className="card flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="readout-label mt-0.5">creado {new Date(g.created_at).toLocaleDateString()}</div>
              </div>
              <button className="btn-ghost" onClick={() => onInvite(g.id)} disabled={createInvite.isPending}>
                {copiedFor === g.id ? (
                  <><Check size={16} /> Link copiado</>
                ) : (
                  <><Link2 size={16} /> Invitar</>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
