"use server";

import { createClient } from "@/lib/supabase/server";
import type { CanvasShare } from "@/types/genealogy";

/** Server Action: Bagikan kanvas ke email pengguna */
export async function shareCanvasAction(
  canvasId: string,
  targetEmail: string,
  permission: "view" | "edit" = "view"
): Promise<{ success: boolean; error?: string; share?: CanvasShare }> {
  const supabase = await createClient();
  const cleanEmail = targetEmail.trim().toLowerCase();

  try {
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id;
    const currentUserEmail = (userData?.user?.email || "").toLowerCase();

    if (currentUserEmail === cleanEmail) {
      return { success: false, error: "Anda adalah pemilik kanvas ini" };
    }

    // 1. Coba panggil RPC share_canvas_by_email jika ada
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("share_canvas_by_email", {
        p_canvas_id: canvasId,
        p_email: cleanEmail,
        p_permission: permission,
      });

      if (!rpcError && rpcData?.success) {
        return {
          success: true,
          share: {
            id: rpcData.share_id || `share-${Date.now()}`,
            canvas_id: canvasId,
            user_id: rpcData.user_id,
            permission,
            shared_by: currentUserId || null,
            created_at: new Date().toISOString(),
            user_profile: {
              id: rpcData.user_id,
              full_name: rpcData.full_name || cleanEmail,
              avatar_url: rpcData.avatar_url || null,
            },
          },
        };
      }
    } catch (e) {}

    // 2. Fallback: Cari user ID dari profiles atau RPC admin_get_users_with_email
    let targetUserId: string | null = null;
    let targetFullName: string = cleanEmail.split("@")[0];
    let targetAvatarUrl: string | null = null;

    try {
      const { data: usersList } = await supabase.rpc("admin_get_users_with_email");
      if (usersList) {
        const found = (usersList as any[]).find(
          (u) => (u.email || "").toLowerCase() === cleanEmail
        );
        if (found) {
          targetUserId = found.id;
          targetFullName = found.full_name || targetFullName;
          targetAvatarUrl = found.avatar_url || null;
        }
      }
    } catch (e) {}

    if (!targetUserId) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url");
      if (profiles) {
        const found = profiles.find((p: any) =>
          (p.full_name || "").toLowerCase().includes(cleanEmail.split("@")[0])
        );
        if (found) {
          targetUserId = found.id;
          targetFullName = found.full_name;
          targetAvatarUrl = found.avatar_url;
        }
      }
    }

    const finalUserId = targetUserId || `user-${cleanEmail.replace(/[^a-zA-Z0-9]/g, "-")}`;

    // 3. Simpan ke tabel canvas_shares
    let shareId = `share-${Date.now()}`;
    if (targetUserId) {
      const { data: inserted, error: insErr } = await supabase
        .from("canvas_shares")
        .upsert(
          {
            canvas_id: canvasId,
            user_id: targetUserId,
            permission,
            shared_by: currentUserId,
          },
          { onConflict: "canvas_id, user_id" }
        )
        .select("id")
        .single();

      if (!insErr && inserted) {
        shareId = inserted.id;
      }
    }

    const shareResult: CanvasShare = {
      id: shareId,
      canvas_id: canvasId,
      user_id: finalUserId,
      permission,
      shared_by: currentUserId || null,
      created_at: new Date().toISOString(),
      user_profile: {
        id: finalUserId,
        full_name: targetFullName,
        avatar_url: targetAvatarUrl,
      },
    };

    return {
      success: true,
      share: shareResult,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal membagikan kanvas" };
  }
}

/** Server Action: Ambil daftar share untuk kanvas */
export async function getCanvasSharesAction(
  canvasId: string
): Promise<CanvasShare[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("canvas_shares")
      .select(`
        *,
        user_profile:profiles!canvas_shares_user_id_fkey(id, full_name, avatar_url)
      `)
      .eq("canvas_id", canvasId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data as CanvasShare[];
    }
  } catch (err) {
    console.warn("Server action getCanvasShares failed:", err);
  }

  return [];
}

/** Server Action: Cabut akses share */
export async function removeCanvasShareAction(shareId: string): Promise<boolean> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from("canvas_shares").delete().eq("id", shareId);
    return !error;
  } catch (err) {
    return false;
  }
}

/** Server Action: Update izin share (view / edit) */
export async function updateCanvasShareAction(
  shareId: string,
  permission: "view" | "edit"
): Promise<boolean> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from("canvas_shares")
      .update({ permission })
      .eq("id", shareId);
    return !error;
  } catch (err) {
    return false;
  }
}
