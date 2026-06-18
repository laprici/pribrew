import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toRecetaVM, type RecetaVM } from "@/domain/view";
import type { RecetaInput } from "@/domain/receta.schema";

// Join al método para mostrar etiqueta y derivar defaults.
const RECETA_SELECT = `
  id, owner_id, name, method_id, method_params, steps, default_dose_g, default_ratio,
  default_temp_c, notes, created_at,
  method:methods ( id, key, name, default_ratio, default_temp_c )
`;

export function useRecetas() {
  return useQuery({
    queryKey: ["recetas"],
    queryFn: async (): Promise<RecetaVM[]> => {
      const { data, error } = await supabase
        .from("recetas")
        .select(RECETA_SELECT)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toRecetaVM);
    },
  });
}

/** Fila cruda (con join a método) para prellenar el formulario y los defaults. */
export function useRecetaRow(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["recetas", "row", id],
    queryFn: async (): Promise<Record<string, any> | null> => {
      const { data, error } = await supabase
        .from("recetas")
        .select(RECETA_SELECT)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecetaInput): Promise<string> => {
      const { data, error } = await supabase
        .from("recetas")
        .insert(input)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recetas"] }),
  });
}

export function useUpdateReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<RecetaInput> }): Promise<void> => {
      const { error } = await supabase.from("recetas").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["recetas"] });
      qc.invalidateQueries({ queryKey: ["recetas", "row", id] });
    },
  });
}

/** Borrado lógico: is_active = false para no romper extracciones que la referencian. */
export function useDeleteReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("recetas").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recetas"] }),
  });
}
