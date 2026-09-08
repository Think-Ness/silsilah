// ============================================================
// Admin: User Management — Server Actions
// ============================================================
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Re-export types from types.ts so they're available from this module
export type { UserRole, Profile, Invitation, PendingChange } from "./types";
import type { UserRole, Profile, Invitation, PendingChange } from "./types";

// ============================================================
// PROFILES
// ============================================================

/** List all profiles — super_admin only */
export async function listProfiles(): Promise<{
  profiles: Profile[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return { profiles: [], error: error.message };

  // Fetch emails separately via a custom RPC or admin API
  // Since we can't use admin API on anon key, we'll use a join approach
  // For now return what we have
  return { profiles: (data as Profile[]) ?? [], error: null };
}

/** Update a user's role — super_admin only */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // Verify current user is super_admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!myProfile || myProfile.role !== "super_admin") {
    return { error: "Hanya Super Admin yang dapat mengubah peran pengguna" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { error: null };
}

/** Toggle user active status — super_admin only */
export async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!myProfile || myProfile.role !== "super_admin") {
    return { error: "Hanya Super Admin yang dapat mengubah status pengguna" };
  }

  // Cannot deactivate yourself
  if (userId === user.id) {
    return { error: "Tidak dapat menonaktifkan akun Anda sendiri" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { error: null };
}

// ============================================================
// INVITATIONS
// ============================================================

/** List all invitations — super_admin only */
export async function listInvitations(): Promise<{
  invitations: Invitation[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { invitations: [], error: error.message };
  return { invitations: (data as Invitation[]) ?? [], error: null };
}

/** Create a new invitation — super_admin only */
export async function createInvitation(
  email: string,
  role: UserRole,
  message?: string
): Promise<{ invitation: Invitation | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { invitation: null, error: "Tidak terautentikasi" };

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!myProfile || myProfile.role !== "super_admin") {
    return { invitation: null, error: "Hanya Super Admin yang dapat mengundang pengguna" };
  }

  // Check if active invitation already exists for this email
  const { data: existing } = await supabase
    .from("invitations")
    .select("id")
    .eq("email", email.toLowerCase())
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (existing) {
    return { invitation: null, error: "Undangan aktif sudah ada untuk email ini" };
  }

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      email: email.toLowerCase(),
      role,
      message,
      invited_by: user.id,
    })
    .select()
    .single();

  if (error) return { invitation: null, error: error.message };

  revalidatePath("/admin/users");
  return { invitation: data as Invitation, error: null };
}

/** Revoke an invitation — super_admin only */
export async function revokeInvitation(
  invitationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { error: null };
}

/** Accept invitation — public, by token */
export async function getInvitationByToken(
  token: string
): Promise<{ invitation: Invitation | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) {
    return { invitation: null, error: "Undangan tidak valid atau telah kadaluarsa" };
  }

  return { invitation: data as Invitation, error: null };
}

/** Mark invitation as accepted and update profile role */
export async function acceptInvitation(
  token: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: inv, error: invError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (invError || !inv) {
    return { error: "Undangan tidak valid atau telah kadaluarsa" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Silakan login terlebih dahulu" };

  // Mark invitation as accepted
  await supabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inv.id);

  // Update profile role
  await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      role: inv.role,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

  return { error: null };
}

// ============================================================
// PENDING CHANGES
// ============================================================

/** List pending changes — super_admin sees all, family_member sees own */
export async function listPendingChanges(status?: string): Promise<{
  changes: PendingChange[];
  error: string | null;
}> {
  const supabase = await createClient();
  let query = supabase
    .from("pending_changes")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return { changes: [], error: error.message };
  return { changes: (data as PendingChange[]) ?? [], error: null };
}

/** Count pending changes — for badge */
export async function countPendingChanges(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("pending_changes")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

/** Submit a change for approval (family_member) */
export async function submitPendingChange(input: {
  entity_type: "person" | "union" | "relationship" | "media";
  entity_id?: string;
  action: "create" | "update" | "delete" | "archive";
  proposed_data: Record<string, unknown>;
  current_data?: Record<string, unknown>;
  change_summary?: string;
}): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { id: null, error: "Tidak terautentikasi" };

  const { data, error } = await supabase
    .from("pending_changes")
    .insert({
      ...input,
      submitted_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

/** Review a pending change (approve/reject) — super_admin only */
export async function reviewPendingChange(
  changeId: string,
  action: "approved" | "rejected",
  reviewNote?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!myProfile || myProfile.role !== "super_admin") {
    return { error: "Hanya Super Admin yang dapat mereview perubahan" };
  }

  const { error } = await supabase
    .from("pending_changes")
    .update({
      status: action,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", changeId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  // If approved, apply the change
  if (action === "approved") {
    await supabase.rpc("apply_pending_change", { change_id: changeId });
  }

  revalidatePath("/admin/approvals");
  revalidatePath("/people");
  return { error: null };
}

// ============================================================
// CURRENT USER PROFILE
// ============================================================

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) return null;
  return { ...data, email: user.email } as Profile;
}
