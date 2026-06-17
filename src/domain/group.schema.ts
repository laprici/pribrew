import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1, "Ponle un nombre al grupo"),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export type Group = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
};
