/* Planes de vertido por método — insumo para el futuro Timer (Phase posterior).
   El resto del antiguo mock (beans/brews) se reemplazó por datos reales de
   Supabase vía src/data/* y los view-models de src/domain/view.ts. */

export type MethodPhase = { label: string; to: number; sec: number };
export type MethodPlan = { ratio: number; phases: MethodPhase[] };

export const methodPlans: Record<string, MethodPlan> = {
  V60: { ratio: 16.5, phases: [
    { label: "Bloom", to: 0.18, sec: 40 },
    { label: "1er vertido", to: 0.6, sec: 30 },
    { label: "2do vertido", to: 1.0, sec: 30 },
    { label: "Drawdown", to: 1.0, sec: 65 },
  ] },
  Chemex: { ratio: 16, phases: [
    { label: "Bloom", to: 0.15, sec: 45 },
    { label: "1er vertido", to: 0.55, sec: 40 },
    { label: "2do vertido", to: 1.0, sec: 40 },
    { label: "Drawdown", to: 1.0, sec: 90 },
  ] },
  Aeropress: { ratio: 15, phases: [
    { label: "Vertido", to: 1.0, sec: 20 },
    { label: "Inmersión", to: 1.0, sec: 90 },
    { label: "Presión", to: 1.0, sec: 25 },
  ] },
};
