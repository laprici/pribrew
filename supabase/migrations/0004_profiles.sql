-- ============================================================
-- Perfiles — nombre visible por usuario (atribución en el grupo)
--
-- auth.users no es legible desde el cliente, así que para mostrar
-- "quién" logró una receta/extracción necesitamos una tabla espejo.
-- Patrón estándar Supabase: profiles.id ↔ auth.users.id, poblada por
-- trigger al registrarse + backfill, legible por miembros del grupo.
-- ============================================================

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz default now()
);

alter table profiles enable row level security;

-- Lectura: propio o de alguien con quien comparto grupo (reusa el helper
-- shares_group_with de 0001_init.sql). Escritura: solo el propio perfil.
create policy "profiles read own or shared" on profiles for select
  using (id = auth.uid() or shares_group_with(id));
create policy "profiles update own" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

grant select, update on profiles to authenticated;

-- ─────────── Alta automática al registrarse ───────────
-- display_name = metadato 'display_name' si vino en el signUp, si no la
-- parte local del email. El usuario puede cambiarlo luego en Ajustes.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────── Backfill de usuarios existentes ───────────
insert into profiles (id, display_name)
  select id, split_part(email, '@', 1) from auth.users
  on conflict (id) do nothing;
