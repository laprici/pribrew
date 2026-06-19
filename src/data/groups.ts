import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Group } from "@/domain/group.schema";

export function useMyGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async (): Promise<Group[]> => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type GroupMemberRow = {
  user_id: string;
  username: string | null;
  role: "owner" | "admin" | "member";
  is_creator: boolean;
  joined_at: string;
};

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    enabled: !!groupId,
    queryKey: ["group_members", groupId],
    queryFn: async (): Promise<GroupMemberRow[]> => {
      const { data, error } = await supabase.rpc("list_group_members", { g: groupId! });
      if (error) throw error;
      return (data ?? []) as GroupMemberRow[];
    },
  });
}

/** Salir de un grupo: borra la propia membresía. */
export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/** Expulsar a un miembro (sólo el creador). */
export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_d, { groupId }) =>
      qc.invalidateQueries({ queryKey: ["group_members", groupId] }),
  });
}

/** Eliminar el grupo entero (sólo el creador). */
export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<string> => {
      const { data, error } = await supabase.rpc("create_group", { group_name: name });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useCreateInvitation() {
  return useMutation({
    mutationFn: async (groupId: string): Promise<string> => {
      const { data, error } = await supabase
        .from("group_invitations")
        .insert({ group_id: groupId })
        .select("token")
        .single();
      if (error) throw error;
      return data.token as string;
    },
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string): Promise<string> => {
      const { data, error } = await supabase.rpc("accept_invitation", {
        invite_token: token,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: ["invitation_preview", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("invitation_preview", { invite_token: token })
        .maybeSingle();
      if (error) throw error;
      return data as { group_id: string; group_name: string; valid: boolean } | null;
    },
  });
}
