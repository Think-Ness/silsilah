import { notFound, redirect } from "next/navigation";
import { getPerson } from "@/lib/genealogy/people";
import PersonEditForm from "./PersonEditForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cleanId = decodeURIComponent(id).trim().replace(/[\s_]+/g, "-");
  const supabase = await createClient();
  const person = await getPerson(cleanId, supabase);

  if (!person) {
    notFound();
  }

  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData?.user?.id;
  if (!currentUserId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUserId)
    .maybeSingle();

  const isSuperAdmin = profile?.role === "super_admin";
  const isOwner = !person.created_by || person.created_by === currentUserId;

  let canEdit = isSuperAdmin || isOwner;
  if (!canEdit) {
    const { data: editShares } = await supabase
      .from("canvas_shares")
      .select("permission")
      .eq("user_id", currentUserId)
      .eq("permission", "edit");
    if (editShares && editShares.length > 0) {
      canEdit = true;
    }
  }

  if (!canEdit) {
    redirect(`/people/${cleanId}`);
  }

  return <PersonEditForm person={person} />;
}
