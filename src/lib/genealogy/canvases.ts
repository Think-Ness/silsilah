// ============================================================
// Genealogy Domain Layer — Canvases Service (Multi-Canvas & Sharing)
// ============================================================

import { createClient } from "@/lib/supabase/client";
import type {
  Canvas,
  CanvasShare,
  CreateCanvasInput,
  UpdateCanvasInput,
} from "@/types/genealogy";

const supabase = createClient();

const LOCAL_STORAGE_CANVASES_KEY = "silsilah_canvases_list_v1";

function getClient(client?: any) {
  return client || supabase;
}

/** Ambil daftar kanvas dari localStorage jika Supabase belum termigrasi atau offline */
function getLocalCanvases(): Canvas[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CANVASES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Gagal membaca kanvas lokal:", e);
  }
  return [];
}

function saveLocalCanvases(canvases: Canvas[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_CANVASES_KEY, JSON.stringify(canvases));
  } catch (e) {
    console.warn("Gagal menyimpan kanvas lokal:", e);
  }
}

/** Ambil semua daftar kanvas yang dapat diakses oleh user saat ini */
export async function getAllCanvases(client?: any): Promise<Canvas[]> {
  const sb = getClient(client);

  try {
    const { data: userData } = await sb.auth.getUser();
    const currentUserId = userData?.user?.id;

    // Periksa apakah user saat ini adalah super_admin
    let isSuperAdmin = false;
    if (currentUserId) {
      const { data: profile } = await sb
        .from("profiles")
        .select("role")
        .eq("id", currentUserId)
        .maybeSingle();

      if (profile?.role === "super_admin") {
        isSuperAdmin = true;
      }
    }

    const { data, error } = await sb
      .from("canvases")
      .select(`
        *,
        root_person:people!canvases_root_person_id_fkey(
          id, full_name, display_name, gender, life_status,
          portrait:media!people_portrait_media_fk(id, storage_path, storage_bucket)
        )
      `)
      .order("created_at", { ascending: true });

    if (!error && data) {
      // Ambil shares info untuk user saat ini jika login
      let sharesMap = new Map<string, "edit" | "view">();
      if (currentUserId) {
        const { data: sharesData } = await sb
          .from("canvas_shares")
          .select("canvas_id, permission")
          .eq("user_id", currentUserId);

        if (sharesData) {
          for (const s of sharesData) {
            sharesMap.set(s.canvas_id, s.permission as "edit" | "view");
          }
        }
      }

      // Filter hak akses:
      // 1. Super Admin: melihat seluruh kanvas
      // 2. User Biasa: hanya melihat kanvas miliknya (owner_id === currentUserId), yang di-share kepadanya, atau yang publik
      const visibleCanvases = (data as any[]).filter((c) => {
        if (isSuperAdmin) return true;
        if (currentUserId && c.owner_id === currentUserId) return true;
        if (sharesMap.has(c.id)) return true;
        if (c.is_public === true) return true;
        return false;
      });

      const dbCanvases = visibleCanvases.map((c) => {
        let user_permission: "owner" | "edit" | "view" = "view";
        if (isSuperAdmin || (currentUserId && c.owner_id === currentUserId) || (!c.owner_id && isSuperAdmin)) {
          user_permission = "owner";
        } else if (sharesMap.has(c.id)) {
          user_permission = sharesMap.get(c.id)!;
        }

        return {
          ...c,
          user_permission,
        } as Canvas;
      });

      return dbCanvases;
    }
  } catch (err) {
    console.warn("Supabase canvases query failed:", err);
  }

  return [];
}

