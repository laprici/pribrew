-- ============================================================
-- Pricofee — esquema inicial
-- Multiusuario con recetas compartidas por grupo.
-- Asume el esquema `auth` de Supabase (auth.users, auth.uid()).
-- ============================================================

-- En Supabase las extensiones viven en el schema `extensions`; fijarlo
-- garantiza que gen_random_bytes resuelva en cloud y local.
create extension if not exists pgcrypto with schema extensions;  -- gen_random_bytes para tokens

-- ───────── Tipos enumerados ─────────
create type process_type     as enum ('washed','natural','honey','anaerobic','other');
create type roast_level       as enum ('light','medium-light','medium','medium-dark','dark');
create type grinder_type      as enum ('manual','electric');
create type setting_type      as enum ('stepped','stepless');
create type method_category   as enum ('espresso','pour_over','immersion','cold','moka');
create type member_role       as enum ('owner','admin','member');

-- ───────── Grupos y membresía ─────────
create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references auth.users(id) default auth.uid(),
  created_at  timestamptz default now()
);

create table group_members (
  group_id    uuid not null references groups(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        member_role not null default 'member',
  joined_at   timestamptz default now(),
  primary key (group_id, user_id)
);

create table group_invitations (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  token       text not null unique default encode(extensions.gen_random_bytes(16),'hex'),
  created_by  uuid not null references auth.users(id) default auth.uid(),
  expires_at  timestamptz,             -- null = sin expiración
  max_uses    int,                     -- null = ilimitado
  uses        int not null default 0,
  revoked     boolean not null default false,
  created_at  timestamptz default now()
);

-- ───────── Inventario: granos ─────────
create table beans (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) default auth.uid(),
  name           text not null,
  origin_country text,
  region         text,
  producer       text,
  variety        text,
  process        process_type,
  roast_level    roast_level,
  roaster        text,
  roast_date     date,
  purchase_date  date,
  weight_g       int default 1000,
  remaining_g    int,                  -- entrada manual opcional (D-05: no auto-descuento)
  price          numeric,
  currency       text default 'CLP',
  altitude_masl  int,
  roaster_notes  text,
  photo_url      text,
  is_active      boolean not null default true,
  created_at     timestamptz default now()
);

-- ───────── Inventario: moledores ─────────
create table grinders (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) default auth.uid(),
  name          text not null,
  type          grinder_type not null,
  brand         text,
  model         text,
  burr_type     text,
  setting_kind  setting_type not null default 'stepped',
  min_setting   numeric,
  max_setting   numeric,
  unit_label    text,                  -- 'clicks', 'números', etc.
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz default now()
);

-- ───────── Métodos (semilla global owner_id null + custom por usuario) ─────────
create table methods (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid references auth.users(id),   -- null = global/semilla
  key            text not null,
  name           text not null,
  category       method_category not null,
  default_ratio  numeric,
  default_temp_c numeric,
  grind_hint     text,
  notes          text
);

-- ───────── Extracciones (core) ─────────
create table brews (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) default auth.uid(),
  bean_id         uuid references beans(id) on delete set null,
  method_id       uuid references methods(id),
  grinder_id      uuid references grinders(id) on delete set null,
  brewed_at       timestamptz default now(),

  -- comunes
  grind_setting   text,
  dose_g          numeric,
  yield_g         numeric,
  ratio           numeric generated always as
                    (case when dose_g > 0 then round(yield_g / dose_g, 2) end) stored,
  water_temp_c    numeric,
  total_time_s    int,

  -- específicos del método (validado en app con Zod discriminated union)
  method_params   jsonb not null default '{}'::jsonb,

  -- resultado / cata
  acidity      smallint check (acidity     between 1 and 5),
  sweetness    smallint check (sweetness   between 1 and 5),
  bitterness   smallint check (bitterness  between 1 and 5),
  body         smallint check (body        between 1 and 5),
  aftertaste   smallint check (aftertaste  between 1 and 5),
  rating       smallint check (rating      between 1 and 5),
  outcome_tags text[] not null default '{}',
  notes        text,

  parent_brew_id uuid references brews(id) on delete set null,  -- linaje
  photo_url    text,
  created_at   timestamptz default now()
);

-- ───────── Sugerencias de IA (DeepSeek) ─────────
create table brew_suggestions (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) default auth.uid(),
  brew_id        uuid not null references brews(id) on delete cascade,
  provider       text,                 -- 'deepseek'
  model          text,                 -- 'deepseek-v4-flash' | 'deepseek-v4-pro'
  input_snapshot jsonb,
  suggestions    jsonb,                -- [{param, from, to, reason, confidence}]
  summary        text,
  created_at     timestamptz default now()
);

-- ───────── Índices ─────────
create index on group_members (user_id);
create index on group_invitations (group_id);
create index on beans (owner_id);
create index on grinders (owner_id);
create index on brews (owner_id);
create index on brews (bean_id);
create index on brews (method_id);
create index on brews (brewed_at desc);
create index on brew_suggestions (brew_id);

