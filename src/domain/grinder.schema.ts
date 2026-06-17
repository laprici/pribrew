import { z } from "zod";

export const grinderSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["manual", "electric"]),
  brand: z.string().optional(),
  model: z.string().optional(),
  burr_type: z.string().optional(),
  setting_kind: z.enum(["stepped", "stepless"]).default("stepped"),
  min_setting: z.number().optional(),
  max_setting: z.number().optional(),
  unit_label: z.string().optional(),       // 'clicks', 'números'…
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});
export type GrinderInput = z.infer<typeof grinderSchema>;
