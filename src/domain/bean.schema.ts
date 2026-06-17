import { z } from "zod";

export const beanSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  origin_country: z.string().optional(),
  region: z.string().optional(),
  producer: z.string().optional(),
  variety: z.string().optional(),
  process: z.enum(["washed", "natural", "honey", "anaerobic", "other"]).optional(),
  roast_level: z
    .enum(["light", "medium-light", "medium", "medium-dark", "dark"])
    .optional(),
  roaster: z.string().optional(),
  roast_date: z.string().optional(),     // ISO date
  purchase_date: z.string().optional(),
  weight_g: z.number().int().positive().optional(),
  remaining_g: z.number().int().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().default("CLP"),
  altitude_masl: z.number().int().optional(),
  roaster_notes: z.string().optional(),
  is_active: z.boolean().default(true),
});
export type BeanInput = z.infer<typeof beanSchema>;