/** Ambil satu kanvas berdasarkan ID */
export async function getCanvas(id: string, client?: any): Promise<Canvas | null> {
  const sb = getClient(client);

  try {
    const { data: userData } = await sb.auth.getUser();
    const currentUserId = userData?.user?.id;

    const { data, error } = await sb
      .from("canvases")
      .select(`
        *,
        root_person:people!canvases_root_person_id_fkey(
          id, full_name, display_name, gender, life_status,
          portrait:media!people_portrait_media_fk(id, storage_path, storage_bucket)
        )
      `)
      .eq("id", id)
      .single();

    if (!error && data) {
      let user_permission: "owner" | "edit" | "view" = "view";
      if (!data.owner_id || data.owner_id === currentUserId) {
        user_permission = "owner";
      } else if (currentUserId) {
        const { data: shareData } = await sb
          .from("canvas_shares")
          .select("permission")
          .eq("canvas_id", id)
          .eq("user_id", currentUserId)
          .single();

        if (shareData) {
          user_permission = shareData.permission as "edit" | "view";
        }
      }

      return {
        ...data,
        user_permission,
      } as Canvas;
    }
  } catch (err) {
    console.warn("Get canvas Supabase failed, searching local fallback:", err);
  }

  const localList = getLocalCanvases();
  return localList.find((c) => c.id === id) || null;
}

/** Buat kanvas silsilah baru */
export async function createCanvas(
  input: CreateCanvasInput,
  client?: any
): Promise<Canvas> {
  const sb = getClient(client);
  const { data: userData } = await sb.auth.getUser();
  const currentUserId = userData?.user?.id || null;

  const newCanvasId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `canvas-${Date.now()}`;

  const payload: Canvas = {
    id: newCanvasId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    root_person_id: input.root_person_id || null,
    included_person_ids:
      input.included_person_ids !== undefined
        ? input.included_person_ids
        : input.root_person_id
        ? [input.root_person_id]
        : null,
    is_default: input.is_default ?? false,
    owner_id: currentUserId,
    is_public: input.is_public ?? false,
    user_permission: "owner",
    settings: input.settings || { displayMode: "branch" },
    custom_positions: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: currentUserId,
  };

  let createdCanvas: Canvas = payload;

  try {
    const { data, error } = await sb
      .from("canvases")
      .insert({
        title: payload.title,
        description: payload.description,
        root_person_id: payload.root_person_id,
        included_person_ids: payload.included_person_ids,
        is_default: payload.is_default,
        owner_id: currentUserId,
        is_public: payload.is_public,
        settings: payload.settings,
        custom_positions: payload.custom_positions,
        created_by: currentUserId,
      })
      .select(`
        *,
        root_person:people!canvases_root_person_id_fkey(
          id, full_name, display_name, gender, life_status,
          portrait:media!people_portrait_media_fk(id, storage_path, storage_bucket)
        )
      `)
      .single();

    if (!error && data) {
      createdCanvas = {
        ...data,
        user_permission: "owner",
      } as Canvas;
    }
  } catch (err) {
    console.warn("Supabase insert canvas failed, stored locally:", err);
  }

  // Update local storage
  const localList = getLocalCanvases();
  const updatedList = [
    ...localList.filter((c) => c.id !== createdCanvas.id),
    createdCanvas,
  ];
  saveLocalCanvases(updatedList);

  // Trigger browser event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("silsilah:canvases-updated", {
        detail: { canvasId: createdCanvas.id },
      })
    );
  }

  return createdCanvas;
}

