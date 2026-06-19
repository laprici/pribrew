import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Tipos de ítem compartibles y su tabla de unión + columna FK. */
export type ShareKind = "bean" | "grinder" | "receta";

const SHARE_TABLE: Record<ShareKind, { table: string; col: string; itemsKey: string }> = {
  bean: { table: "bean_shares", col: "bean_id", itemsKey: "beans" },
  grinder: { table: "grinder_shares", col: "grinder_id", itemsKey: "grinders" },
  receta: { table: "receta_shares", col: "receta_id", itemsKey: "recetas" },
};

/** group_ids con los que un ítem está compartido (los que el usuario puede ver). */
export function useItemShares(kind: ShareKind, itemId: string | undefined) {
  const { table, col } = SHARE_TABLE[kind];
  return useQuery({
    enabled: !!itemId,
    queryKey: ["item_shares", kind, itemId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from(table).select("group_id").eq(col, itemId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.group_id as string);
    },
  });
}

/** Fija el conjunto exacto de grupos con los que se comparte un ítem: calcula el
   diff contra lo actual e inserta/borra las filas necesarias. */
export function useSetItemShares(kind: ShareKind) {
  const { table, col, itemsKey } = SHARE_TABLE[kind];
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, groupIds }: { itemId: string; groupIds: string[] }): Promise<void> => {
      const { data, error } = await supabase.from(table).select("group_id").eq(col, itemId);
      if (error) throw error;
      const current = new Set((data ?? []).map((r: any) => r.group_id as string));
      const next = new Set(groupIds);

      const toAdd = groupIds.filter((g) => !current.has(g));
      const toRemove = [...current].filter((g) => !next.has(g));

      if (toAdd.length) {
        const rows = toAdd.map((group_id) => ({ [col]: itemId, group_id }));
        const { error: insErr } = await supabase.from(table).insert(rows);
        if (insErr) throw insErr;
      }
      if (toRemove.length) {
        const { error: delErr } = await supabase
          .from(table)
          .delete()
          .eq(col, itemId)
          .in("group_id", toRemove);
        if (delErr) throw delErr;
      }
    },
    onSuccess: (_d, { itemId }) => {
      qc.invalidateQueries({ queryKey: [itemsKey] });
      qc.invalidateQueries({ queryKey: ["item_shares", kind, itemId] });
    },
  });
}
