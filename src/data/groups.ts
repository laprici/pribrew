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

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    enabled: !!groupId,
    queryKey: ["group_members", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, user_id, role, joined_at")
        .eq("group_id", groupId!);
      if (error) throw error;
      return data ?? [];
    },
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
