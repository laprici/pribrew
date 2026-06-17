import { z } from "zod";

// Parámetros específicos por método (discriminated union sobre `method`)
const espressoParams = z.object({
  method: z.literal("espresso"),
  pressure_bar: z.number().min(1).max(15).optional(),
  preinfusion_s: z.number().min(0).max(30).optional(),
  basket_size_g: z.number().optional(),
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

export const brewSchema = z.object({
  bean_id: z.string().uuid().nullable(),
  method_id: z.string().uuid(),
  grinder_id: z.string().uuid().nullable(),
  brewed_at: z.string().datetime().optional(),
  grind_setting: z.string().optional(),
  dose_g: z.number().positive().optional(),
  yield_g: z.number().positive().optional(),
  water_temp_c: z.number().min(0).max(100).optional(),
  total_time_s: z.number().int().nonnegative().optional(),
  method_params: methodParamsSchema,
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
