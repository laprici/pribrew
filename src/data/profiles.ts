import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export type Profile = { id: string; display_name: string | null };

/** Perfiles visibles (propio + miembros del grupo, vía RLS) como Map id→nombre.
   Resolvemos autores en cliente: evita el embed PostgREST receta→profiles
   (no hay FK directa) y se reutiliza en recetas, extracciones y stats. */
export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    staleTime: 5 * 60_000, // los nombres cambian poco
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase.from("profiles").select("id, display_name");
      if (error) throw error;
      const map = new Map<string, string>();
      for (const p of (data ?? []) as Profile[]) {
        if (p.display_name) map.set(p.id, p.display_name);
      }
      return map;
    },
  });
}

/** Perfil del usuario autenticado (para editar el nombre en Ajustes). */
export function useMyProfile() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    enabled: !!uid,
    queryKey: ["profiles", "me", uid],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", uid!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id;
  return useMutation({
    mutationFn: async (displayName: string): Promise<void> => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null })
        .eq("id", uid!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}
