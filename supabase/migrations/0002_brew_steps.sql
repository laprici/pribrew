-- ============================================================
-- Pasos de la receta por extracción (timeline de vertido editable).
-- Cada extracción puede tener su propia secuencia de pasos, así que dos
-- recetas del mismo método (p. ej. V60 dulce vs ácida) difieren en pasos.
-- Forma: [{ "at": <segundos>, "water_to": <g|null>, "note": <texto|null> }]
-- La app valida la forma (brew.schema.ts); la DB solo guarda el jsonb.
-- ============================================================
alter table brews add column if not exists steps jsonb not null default '[]'::jsonb;
