-- ============================================================
-- Granos: estado "acabado" (terminado / sin stock)
--
-- Un grano puede agotarse sin querer borrarlo: se conserva para no romper
-- las extracciones que lo referencian y para mantener el historial, pero
-- deja de ofrecerse como "disponible" al registrar nuevas extracciones.
--
--   finished_at IS NULL  → disponible
--   finished_at IS NOT NULL → acabado (marca la fecha en que se agotó)
--
-- Es distinto de is_active (borrado lógico): un grano acabado sigue activo.
-- No requiere políticas nuevas: se actualiza con el UPDATE propio existente.
-- ============================================================

alter table beans add column if not exists finished_at timestamptz;
