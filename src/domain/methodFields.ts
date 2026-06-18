import type { MethodKey } from "@/domain/method";

/* Campos específicos por método — reflejan el discriminatedUnion de
   receta.schema.ts (method_params). Compartido por el formulario de receta
   (edición) y la vista de lectura de la receta. */
export type PField =
  | { key: string; label: string; kind: "num"; unit?: string }
  | { key: string; label: string; kind: "bool" }
  | { key: string; label: string; kind: "enum"; options: { value: string; label: string }[] };

export const METHOD_FIELDS: Record<MethodKey, PField[]> = {
  espresso: [
    { key: "pressure_bar", label: "Presión", kind: "num", unit: "bar" },
    { key: "preinfusion", label: "Preinfusión", kind: "bool" },
  ],
  v60: [
    { key: "bloom_water_g", label: "Agua bloom", kind: "num", unit: "g" },
    { key: "bloom_time_s", label: "Tiempo bloom", kind: "num", unit: "s" },
    { key: "pours", label: "Vertidos", kind: "num" },
    { key: "swirl", label: "Swirl", kind: "bool" },
  ],
  aeropress: [
    { key: "inverted", label: "Invertida", kind: "bool" },
    { key: "steep_time_s", label: "Reposo", kind: "num", unit: "s" },
    { key: "plunge_time_s", label: "Prensado", kind: "num", unit: "s" },
    { key: "bypass_g", label: "Bypass", kind: "num", unit: "g" },
  ],
  french_press: [
    { key: "steep_time_s", label: "Reposo", kind: "num", unit: "s" },
    { key: "break_crust", label: "Romper costra", kind: "bool" },
  ],
  moka: [
    {
      key: "heat_level",
      label: "Fuego",
      kind: "enum",
      options: [
        { value: "low", label: "Bajo" },
        { value: "medium", label: "Medio" },
        { value: "high", label: "Alto" },
      ],
    },
    { key: "prewarmed_water", label: "Agua precalentada", kind: "bool" },
  ],
  cold_brew: [{ key: "in_fridge", label: "Refrigerado", kind: "bool" }],
  cold_drip: [
    { key: "drops_per_min", label: "Gotas/min", kind: "num" },
    { key: "total_drip_hours", label: "Goteo total", kind: "num", unit: "h" },
  ],
};