-- ============================================================
-- Funciones de membresía (SECURITY DEFINER: evitan recursión en RLS)
-- ============================================================

-- ¿auth.uid() es miembro del grupo g?
create or replace function is_group_member(g uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from group_members
    where group_id = g and user_id = auth.uid()
  );
$$;

-- ¿auth.uid() comparte algún grupo con `owner`?  (base de la lectura compartida)
create or replace function shares_group_with(owner uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from group_members a
    join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = owner
  );
$$;

-- ============================================================
-- RPCs de grupos (atómicas, SECURITY DEFINER)
-- ============================================================

-- Crea un grupo y agrega al creador como owner.
create or replace function create_group(group_name text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  insert into groups(name, created_by) values (group_name, auth.uid())
    returning id into new_id;
  insert into group_members(group_id, user_id, role)
    values (new_id, auth.uid(), 'owner');
  return new_id;
end;
$$;

-- Acepta una invitación por token: valida vigencia/usos y agrega membresía.
create or replace function accept_invitation(invite_token text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare inv group_invitations;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into inv from group_invitations where token = invite_token;

  if inv.id is null then raise exception 'Invitación inválida'; end if;
  if inv.revoked then raise exception 'Invitación revocada'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'Invitación expirada';
  end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then
    raise exception 'Invitación sin usos disponibles';
  end if;

  insert into group_members(group_id, user_id, role)
    values (inv.group_id, auth.uid(), 'member')
    on conflict (group_id, user_id) do nothing;

  update group_invitations set uses = uses + 1 where id = inv.id;
  return inv.group_id;
end;
$$;

-- Datos del grupo para la pantalla pública de invitación (sin exponer la tabla).
create or replace function invitation_preview(invite_token text)
returns table (group_id uuid, group_name text, valid boolean)
language sql stable security definer set search_path = public, pg_temp
as $$
  select g.id, g.name,
         (i.revoked = false
           and (i.expires_at is null or i.expires_at > now())
           and (i.max_uses is null or i.uses < i.max_uses)) as valid
  from group_invitations i
  join groups g on g.id = i.group_id
  where i.token = invite_token;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

-- Patrón contenido: leer si es propio o compartido por grupo; escribir solo lo propio.
alter table beans    enable row level security;
alter table grinders enable row level security;
alter table brews    enable row level security;

create policy "beans read own or shared" on beans for select
  using (owner_id = auth.uid() or shares_group_with(owner_id));
create policy "beans insert own" on beans for insert
  with check (owner_id = auth.uid());
create policy "beans update own" on beans for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "beans delete own" on beans for delete
  using (owner_id = auth.uid());

create policy "grinders read own or shared" on grinders for select
  using (owner_id = auth.uid() or shares_group_with(owner_id));
create policy "grinders insert own" on grinders for insert
  with check (owner_id = auth.uid());
create policy "grinders update own" on grinders for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "grinders delete own" on grinders for delete
  using (owner_id = auth.uid());

create policy "brews read own or shared" on brews for select
  using (owner_id = auth.uid() or shares_group_with(owner_id));
create policy "brews insert own" on brews for insert
  with check (owner_id = auth.uid());
create policy "brews update own" on brews for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "brews delete own" on brews for delete
  using (owner_id = auth.uid());

-- Sugerencias IA: solo del dueño.
alter table brew_suggestions enable row level security;
create policy "suggestions own" on brew_suggestions for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Métodos: leer globales (owner_id null) + propios; escribir solo propios.
alter table methods enable row level security;
create policy "methods read" on methods for select
  using (owner_id is null or owner_id = auth.uid());
create policy "methods write own" on methods for insert
  with check (owner_id = auth.uid());
create policy "methods update own" on methods for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "methods delete own" on methods for delete
  using (owner_id = auth.uid());

-- Grupos.
alter table groups            enable row level security;
alter table group_members     enable row level security;
alter table group_invitations enable row level security;

create policy "groups read mine" on groups for select
  using (is_group_member(id) or created_by = auth.uid());
create policy "groups update creator" on groups for update
  using (created_by = auth.uid());
create policy "groups delete creator" on groups for delete
  using (created_by = auth.uid());
-- inserción de grupos: vía RPC create_group()

create policy "members read of my groups" on group_members for select
  using (is_group_member(group_id));
create policy "members leave self" on group_members for delete
  using (user_id = auth.uid());
-- inserción de membresías: vía RPC accept_invitation()

create policy "invites manage of my groups" on group_invitations for all
  using (is_group_member(group_id)) with check (is_group_member(group_id));

-- Permisos de ejecución de las RPC para usuarios autenticados.
grant execute on function create_group(text)        to authenticated;
grant execute on function accept_invitation(text)   to authenticated;
grant execute on function invitation_preview(text)  to anon, authenticated;
