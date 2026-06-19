-- ============================================================
-- Gestión de miembros del grupo
--
-- El creador del grupo puede ver e eliminar miembros (además de invitar
-- y borrar el grupo). Los invitados sólo pueden salir (borrar su propia
-- membresía, ya cubierto por "members leave self" en 0001_init.sql).
--
-- Para listar miembros con su username necesitamos cruzar group_members
-- (user_id → auth.users) con profiles, algo que PostgREST no puede embeber
-- al no existir FK directa. Se expone una RPC SECURITY DEFINER que ya
-- valida la pertenencia del que llama.
-- ============================================================

-- ¿auth.uid() es el creador del grupo g?  SECURITY DEFINER para no recursar
-- la RLS de groups dentro de una policy de group_members.
create or replace function is_group_creator(g uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from groups where id = g and created_by = auth.uid()
  );
$$;

-- El creador puede expulsar a cualquier otro miembro (no a sí mismo: para
-- irse debe borrar el grupo). La autoexpulsión sigue cubierta por la policy
-- de "salir" para los invitados.
create policy "members remove by creator" on group_members for delete
  using (is_group_creator(group_id) and user_id <> auth.uid());

-- Lista de miembros del grupo con su username y si es el creador. El que
-- llama debe ser miembro (la RPC es SECURITY DEFINER y salta la RLS).
create or replace function list_group_members(g uuid)
returns table (user_id uuid, username text, role text, is_creator boolean, joined_at timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select m.user_id,
         p.username,
         m.role::text,
         (gr.created_by = m.user_id) as is_creator,
         m.joined_at
  from group_members m
  join groups gr on gr.id = m.group_id
  left join profiles p on p.id = m.user_id
  where m.group_id = g
    and is_group_member(g)
  order by (gr.created_by = m.user_id) desc, m.joined_at;
$$;

grant execute on function is_group_creator(uuid)   to authenticated;
grant execute on function list_group_members(uuid) to authenticated;
