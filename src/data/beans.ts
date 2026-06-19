import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toBeanVM, type BeanVM } from "@/domain/view";
import type { BeanInput } from "@/domain/bean.schema";

/** Por defecto solo trae granos disponibles (no acabados). El inventario pide
   includeFinished para mostrarlos también; los selectores de extracción no. */
export function useBeans({ includeFinished = false }: { includeFinished?: boolean } = {}) {
  return useQuery({
    queryKey: ["beans", { includeFinished }],
    queryFn: async (): Promise<BeanVM[]> => {
      let q = supabase
        .from("beans")
        .select("*, bean_shares(group_id)")
        .eq("is_active", true);
      if (!includeFinished) q = q.is("finished_at", null);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toBeanVM);
    },
  });
}

/** Fila cruda para prellenar el formulario de edición. */
export function useBean(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["beans", id],
    queryFn: async (): Promise<Record<string, any> | null> => {
      const { data, error } = await supabase.from("beans").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
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

/** Adopta un grano compartido: clona solo su identidad descriptiva a un grano
   privado mío (owner_id default auth.uid()). Reinicia los campos de tanda física
   (fechas/peso/precio) y no copia los shares → nace privado. Lee la fila CRUDA
   (no el BeanVM, cuyo process/roast son labels) para no romper el enum del schema. */
export function useCloneBean() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: string): Promise<string> => {
      const { data: src, error: readErr } = await supabase
        .from("beans")
        .select("*")
        .eq("id", sourceId)
        .maybeSingle();
      if (readErr) throw readErr;
      if (!src) throw new Error("No se encontró el grano a copiar.");
      const copy: Partial<BeanInput> = {
        name: src.name,
        origin_country: src.origin_country ?? undefined,
        region: src.region ?? undefined,
        producer: src.producer ?? undefined,
        variety: src.variety ?? undefined,
        process: src.process ?? undefined,
        roast_level: src.roast_level ?? undefined,
        roaster: src.roaster ?? undefined,
        roaster_notes: src.roaster_notes ?? undefined,
        altitude_masl: src.altitude_masl ?? undefined,
        currency: src.currency ?? undefined,
      };
      const { data, error } = await supabase.from("beans").insert(copy).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beans"] }),
  });
}

export function useUpdateBean() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<BeanInput> }): Promise<void> => {
      // .select() detecta el caso 0 filas: si el grano es de otro miembro del
      // grupo, RLS deja leerlo pero bloquea el UPDATE — sin error, 0 filas.
      const { data, error } = await supabase.from("beans").update(input).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No puedes editar este grano: pertenece a otro miembro del grupo.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beans"] }),
  });
}

/** Marca un grano como acabado (sin stock) o lo devuelve a disponible.
   No lo borra: sigue activo y referenciable por extracciones e historial. */
export function useSetBeanFinished() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, finished }: { id: string; finished: boolean }): Promise<void> => {
      const { error } = await supabase
        .from("beans")
        .update({ finished_at: finished ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["beans"] });
      qc.invalidateQueries({ queryKey: ["beans", id] });
    },
  });
}

/** Borrado lógico: marca is_active = false para no romper extracciones que lo referencian. */
export function useDeleteBean() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data, error } = await supabase
        .from("beans")
        .update({ is_active: false })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No puedes borrar este grano: pertenece a otro miembro del grupo.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beans"] }),
  });
}
