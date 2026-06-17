import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toBrewVM, type BrewVM } from "@/domain/view";
import type { BrewInput } from "@/domain/brew.schema";

// Join a grano + método; las relaciones a-uno se devuelven como objeto anidado.
const BREW_SELECT = `
  id, brewed_at, created_at, dose_g, yield_g, water_temp_c, total_time_s, grind_setting,
  method_params, rating, acidity, sweetness, bitterness, body, aftertaste, outcome_tags, notes,
  bean:beans ( id, name, origin_country, region, variety, process, roast_level, roast_date, roaster_notes, remaining_g, weight_g, created_at ),
  method:methods ( id, key, name, default_ratio, default_temp_c )
`;

export function useBrews() {
  return useQuery({
    queryKey: ["brews"],
    queryFn: async (): Promise<BrewVM[]> => {
      const { data, error } = await supabase
        .from("brews")
        .select(BREW_SELECT)
        .order("brewed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toBrewVM);
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
