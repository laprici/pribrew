import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { GrinderInput } from "@/domain/grinder.schema";

export type GrinderRow = {
  id: string;
  ownerId: string;
  name: string;
  type: "manual" | "electric";
  brand: string | null;
  model: string | null;
  setting_kind: "stepped" | "stepless";
  min_setting: number | null;
  max_setting: number | null;
  unit_label: string | null;
  sharedGroupIds: string[];
};

const GRINDER_SELECT =
  "id, owner_id, name, type, brand, model, setting_kind, min_setting, max_setting, unit_label, grinder_shares(group_id)";

export function useGrinders() {
  return useQuery({
    queryKey: ["grinders"],
    queryFn: async (): Promise<GrinderRow[]> => {
      const { data, error } = await supabase
        .from("grinders")
        .select(GRINDER_SELECT)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        ownerId: r.owner_id,
        name: r.name,
        type: r.type,
        brand: r.brand,
        model: r.model,
        setting_kind: r.setting_kind,
        min_setting: r.min_setting,
        max_setting: r.max_setting,
        unit_label: r.unit_label,
        sharedGroupIds: (r.grinder_shares ?? []).map((s: any) => s.group_id),
      }));
    },
  });
}

/** Fila cruda para prellenar el formulario de edición. */
export function useGrinder(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["grinders", id],
    queryFn: async (): Promise<Record<string, any> | null> => {
      const { data, error } = await supabase
        .from("grinders")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGrinder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GrinderInput): Promise<string> => {
      const { data, error } = await supabase
        .from("grinders")
        .insert(input)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grinders"] }),
  });
}

/** Adopta un moledor compartido: clona su identidad a un moledor privado mío
   (owner_id default auth.uid()). No copia los shares → nace privado. Lee la fila
   cruda; los moledores son todo identidad (no hay campos de tanda que reiniciar). */
export function useCloneGrinder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: string): Promise<string> => {
      const { data: src, error: readErr } = await supabase
        .from("grinders")
        .select("*")
        .eq("id", sourceId)
        .maybeSingle();
      if (readErr) throw readErr;
      if (!src) throw new Error("No se encontró el moledor a copiar.");
      const copy: Partial<GrinderInput> = {
        name: src.name,
        type: src.type,
        brand: src.brand ?? undefined,
        model: src.model ?? undefined,
        burr_type: src.burr_type ?? undefined,
        setting_kind: src.setting_kind ?? undefined,
        min_setting: src.min_setting ?? undefined,
        max_setting: src.max_setting ?? undefined,
        unit_label: src.unit_label ?? undefined,
        notes: src.notes ?? undefined,
      };
      const { data, error } = await supabase.from("grinders").insert(copy).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grinders"] }),
  });
}

export function useUpdateGrinder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<GrinderInput> }): Promise<void> => {
      // .select() detecta 0 filas: si el moledor es de otro miembro del grupo,
      // RLS deja leerlo pero bloquea el UPDATE — sin error, 0 filas.
      const { data, error } = await supabase.from("grinders").update(input).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No puedes editar este moledor: pertenece a otro miembro del grupo.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grinders"] }),
  });
}

/** Borrado lógico: is_active = false para no romper extracciones que lo referencian. */
export function useDeleteGrinder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data, error } = await supabase
        .from("grinders")
        .update({ is_active: false })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No puedes borrar este moledor: pertenece a otro miembro del grupo.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grinders"] }),
  });
}
