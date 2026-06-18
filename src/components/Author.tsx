import { User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfiles } from "@/data/profiles";

/** Chip de atribución: "Tú" para lo propio, "{nombre}" para lo compartido por
   el grupo. Con `hideMine` se omite cuando la fila es del usuario actual
   (útil en listas donde lo propio es lo esperado y solo interesa marcar lo ajeno). */
export function Author({
  ownerId,
  hideMine = false,
}: {
  ownerId: string;
  hideMine?: boolean;
}) {
  const { session } = useAuth();
  const { data: profiles } = useProfiles();
  const isMine = !!session && ownerId === session.user.id;

  if (isMine && hideMine) return null;

  const name = isMine ? "Tú" : profiles?.get(ownerId) ?? "Miembro";

  return (
    <span className="mono inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-faint">
      <User size={11} /> {name}
    </span>
  );
}
