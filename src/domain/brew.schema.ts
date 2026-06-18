import { z } from "zod";

// Plantilla (method_params, steps) vive ahora en la receta.
// Se re-exporta desde aquí para no romper imports existentes.
export {
  methodParamsSchema,
  brewStepSchema,
  type MethodParams,
  type BrewStep,
} from "./receta.schema";

export const brewSchema = z.object({
  receta_id: z.string().uuid(),
  // método denormalizado desde la receta (lo escribe el cliente al guardar)
  method_id: z.string().uuid(),
  bean_id: z.string().uuid().nullable(),
  grinder_id: z.string().uuid().nullable(),
  brewed_at: z.string().datetime().optional(),
  grind_setting: z.string().optional(),
  dose_g: z.number().positive().optional(),
  yield_g: z.number().positive().optional(),
  water_temp_c: z.number().min(0).max(100).optional(),
  total_time_s: z.number().int().nonnegative().optional(),
  // cata (opcional hasta registrar el resultado)
  acidity: z.number().int().min(1).max(5).optional(),
  sweetness: z.number().int().min(1).max(5).optional(),
  bitterness: z.number().int().min(1).max(5).optional(),
  body: z.number().int().min(1).max(5).optional(),
  aftertaste: z.number().int().min(1).max(5).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  outcome_tags: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
  parent_brew_id: z.string().uuid().nullable().optional(),
});
export type BrewInput = z.infer<typeof brewSchema>;
