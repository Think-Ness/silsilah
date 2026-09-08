import { listProfiles, listInvitations } from "@/lib/admin/users";
import type { Profile, Invitation } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserManagementClient } from "./UserManagementClient";

export const metadata = {
  title: "Manajemen Pengguna | Silsilah Keluarga",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get current user's profile + role
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Only super_admin can access this page
  if (!myProfile || myProfile.role !== "super_admin") {
    redirect("/");
  }

  const [{ profiles }, { invitations }] = await Promise.all([
    listProfiles(),
    listInvitations(),
  ]);

  return (
    <UserManagementClient
      currentUserId={user.id}
      currentUserEmail={user.email ?? ""}
      profiles={profiles}
      invitations={invitations}
    />
  );
}
