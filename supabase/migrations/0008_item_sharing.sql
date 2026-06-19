-- ============================================================
-- Compartir explícito de inventario (granos / moledores / recetas)
--
-- Antes: lectura = propio OR shares_group_with(owner_id) → TODO tu inventario
-- era visible para cualquier co-miembro, sin poder elegir, y la visibilidad
-- dependía de la co-membresía viva. Salir del grupo "perdía" datos: las FKs de
-- brews (bean_id/receta_id/grinder_id) sobreviven, pero la RLS ocultaba la fila
-- referenciada y la extracción mostraba "grano/receta desconocido".
--
-- Ahora: cada ítem es PRIVADO por defecto y se comparte explícitamente con uno o
-- varios grupos (tablas *_shares, multi-grupo). La nueva lectura es:
--   propio  OR  compartido con un grupo del que soy miembro  OR
--   tengo una extracción que lo referencia  (← preserva el historial para siempre)
--
-- Al salir/expulsar de un grupo, un trigger borra los shares de ese usuario hacia
-- ese grupo (vuelven a privado), pero el historial ajeno que ya los usó los sigue
-- leyendo gracias a la tercera condición. brews mantiene su política de grupo.
-- ============================================================

-- ───────── Tablas de unión (un ítem ↔ varios grupos) ─────────
create table bean_shares (
  bean_id   uuid not null references beans(id)  on delete cascade,
  group_id  uuid not null references groups(id) on delete cascade,
  shared_by uuid not null references auth.users(id) default auth.uid(),
  shared_at timestamptz default now(),
  primary key (bean_id, group_id)
);

create table grinder_shares (
  grinder_id uuid not null references grinders(id) on delete cascade,
  group_id   uuid not null references groups(id)   on delete cascade,
  shared_by  uuid not null references auth.users(id) default auth.uid(),
  shared_at  timestamptz default now(),
  primary key (grinder_id, group_id)
);

create table receta_shares (
  receta_id uuid not null references recetas(id) on delete cascade,
  group_id  uuid not null references groups(id)  on delete cascade,
  shared_by uuid not null references auth.users(id) default auth.uid(),
  shared_at timestamptz default now(),
  primary key (receta_id, group_id)
);

create index on bean_shares    (group_id);
create index on grinder_shares (group_id);
create index on receta_shares  (group_id);

-- ============================================================
-- Funciones de lectura (SECURITY DEFINER: evitan recursión RLS, igual que
-- is_group_member / shares_group_with del esquema inicial)
-- ============================================================

-- ¿el ítem está compartido con algún grupo del que auth.uid() es miembro?
create or replace function can_read_shared_bean(b uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from bean_shares s
    join group_members m on m.group_id = s.group_id
    where s.bean_id = b and m.user_id = auth.uid()
  );
$$;

create or replace function can_read_shared_grinder(g uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from grinder_shares s
    join group_members m on m.group_id = s.group_id
    where s.grinder_id = g and m.user_id = auth.uid()
  );
$$;

create or replace function can_read_shared_receta(r uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from receta_shares s
    join group_members m on m.group_id = s.group_id
    where s.receta_id = r and m.user_id = auth.uid()
  );
$$;

-- ¿auth.uid() tiene alguna extracción que referencia este ítem? (preserva historial)
create or replace function owns_brew_with_bean(b uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from brews where bean_id = b and owner_id = auth.uid());
$$;

create or replace function owns_brew_with_grinder(g uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from brews where grinder_id = g and owner_id = auth.uid());
$$;

create or replace function owns_brew_with_receta(r uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from brews where receta_id = r and owner_id = auth.uid());
$$;

-- ============================================================
-- Nuevas políticas de lectura (reemplazan el compartir implícito por grupo)
-- ============================================================
drop policy "beans read own or shared"    on beans;
drop policy "grinders read own or shared"  on grinders;
drop policy "recetas read own or shared"   on recetas;

create policy "beans read" on beans for select using (
  owner_id = auth.uid() or can_read_shared_bean(id) or owns_brew_with_bean(id)
);
create policy "grinders read" on grinders for select using (
  owner_id = auth.uid() or can_read_shared_grinder(id) or owns_brew_with_grinder(id)
);
create policy "recetas read" on recetas for select using (
  owner_id = auth.uid() or can_read_shared_receta(id) or owns_brew_with_receta(id)
);
-- insert/update/delete de beans/grinders/recetas siguen siendo owner-only (sin cambios).

-- ============================================================
-- RLS de las tablas de share
--   leer  : miembros del grupo destino (ven qué se comparte con ellos)
--   crear : solo el dueño del ítem, y solo hacia un grupo del que es miembro
--   borrar: solo el dueño del ítem (desvincular)
-- ============================================================
alter table bean_shares    enable row level security;
alter table grinder_shares enable row level security;
alter table receta_shares  enable row level security;

create policy "bean_shares read" on bean_shares for select
  using (is_group_member(group_id));
create policy "bean_shares insert" on bean_shares for insert with check (
  is_group_member(group_id)
  and exists (select 1 from beans where id = bean_id and owner_id = auth.uid())
);
create policy "bean_shares delete" on bean_shares for delete
  using (exists (select 1 from beans where id = bean_id and owner_id = auth.uid()));

create policy "grinder_shares read" on grinder_shares for select
  using (is_group_member(group_id));
create policy "grinder_shares insert" on grinder_shares for insert with check (
  is_group_member(group_id)
  and exists (select 1 from grinders where id = grinder_id and owner_id = auth.uid())
);
create policy "grinder_shares delete" on grinder_shares for delete
  using (exists (select 1 from grinders where id = grinder_id and owner_id = auth.uid()));

create policy "receta_shares read" on receta_shares for select
  using (is_group_member(group_id));
create policy "receta_shares insert" on receta_shares for insert with check (
  is_group_member(group_id)
  and exists (select 1 from recetas where id = receta_id and owner_id = auth.uid())
);
create policy "receta_shares delete" on receta_shares for delete
  using (exists (select 1 from recetas where id = receta_id and owner_id = auth.uid()));

-- ============================================================
-- Auto-unshare al salir / ser expulsado de un grupo.
-- Cubre en un único punto: salida propia, expulsión por el creador y el cascade
-- por borrado del grupo. Borra los shares del usuario saliente hacia ese grupo;
-- el historial ajeno se preserva por owns_brew_with_*.
-- SECURITY DEFINER para poder borrar shares de cualquier dueño.
-- ============================================================
create or replace function unshare_on_leave()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from bean_shares s using beans b
    where s.bean_id = b.id and s.group_id = OLD.group_id and b.owner_id = OLD.user_id;
  delete from grinder_shares s using grinders g
    where s.grinder_id = g.id and s.group_id = OLD.group_id and g.owner_id = OLD.user_id;
  delete from receta_shares s using recetas r
    where s.receta_id = r.id and s.group_id = OLD.group_id and r.owner_id = OLD.user_id;
  return OLD;
end;
$$;

create trigger trg_unshare_on_leave
  after delete on group_members
  for each row execute function unshare_on_leave();

-- ============================================================
-- Grants de ejecución
-- ============================================================
grant execute on function can_read_shared_bean(uuid)    to authenticated;
grant execute on function can_read_shared_grinder(uuid) to authenticated;
grant execute on function can_read_shared_receta(uuid)  to authenticated;
grant execute on function owns_brew_with_bean(uuid)     to authenticated;
grant execute on function owns_brew_with_grinder(uuid)  to authenticated;
grant execute on function owns_brew_with_receta(uuid)   to authenticated;
