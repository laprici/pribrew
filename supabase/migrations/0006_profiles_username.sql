-- ============================================================
-- Username único — el "nombre" del perfil pasa a ser un handle único
--
-- Antes profiles.display_name era texto libre (atribución en el grupo).
-- Ahora es un username único (case-insensitive), elegido en el alta y
-- editable en Ajustes. El cliente valida disponibilidad con
-- username_available() antes de registrar; el índice único es la garantía.
-- ============================================================

alter table profiles rename column display_name to username;

-- Unicidad de los datos existentes antes de crear el índice: a los
-- duplicados (case-insensitive) se les añade un sufijo numérico estable.
with ranked as (
  select id,
         coalesce(nullif(username, ''), 'barista') as base,
         row_number() over (
           partition by lower(coalesce(nullif(username, ''), 'barista'))
           order by created_at, id
         ) as rn
  from profiles
)
update profiles p
   set username = case when r.rn = 1 then r.base else r.base || r.rn end
  from ranked r
 where r.id = p.id;

alter table profiles alter column username set not null;
create unique index profiles_username_lower_key on profiles (lower(username));

-- Alta automática: username del metadato 'username' del signUp; si faltara,
-- se deriva de la parte local del email. Un choque de unicidad aquí revierte
-- toda la transacción de alta (auth.users incluido) — por eso el cliente
-- valida disponibilidad antes con username_available().
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into profiles (id, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ¿Está libre este username? Público (anon) para validar en el formulario de
-- alta antes de existir sesión. SECURITY DEFINER para saltar la RLS de lectura.
create or replace function username_available(uname text)
returns boolean
language sql security definer stable set search_path = public, pg_temp
as $$
  select not exists (
    select 1 from profiles where lower(username) = lower(trim(uname))
  );
$$;

grant execute on function username_available(text) to anon, authenticated;
