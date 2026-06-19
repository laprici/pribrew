import { Users } from "lucide-react";
import { Toggle } from "@/components/form";
import { useMyGroups } from "@/data/groups";

/** Selector de grupos con los que compartir un ítem (granos/moledores/recetas).
   Privado = ningún grupo marcado. Si el usuario no tiene grupos, no se muestra. */
export function ShareGroupsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { data: groups = [] } = useMyGroups();
  if (groups.length === 0) return null;

  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...value, id] : value.filter((g) => g !== id));

  return (
    <div className="mb-4 rounded-lg border border-hairline bg-surface-2 p-3.5">
      <div className="mb-1 flex items-center gap-2">
        <Users size={14} className="text-ink-soft" />
        <span className="tag">Compartir con grupos</span>
      </div>
      <p className="tag mb-3 text-[9.5px] normal-case leading-snug tracking-normal">
        Privado por defecto. Quien ya registró extracciones con este ítem conserva su historial aunque dejes de compartirlo.
      </p>
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <Toggle
            key={g.id}
            label={g.name}
            checked={value.includes(g.id)}
            onChange={(on) => toggle(g.id, on)}
          />
        ))}
      </div>
    </div>
  );
}

/** Chip de estado de compartido para las tarjetas de inventario. */
export function ShareBadge({ count }: { count: number }) {
  return (
    <span className="mono inline-flex flex-none items-center gap-1 rounded-pill border border-hairline bg-chip px-2 py-[3px] text-[9px] uppercase tracking-[0.12em] text-muted">
      {count > 0 ? (
        <>
          <Users size={10} /> {count}
        </>
      ) : (
        "Privado"
      )}
    </span>
  );
}
