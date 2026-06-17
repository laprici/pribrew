import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type MethodRow = {
  id: string;
  key: string;
  name: string;
  category: string;
  default_ratio: number | null;
  default_temp_c: number | null;
};

export function useMethods() {
  return useQuery({
    queryKey: ["methods"],
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<MethodRow[]> => {
      const { data, error } = await supabase
        .from("methods")
        .select("id, key, name, category, default_ratio, default_temp_c")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