/** Perbarui data kanvas */
export async function updateCanvas(
  id: string,
  input: UpdateCanvasInput,
  client?: any
): Promise<Canvas | null> {
  const sb = getClient(client);

  const updatePayload: any = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) updatePayload.title = input.title.trim();
  if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;
  if (input.root_person_id !== undefined) updatePayload.root_person_id = input.root_person_id;
  if (input.included_person_ids !== undefined) updatePayload.included_person_ids = input.included_person_ids;
  if (input.custom_positions !== undefined) updatePayload.custom_positions = input.custom_positions;
  if (input.settings !== undefined) updatePayload.settings = input.settings;
  if (input.is_default !== undefined) updatePayload.is_default = input.is_default;
  if (input.is_public !== undefined) updatePayload.is_public = input.is_public;

  let resultCanvas: Canvas | null = null;

  try {
    const { data, error } = await sb
      .from("canvases")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        *,
        root_person:people!canvases_root_person_id_fkey(
          id, full_name, display_name, gender, life_status,
          portrait:media!people_portrait_media_fk(id, storage_path, storage_bucket)
        )
      `)
      .single();

    if (!error && data) {
      resultCanvas = data as Canvas;
    }
  } catch (err) {
    console.warn("Supabase update canvas failed:", err);
  }

  // Sync to local storage
  const localList = getLocalCanvases();
  const idx = localList.findIndex((c) => c.id === id);
  if (idx !== -1) {
    localList[idx] = {
      ...localList[idx],
      ...updatePayload,
      ...(resultCanvas || {}),
    };
    saveLocalCanvases(localList);
    if (!resultCanvas) resultCanvas = localList[idx];
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("silsilah:canvases-updated", {
        detail: { canvasId: id },
      })
    );
  }

  return resultCanvas;
}

/** Simpan anggota yang dimasukkan ke kanvas */
export async function saveCanvasIncludedPersons(
  canvasId: string,
  includedPersonIds: string[] | null,
  client?: any
): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      if (includedPersonIds) {
        localStorage.setItem(
          `silsilah_canvas_included_${canvasId}`,
          JSON.stringify(includedPersonIds)
        );
      } else {
        localStorage.removeItem(`silsilah_canvas_included_${canvasId}`);
      }
    } catch (e) {}
  }

  await updateCanvas(canvasId, { included_person_ids: includedPersonIds }, client);
}

/** Simpan posisi node khusus untuk kanvas tertentu */
export async function saveCanvasPositions(
  canvasId: string,
  positions: Record<string, { x: number; y: number }>,
  client?: any
): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        `silsilah_canvas_positions_${canvasId}`,
        JSON.stringify(positions)
      );
    } catch (e) {}
  }

  // Update daftar kanvas lokal
  const localList = getLocalCanvases();
  const idx = localList.findIndex((c) => c.id === canvasId);
  if (idx !== -1) {
    localList[idx] = {
      ...localList[idx],
      custom_positions: positions,
      updated_at: new Date().toISOString(),
    };
    saveLocalCanvases(localList);
  }

  const sb = getClient(client);
  try {
    await sb
      .from("canvases")
      .update({
        custom_positions: positions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", canvasId);
  } catch (err) {
    // Non-blocking background save
  }
}

/** Hapus kanvas */
export async function deleteCanvas(id: string, client?: any): Promise<boolean> {
  const sb = getClient(client);

  try {
    const { error } = await sb.from("canvases").delete().eq("id", id);
    if (error) throw error;
  } catch (err) {
    console.warn("Supabase delete canvas failed:", err);
  }

  const localList = getLocalCanvases();
  const updatedList = localList.filter((c) => c.id !== id);
  saveLocalCanvases(updatedList);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("silsilah:canvases-updated", {
        detail: { canvasId: id, deleted: true },
      })
    );
  }

  return true;
}

// ============================================================
// CANVAS SHARING APIS
// ============================================================

/** Ambil daftar share untuk kanvas tertentu */
export async function getCanvasShares(canvasId: string, client?: any): Promise<CanvasShare[]> {
  const sb = getClient(client);

  try {
    const { data, error } = await sb
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
    console.warn("Failed to get canvas shares:", err);
  }

  return [];
}

/** Bagikan kanvas ke user via email menggunakan Supabase RPC */
export async function shareCanvasByEmail(
  canvasId: string,
  email: string,
  permission: "view" | "edit" = "view",
  client?: any
): Promise<{ success: boolean; error?: string; data?: any }> {
  const sb = getClient(client);

  try {
    const { data, error } = await sb.rpc("share_canvas_by_email", {
      p_canvas_id: canvasId,
      p_email: email.trim().toLowerCase(),
      p_permission: permission,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data && !data.success) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal membagikan kanvas" };
  }
}

/** Hapus izin share kanvas */
export async function removeCanvasShare(shareId: string, client?: any): Promise<boolean> {
  const sb = getClient(client);

  try {
    const { error } = await sb.from("canvas_shares").delete().eq("id", shareId);
    if (!error) return true;
  } catch (err) {
    console.warn("Failed to delete canvas share:", err);
  }

  return false;
}

/** Update izin share kanvas (view / edit) */
export async function updateCanvasShare(
  shareId: string,
  permission: "view" | "edit",
  client?: any
): Promise<boolean> {
  const sb = getClient(client);

  try {
    const { error } = await sb
      .from("canvas_shares")
      .update({ permission })
      .eq("id", shareId);
    if (!error) return true;
  } catch (err) {
    console.warn("Failed to update canvas share:", err);
  }

  return false;
}
