import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { GrinderInput } from "@/domain/grinder.schema";

export type GrinderRow = {
  id: string;
  name: string;
  type: "manual" | "electric";
  brand: string | null;
  model: string | null;
  setting_kind: "stepped" | "stepless";
  min_setting: number | null;
  max_setting: number | null;
  unit_label: string | null;
};

const GRINDER_SELECT =
  "id, name, type, brand, model, setting_kind, min_setting, max_setting, unit_label";

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
      return (data ?? []) as GrinderRow[];
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

export function useUpdateGrinder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<GrinderInput> }): Promise<void> => {
      const { error } = await supabase.from("grinders").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grinders"] }),
  });
}

/** Borrado lógico: is_active = false para no romper extracciones que lo referencian. */
export function useDeleteGrinder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("grinders").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grinders"] }),
  });
}
