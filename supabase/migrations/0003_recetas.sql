-- ============================================================
-- Recetas (plantillas reutilizables) ↔ Extracciones (brews)
--
-- Una receta es la BASE: nombre + método + pasos fijos + parámetros del
-- método (lo que "siempre es igual"). Desde una receta se registran
-- extracciones que varían grano, moledor, molienda, dosis, etc. y guardan
-- la cata. Por eso method_params/steps pasan de `brews` a `recetas`.
--
-- Seguridad: mismo patrón RLS contenido que beans/grinders/brews
--   lectura  = propio OR shares_group_with(owner_id)
--   escritura= owner_id = auth.uid()
-- owner_id por defecto auth.uid(); borrado lógico con is_active.
-- ============================================================

create table recetas (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) default auth.uid(),
  name           text not null,
  method_id      uuid not null references methods(id),

  -- plantilla (validada en app con Zod: methodParamsSchema + brewStepSchema)
  method_params  jsonb not null default '{}'::jsonb,
  steps          jsonb not null default '[]'::jsonb,

  -- defaults que prerellenan una extracción
  default_dose_g  numeric,
  default_ratio   numeric,
  default_temp_c  numeric,

  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz default now()
);

create index on recetas (owner_id);
create index on recetas (method_id);

alter table recetas enable row level security;

create policy "recetas read own or shared" on recetas for select
  using (owner_id = auth.uid() or shares_group_with(owner_id));
create policy "recetas insert own" on recetas for insert
  with check (owner_id = auth.uid());
create policy "recetas update own" on recetas for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "recetas delete own" on recetas for delete
  using (owner_id = auth.uid());

-- ─────────── brews → receta_id (toda extracción nace de una receta) ───────────
-- Empezar de cero: solo había datos de prueba, así que limpiamos `brews`
-- antes de endurecer la FK como NOT NULL.
delete from brews;

alter table brews drop column if exists method_params;
alter table brews drop column if exists steps;

alter table brews add column receta_id uuid not null references recetas(id) on delete restrict;
create index on brews (receta_id);
create index on brews (grinder_id);
