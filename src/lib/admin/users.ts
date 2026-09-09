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

  // 1. Coba gunakan RPC admin_get_users_with_email untuk mendapatkan email nyata
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_users_with_email");
    if (!rpcError && rpcData && rpcData.length > 0) {
      return { profiles: rpcData as Profile[], error: null };
    }
  } catch (err) {
    // Fallback below
  }

  // 2. Fallback jika RPC belum ada
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return { profiles: [], error: error.message };

  return { profiles: (data as Profile[]) ?? [], error: null };
}

/** Update user profile (Name, Role, Status, Linked Person) — super_admin only */
export async function updateUserProfile(
  userId: string,
  input: {
    full_name?: string;
    role?: UserRole;
    is_active?: boolean;
    person_id?: string | null;
  }
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
    return { error: "Hanya Super Admin yang dapat mengubah data pengguna" };
  }

  // Coba panggil RPC admin_update_user_profile
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_update_user_profile", {
      p_user_id: userId,
      p_full_name: input.full_name ?? null,
      p_role: input.role ?? null,
      p_is_active: input.is_active ?? null,
      p_person_id: input.person_id ?? null,
    });

    if (!rpcErr && rpcRes) {
      if (!rpcRes.success) return { error: rpcRes.error || "Gagal memperbarui pengguna" };
      revalidatePath("/admin/users");
      return { error: null };
    }
  } catch (err) {
    // Fallback to direct update
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (input.full_name !== undefined) updateData.full_name = input.full_name;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  if (input.person_id !== undefined) updateData.person_id = input.person_id;

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { error: null };
}

/** Delete a user account — super_admin only */
export async function deleteUser(userId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  if (userId === user.id) {
    return { error: "Anda tidak dapat menghapus akun Anda sendiri" };
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!myProfile || myProfile.role !== "super_admin") {
    return { error: "Hanya Super Admin yang dapat menghapus pengguna" };
  }

  // Coba panggil RPC admin_delete_user
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_delete_user", {
      p_user_id: userId,
    });

    if (!rpcErr && rpcRes) {
      if (!rpcRes.success) return { error: rpcRes.error || "Gagal menghapus pengguna" };
      revalidatePath("/admin/users");
      return { error: null };
    }
  } catch (err) {
    // Fallback to table delete
  }

  const { error: profileDeleteErr } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileDeleteErr) return { error: profileDeleteErr.message };

  revalidatePath("/admin/users");
  return { error: null };
}

/** Update a user's role — super_admin only */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<{ error: string | null }> {
  return updateUserProfile(userId, { role });
}

/** Toggle user active status — super_admin only */
export async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  return updateUserProfile(userId, { is_active: isActive });
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
  token: string,
  userId?: string,
  fullName?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // 1. Coba panggil RPC accept_user_invitation jika migrasi 011 sudah dijalankan
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("accept_user_invitation", {
      p_token: token,
      p_user_id: userId || null,
      p_full_name: fullName || null,
    });

    if (!rpcError && rpcData) {
      if (!rpcData.success) {
        return { error: rpcData.error || "Undangan tidak valid" };
      }
      revalidatePath("/admin/users");
      return { error: null };
    }
  } catch (rpcErr) {
    console.warn("RPC accept_user_invitation failed or not installed, falling back to direct table update:", rpcErr);
  }

  // 2. Fallback jika RPC belum ada: update langsung tabel invitations & profiles
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

  // Cari user id dari argumen atau session
  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    targetUserId = user?.id;
  }

  if (!targetUserId) {
    return { error: "Akun belum terdaftar atau silakan login terlebih dahulu" };
  }

  // Tandai undangan diterima
  await supabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inv.id);

  // Perbarui atau buat profil dengan peran undangan
  await supabase
    .from("profiles")
    .upsert({
      id: targetUserId,
      full_name: fullName || inv.email.split("@")[0],
      role: inv.role,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

  revalidatePath("/admin/users");
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
  const { profile } = await getOrBootstrapUserProfile(supabase);
  return profile;
}

/**
 * Ensures the logged-in user has a profile and has appropriate role.
 * - If profiles table is not created yet, reports TABLE_NOT_FOUND.
 * - If no super_admin exists in profiles, or if this user is the only user, promotes them to super_admin.
 * - If profile does not exist yet for user, creates it with super_admin (if first) or family_member.
 */
export async function getOrBootstrapUserProfile(supabaseClient?: any): Promise<{
  profile: Profile | null;
  user: any;
  error: string | null;
}> {
  const supabase = supabaseClient || (await createClient());
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { profile: null, user: null, error: "Unauthenticated" };
  }

  try {
    // 1. Try to read current profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      if (profileErr.code === "42P01" || profileErr.message?.includes("does not exist")) {
        return { profile: null, user, error: "TABLE_NOT_FOUND" };
      }
    }

    if (profile) {
      // Profil sudah ada di database, gunakan role yang tersimpan tanpa mengubahnya
      return { profile: { ...profile, email: user.email } as Profile, user, error: null };
    }

    // 2. Profile belum ada: periksa apakah ini pengguna pertama sama sekali
    const { count: totalProfiles } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const isFirstUser = !totalProfiles || totalProfiles === 0;
    const roleToAssign: UserRole = isFirstUser
      ? "super_admin"
      : ((user.user_metadata?.role as UserRole) || "family_member");

    const newProfileData = {
      id: user.id,
      full_name:
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Pengguna",
      avatar_url: user.user_metadata?.avatar_url || null,
      role: roleToAssign,
      is_active: true,
    };

    const { data: createdProfile, error: insertErr } = await supabase
      .from("profiles")
      .upsert(newProfileData)
      .select()
      .single();

    if (insertErr) {
      console.warn("Bootstrap upsert profile returned error:", insertErr);
    }

    return {
      profile: {
        ...(createdProfile || newProfileData),
        email: user.email,
        created_at: createdProfile?.created_at || new Date().toISOString(),
        updated_at: createdProfile?.updated_at || new Date().toISOString(),
      } as Profile,
      user,
      error: null,
    };
  } catch (err: any) {
    console.error("Error in getOrBootstrapUserProfile:", err);
    return { profile: null, user, error: err?.message || "Unknown error" };
  }
}

/** Explicitly promote current user to super_admin (for first-time owner setup) */
export async function claimSuperAdminRole(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin",
      role: "super_admin",
      is_active: true,
      updated_at: new Date().toISOString(),
    });

  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  revalidatePath("/admin/approvals");
  return { error: null };
}
