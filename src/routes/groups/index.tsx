import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Link2, Check, Users, ChevronDown, UserMinus, Trash2, LogOut, Crown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/auth";
import {
  useMyGroups,
  useCreateGroup,
  useCreateInvitation,
  useGroupMembers,
  useLeaveGroup,
  useRemoveMember,
  useDeleteGroup,
} from "@/data/groups";
import type { Group } from "@/domain/group.schema";

export const Route = createFileRoute("/groups/")({
  component: GroupsPage,
});

function GroupsPage() {
  const { data: groups, isLoading } = useMyGroups();
  const createGroup = useCreateGroup();
  const [name, setName] = useState("");

  const onCreate = async () => {
    if (!name.trim()) return;
    await createGroup.mutateAsync(name.trim());
    setName("");
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

          {groups?.map((g) => <GroupCard key={g.id} group={g} />)}
        </div>
      </div>
    </AppShell>
  );
}

function GroupCard({ group }: { group: Group }) {
  const { session } = useAuth();
  const confirm = useConfirm();
  const myId = session?.user.id;
  const isCreator = group.created_by === myId;

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const createInvite = useCreateInvitation();
  const leaveGroup = useLeaveGroup();
  const removeMember = useRemoveMember();
  const deleteGroup = useDeleteGroup();
  const { data: members, isLoading: loadingMembers } = useGroupMembers(open ? group.id : undefined);

  const onInvite = async () => {
    const token = await createInvite.mutateAsync(group.id);
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const onLeave = async () => {
    if (!myId) return;
    const ok = await confirm({
      title: `¿Salir del grupo "${group.name}"?`,
      message: "Dejarás de ver y compartir sus recetas.",
      confirmLabel: "Salir",
      tone: "danger",
    });
    if (!ok) return;
    await leaveGroup.mutateAsync({ groupId: group.id, userId: myId });
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: `¿Eliminar el grupo "${group.name}"?`,
      message: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    await deleteGroup.mutateAsync(group.id);
  };

  const onRemove = async (userId: string, username: string | null) => {
    const ok = await confirm({
      title: `¿Expulsar a ${username ?? "este miembro"} del grupo?`,
      message: "Dejará de ver y compartir las recetas del grupo.",
      confirmLabel: "Expulsar",
      tone: "danger",
    });
    if (!ok) return;
    await removeMember.mutateAsync({ groupId: group.id, userId });
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <button className="flex items-center gap-2 text-left" onClick={() => setOpen((v) => !v)}>
          <ChevronDown
            size={18}
            className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
          <div>
            <div className="flex items-center gap-1.5 font-medium">
              {group.name}
              {isCreator && <Crown size={14} className="text-extraction" />}
            </div>
            <div className="readout-label mt-0.5">creado {new Date(group.created_at).toLocaleDateString()}</div>
          </div>
        </button>

        {isCreator && (
          <button className="btn-ghost" onClick={onInvite} disabled={createInvite.isPending}>
            {copied ? (
              <><Check size={16} /> Link copiado</>
            ) : (
              <><Link2 size={16} /> Invitar</>
            )}
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-white/5 p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Users size={14} /> Miembros
          </div>

          {loadingMembers && <p className="text-sm text-muted">Cargando miembros…</p>}

          <ul className="space-y-1.5">
            {members?.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm">
                  {m.username ?? "Sin nombre"}
                  {m.is_creator && <Crown size={13} className="text-extraction" />}
                  {m.user_id === myId && <span className="text-xs text-muted">(tú)</span>}
                </span>
                {isCreator && m.user_id !== myId && (
                  <button
                    className="btn-ghost p-1.5 text-red-400"
                    onClick={() => onRemove(m.user_id, m.username)}
                    disabled={removeMember.isPending}
                    aria-label={`Expulsar a ${m.username ?? "este miembro"}`}
                    title="Expulsar"
                  >
                    <UserMinus size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="flex justify-end gap-2 pt-2">
            {isCreator ? (
              <button
                className="btn-ghost text-sm text-red-400"
                onClick={onDelete}
                disabled={deleteGroup.isPending}
              >
                <Trash2 size={16} /> Eliminar grupo
              </button>
            ) : (
              <button
                className="btn-ghost text-sm text-red-400"
                onClick={onLeave}
                disabled={leaveGroup.isPending}
              >
                <LogOut size={16} /> Salir del grupo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
