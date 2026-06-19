import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toBrewVM, type BrewVM } from "@/domain/view";
import type { BrewInput } from "@/domain/brew.schema";

// Join a grano + método + receta (con sus pasos/plantilla); las relaciones
// a-uno se devuelven como objeto anidado.
const BREW_SELECT = `
  id, brewed_at, created_at, dose_g, yield_g, water_temp_c, total_time_s, grind_setting,
  rating, acidity, sweetness, bitterness, body, aftertaste, outcome_tags, notes,
  owner_id, receta_id, bean_id, grinder_id,
  bean:beans ( id, name, origin_country, region, variety, process, roast_level, roast_date, roaster_notes, remaining_g, weight_g, created_at ),
  grinder:grinders ( id, name, brand, model, unit_label ),
  method:methods ( id, key, name, default_ratio, default_temp_c ),
  receta:recetas ( id, name, method_params, steps, default_dose_g, default_ratio, method:methods ( id, key, name, default_ratio, default_temp_c ) )
`;

/** Filtros opcionales para la lista de extracciones (server-side, FKs indexadas).
   from/to son fechas ISO (YYYY-MM-DD) que acotan brewed_at. */
export type BrewFilters = {
  recetaId?: string;
  methodId?: string;
  beanId?: string;
  grinderId?: string;
  /** owner_id: filtra por persona (historial compartido del grupo). */
  personaId?: string;
  from?: string;
  to?: string;
};

export function useBrews(filters: BrewFilters = {}) {
  const { recetaId, methodId, beanId, grinderId, personaId, from, to } = filters;
  return useQuery({
    queryKey: ["brews", { recetaId, methodId, beanId, grinderId, personaId, from, to }],
    queryFn: async (): Promise<BrewVM[]> => {
      let q = supabase.from("brews").select(BREW_SELECT);
      if (recetaId) q = q.eq("receta_id", recetaId);
      if (methodId) q = q.eq("method_id", methodId);
      if (beanId) q = q.eq("bean_id", beanId);
      if (grinderId) q = q.eq("grinder_id", grinderId);
      if (personaId) q = q.eq("owner_id", personaId);
      if (from) q = q.gte("brewed_at", from);
      // incluye todo el día "hasta" (hasta el final de esa fecha).
      if (to) q = q.lte("brewed_at", `${to}T23:59:59.999`);
      const { data, error } = await q.order("brewed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toBrewVM);
    },
  });
}

/** Nº de extracciones por receta (consulta ligera) para las tarjetas de /recetas. */
export function useRecetaCounts() {
  return useQuery({
    queryKey: ["brews", "receta-counts"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.from("brews").select("receta_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        if (!r.receta_id) continue;
        counts[r.receta_id] = (counts[r.receta_id] ?? 0) + 1;
      }
      return counts;
    },
  });
}

export function useBrew(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["brews", id],
    queryFn: async (): Promise<BrewVM | null> => {
      const { data, error } = await supabase
        .from("brews")
        .select(BREW_SELECT)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data ? toBrewVM(data) : null;
    },
  });
}

/** Fila cruda (sin joins) para prellenar el formulario de edición. */
export function useBrewRow(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["brews", "row", id],
    queryFn: async (): Promise<Record<string, any> | null> => {
      const { data, error } = await supabase.from("brews").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBrew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BrewInput): Promise<string> => {
      const { data, error } = await supabase
        .from("brews")
        .insert(input)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brews"] }),
  });
}

export function useUpdateBrew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: BrewInput }): Promise<void> => {
      const { error } = await supabase.from("brews").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["brews"] });
      qc.invalidateQueries({ queryKey: ["brews", "row", id] });
    },
  });
}

export function useDeleteBrew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("brews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brews"] }),
  });
}
