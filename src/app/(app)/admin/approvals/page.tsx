import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listPendingChanges } from "@/lib/admin/users";
import { ApprovalsClient } from "./ApprovalsClient";

export const metadata = {
  title: "Persetujuan Perubahan | Silsilah Keluarga",
};

export default async function AdminApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!myProfile || myProfile.role !== "super_admin") {
    redirect("/");
  }

  const [
    { changes: pendingChanges },
    { changes: approvedChanges },
    { changes: rejectedChanges },
  ] = await Promise.all([
    listPendingChanges("pending"),
    listPendingChanges("approved"),
    listPendingChanges("rejected"),
  ]);

  return (
    <ApprovalsClient
      pendingChanges={pendingChanges}
      approvedChanges={approvedChanges.slice(0, 20)}
      rejectedChanges={rejectedChanges.slice(0, 20)}
      currentUserId={user.id}
    />
  );
}
