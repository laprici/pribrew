import { z } from "zod";

// Parámetros específicos por método (discriminated union sobre `method`).
// Son parte de la PLANTILLA: viven en la receta, no en cada extracción.
const espressoParams = z.object({
  method: z.literal("espresso"),
  pressure_bar: z.number().min(1).max(15).optional(),
  preinfusion: z.boolean().optional(),
  shot_time_s: z.number().optional(),
});

const v60Params = z.object({
  method: z.literal("v60"),
  bloom_water_g: z.number().optional(),
  bloom_time_s: z.number().optional(),
  pours: z.number().int().min(1).max(6).optional(),
  swirl: z.boolean().optional(),
});

const aeropressParams = z.object({
  method: z.literal("aeropress"),
  inverted: z.boolean().optional(),
  steep_time_s: z.number().optional(),
  plunge_time_s: z.number().optional(),
  bypass_g: z.number().optional(),
});

const frenchPressParams = z.object({
  method: z.literal("french_press"),
  steep_time_s: z.number().optional(),
  break_crust: z.boolean().optional(),
});

const mokaParams = z.object({
  method: z.literal("moka"),
  heat_level: z.enum(["low", "medium", "high"]).optional(),
  prewarmed_water: z.boolean().optional(),
});

const coldBrewParams = z.object({
  method: z.literal("cold_brew"),
  steep_hours: z.number().optional(),
  in_fridge: z.boolean().optional(),
  concentrate_ratio: z.number().optional(),
});

const coldDripParams = z.object({
  method: z.literal("cold_drip"),
  drops_per_min: z.number().optional(),
  total_drip_hours: z.number().optional(),
});

export const methodParamsSchema = z.discriminatedUnion("method", [
  espressoParams,
  v60Params,
  aeropressParams,
  frenchPressParams,
  mokaParams,
  coldBrewParams,
  coldDripParams,
]);
export type MethodParams = z.infer<typeof methodParamsSchema>;

// Paso de la receta: instante (s), agua acumulada objetivo (g) y/o instrucción.
export const brewStepSchema = z.object({
  at: z.number().int().nonnegative(),
  water_to: z.number().positive().nullish(),
  note: z.string().max(200).nullish(),
});
export type BrewStep = z.infer<typeof brewStepSchema>;

// Receta = plantilla. Su valor principal es el nombre; método y pasos son fijos.
export const recetaSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(120),
  method_id: z.string().uuid(),
  method_params: methodParamsSchema,
  steps: z.array(brewStepSchema).default([]),
  default_dose_g: z.number().positive().optional(),
  default_ratio: z.number().positive().optional(),
  default_temp_c: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  is_active: z.boolean().default(true),
});
export type RecetaInput = z.infer<typeof recetaSchema>;
