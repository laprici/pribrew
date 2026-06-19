import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export type Profile = { id: string; username: string | null };

/** Perfiles visibles (propio + miembros del grupo, vía RLS) como Map id→username.
   Resolvemos autores en cliente: evita el embed PostgREST receta→profiles
   (no hay FK directa) y se reutiliza en recetas, extracciones y stats. */
export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    staleTime: 5 * 60_000, // los nombres cambian poco
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase.from("profiles").select("id, username");
      if (error) throw error;
      const map = new Map<string, string>();
      for (const p of (data ?? []) as Profile[]) {
        if (p.username) map.set(p.id, p.username);
      }
      return map;
    },
  });
}

/** Perfil del usuario autenticado (para editar el username en Ajustes). */
export function useMyProfile() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    enabled: !!uid,
    queryKey: ["profiles", "me", uid],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
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
    mutationFn: async (username: string): Promise<void> => {
      const { error } = await supabase
        .from("profiles")
        .update({ username: username.trim() })
        .eq("id", uid!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

/** ¿Está libre este username? Valida contra el RPC público antes de registrar
   o de guardar un cambio (el índice único es la garantía final). */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("username_available", {
    uname: username.trim(),
  });
  if (error) throw error;
  return data as boolean;
}
