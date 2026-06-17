import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toBeanVM, type BeanVM } from "@/domain/view";
import type { BeanInput } from "@/domain/bean.schema";

export function useBeans() {
  return useQuery({
    queryKey: ["beans"],
    queryFn: async (): Promise<BeanVM[]> => {
      const { data, error } = await supabase
        .from("beans")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toBeanVM);
    },
  });
}

export function useCreateBean() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BeanInput): Promise<string> => {
      const { data, error } = await supabase
        .from("beans")
        .insert(input)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beans"] }),
  });
}
