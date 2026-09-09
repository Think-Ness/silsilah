// ============================================================
// Genealogy Domain Layer — Canvases Service (Multi-Canvas & Sharing)
// ============================================================

import { createClient } from "@/lib/supabase/client";
import {
  createCanvasAction,
  updateCanvasAction,
  deleteCanvasAction,
  saveCanvasPositionsAction,
} from "@/app/actions/canvasActions";
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

    // Periksa peran user & apakah akun Sigap
    let isSuperAdmin = false;
    let isSigap = false;
    if (currentUserId) {
      const { data: profile } = await sb
        .from("profiles")
        .select("full_name, role")
        .eq("id", currentUserId)
        .maybeSingle();

      if (profile?.role === "super_admin") {
        isSuperAdmin = true;
      }
      const fullName = (profile?.full_name || "").toLowerCase();
      const email = (userData?.user?.email || "").toLowerCase();
      if (fullName.includes("sigap") || email.includes("sigap")) {
        isSigap = true;
      }
    }

    // Jika user adalah Sigap, otomatis klaim/backfill kanvas yang belum memiliki owner_id
    if (isSigap && currentUserId) {
      sb.from("canvases")
        .update({ owner_id: currentUserId, created_by: currentUserId })
        .is("owner_id", null)
        .then(() => {});
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

    if (error) {
      console.warn("Supabase canvases query notice:", error);
    }

    let dbCanvases: Canvas[] = [];

    if (!error && data) {
      // Ambil shares info untuk user saat ini jika login
      let sharesMap = new Map<string, "edit" | "view">();
      if (currentUserId) {
        try {
          const { data: sharesData } = await sb
            .from("canvas_shares")
            .select("canvas_id, permission")
            .eq("user_id", currentUserId);

          if (sharesData) {
            for (const s of sharesData) {
              sharesMap.set(s.canvas_id, s.permission as "edit" | "view");
            }
          }
        } catch (e) {}

        const localUserSharesById = getLocalSharesForUser(currentUserId);
        for (const ls of localUserSharesById) {
          if (!sharesMap.has(ls.canvas_id)) {
            sharesMap.set(ls.canvas_id, ls.permission);
          }
        }
      }
      if (email) {
        const localUserSharesByEmail = getLocalSharesForUser(email);
        for (const ls of localUserSharesByEmail) {
          if (!sharesMap.has(ls.canvas_id)) {
            sharesMap.set(ls.canvas_id, ls.permission);
          }
        }
      }

      // Filter hak akses:
      // 1. Super Admin: melihat seluruh kanvas
      // 2. Akun Sigap: melihat seluruh kanvas keluarga miliknya / kanvas legacy
      // 3. User Lain: HANYA melihat kanvas miliknya sendiri (owner_id === currentUserId) atau yang dibagikan
      const visibleCanvases = (data as any[]).filter((c) => {
        if (isSuperAdmin) return true;
        if (isSigap) {
          if (!c.owner_id || c.owner_id === currentUserId) return true;
        }
        if (currentUserId && c.owner_id === currentUserId) return true;
        if (sharesMap.has(c.id)) return true;
        if (c.is_public === true) return true;
        return false;
      });

      dbCanvases = visibleCanvases.map((c) => {
        let user_permission: "owner" | "edit" | "view" = "view";
        if (isSuperAdmin || (currentUserId && c.owner_id === currentUserId) || (isSigap && !c.owner_id)) {
          user_permission = "owner";
        } else if (sharesMap.has(c.id)) {
          user_permission = sharesMap.get(c.id)!;
        }

        return {
          ...c,
          user_permission,
        } as Canvas;
      });
    }

    // Merge dengan kanvas lokal yang relevan untuk user saat ini
    const localList = getLocalCanvases();
    const localFiltered = localList.filter((c) => {
      if (isSuperAdmin) return true;
      if (isSigap) return !c.owner_id || c.owner_id === currentUserId;
      if (currentUserId && c.owner_id === currentUserId) return true;
      if (sharesMap.has(c.id)) return true;
      return false; // JANGAN tampilkan kanvas orang lain!
    });

    const dbIds = new Set(dbCanvases.map((c) => c.id));
    const merged = [...dbCanvases];
    for (const loc of localFiltered) {
      if (!dbIds.has(loc.id)) {
        let perm: "owner" | "edit" | "view" = "view";
        if (isSuperAdmin || (currentUserId && loc.owner_id === currentUserId) || (isSigap && !loc.owner_id)) {
          perm = "owner";
        } else if (sharesMap.has(loc.id)) {
          perm = sharesMap.get(loc.id)!;
        }
        merged.push({
          ...loc,
          user_permission: perm,
        });
      }
    }

    // Return hasil kanvas user saat ini
    if (merged.length > 0) {
      return merged;
    }

    // Jika user adalah Sigap atau Super Admin dan belum memiliki kanvas apapun, berikan kanvas default awal
    if (isSigap || isSuperAdmin) {
      return [
        {
          id: "default-canvas",
          title: "Pohon Silsilah Keluarga",
          description: "Pohon silsilah keluarga dan seluruh garis keturunan.",
          root_person_id: null,
          included_person_ids: null,
          is_default: true,
          owner_id: currentUserId || null,
          is_public: true,
          user_permission: "owner",
          settings: { displayMode: "branch" },
          custom_positions: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: currentUserId || null,
        },
      ];
    }

    // Untuk user baru (seperti Ahlan) yang belum membuat kanvas dan belum menerima share, return KOSONG []
    return [];
  } catch (err) {
    console.warn("Supabase canvases query notice:", err);
  }

  // Jika user adalah Sigap atau Super Admin, berikan fallback kanvas keluarga
  if (isSigap || isSuperAdmin) {
    const localList = getLocalCanvases();
    if (localList.length > 0) return localList;
    return [
      {
        id: "default-canvas",
        title: "Pohon Silsilah Keluarga",
        description: "Pohon silsilah keluarga dan seluruh garis keturunan.",
        root_person_id: null,
        included_person_ids: null,
        is_default: true,
        owner_id: null,
        is_public: true,
        user_permission: "owner",
        settings: { displayMode: "branch" },
        custom_positions: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
      },
    ];
  }

  return [];
}

/** Ambil satu kanvas berdasarkan ID */
export async function getCanvas(id: string, client?: any): Promise<Canvas | null> {
  if (id === "default-canvas") {
    return {
      id: "default-canvas",
      title: "Pohon Silsilah Keluarga",
      description: "Pohon silsilah keluarga dan seluruh garis keturunan.",
      root_person_id: null,
      included_person_ids: null,
      is_default: true,
      owner_id: null,
      is_public: true,
      user_permission: "owner",
      settings: { displayMode: "branch" },
      custom_positions: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
    };
  }

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

  // 1. Coba lewat Server Action terlebih dahulu untuk keandalan maksimal
  try {
    const res = await createCanvasAction(input);
    if (res.success && res.data) {
      const createdCanvas = res.data;
      const localList = getLocalCanvases();
      const updatedList = [
        ...localList.filter((c) => c.id !== createdCanvas.id),
        createdCanvas,
      ];
      saveLocalCanvases(updatedList);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("silsilah:canvases-updated", {
            detail: { canvasId: createdCanvas.id },
          })
        );
      }
      return createdCanvas;
    }
  } catch (e) {
    console.warn("createCanvasAction notice:", e);
  }

  // 2. Fallback direct client-side insert
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
        is_default: payload.is_default,
        owner_id: currentUserId,
        is_public: payload.is_public,
        settings: {
          ...payload.settings,
          included_person_ids: payload.included_person_ids,
        },
        custom_positions: payload.custom_positions,
        created_by: currentUserId,
      })
      .select("*")
      .single();

    if (!error && data) {
      createdCanvas = {
        ...data,
        included_person_ids: payload.included_person_ids,
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
  // 1. Coba Server Action
  try {
    const res = await updateCanvasAction(id, input);
    if (res.success && res.data) {
      const localList = getLocalCanvases();
      const idx = localList.findIndex((c) => c.id === id);
      if (idx !== -1) {
        localList[idx] = {
          ...localList[idx],
          ...res.data,
        };
        saveLocalCanvases(localList);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("silsilah:canvases-updated", {
            detail: { canvasId: id },
          })
        );
      }
      return res.data;
    }
  } catch (e) {
    console.warn("updateCanvasAction notice:", e);
  }

  // 2. Direct client fallback
  const sb = getClient(client);

  const updatePayload: any = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) updatePayload.title = input.title.trim();
  if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;
  if (input.root_person_id !== undefined) updatePayload.root_person_id = input.root_person_id;
  if (input.custom_positions !== undefined) updatePayload.custom_positions = input.custom_positions;
  if (input.settings !== undefined) updatePayload.settings = input.settings;
  if (input.is_default !== undefined) updatePayload.is_default = input.is_default;
  if (input.is_public !== undefined) updatePayload.is_public = input.is_public;

  if (input.included_person_ids !== undefined) {
    updatePayload.settings = {
      ...(updatePayload.settings || {}),
      included_person_ids: input.included_person_ids,
    };
  }

  let resultCanvas: Canvas | null = null;

  try {
    const { data, error } = await sb
      .from("canvases")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
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

  try {
    await saveCanvasPositionsAction(canvasId, positions);
  } catch (err) {
    const sb = getClient(client);
    try {
      await sb
        .from("canvases")
        .update({
          custom_positions: positions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", canvasId);
    } catch (e) {}
  }
}

/** Hapus kanvas */
export async function deleteCanvas(id: string, client?: any): Promise<boolean> {
  try {
    await deleteCanvasAction(id);
  } catch (err) {
    const sb = getClient(client);
    try {
      await sb.from("canvases").delete().eq("id", id);
    } catch (e) {}
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

// ============================================================
// CANVAS SHARING APIS & LOCAL FALLBACK
// ============================================================

const LOCAL_STORAGE_SHARES_PREFIX = "silsilah_canvas_shares_";
const LOCAL_STORAGE_USER_SHARES_KEY = "silsilah_user_shares_map_v1";

export function getLocalSharesForCanvas(canvasId: string): CanvasShare[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_SHARES_PREFIX}${canvasId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveLocalSharesForCanvas(canvasId: string, shares: CanvasShare[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_SHARES_PREFIX}${canvasId}`, JSON.stringify(shares));
  } catch (e) {}
}

export function getLocalSharesForUser(userIdOrEmail: string): Array<{ canvas_id: string; permission: "view" | "edit" }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_SHARES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed[userIdOrEmail.toLowerCase()] || [];
    }
  } catch (e) {}
  return [];
}

export function saveLocalShareForUser(userIdOrEmail: string, canvasId: string, permission: "view" | "edit") {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_SHARES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const key = userIdOrEmail.toLowerCase();
    const existing: Array<{ canvas_id: string; permission: "view" | "edit" }> = parsed[key] || [];
    const updated = [...existing.filter((s) => s.canvas_id !== canvasId), { canvas_id: canvasId, permission }];
    parsed[key] = updated;
    localStorage.setItem(LOCAL_STORAGE_USER_SHARES_KEY, JSON.stringify(parsed));
  } catch (e) {}
}

export function removeLocalShareForUser(userIdOrEmail: string, canvasId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_SHARES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const key = userIdOrEmail.toLowerCase();
      if (parsed[key]) {
        parsed[key] = (parsed[key] as any[]).filter((s) => s.canvas_id !== canvasId);
        localStorage.setItem(LOCAL_STORAGE_USER_SHARES_KEY, JSON.stringify(parsed));
      }
    }
  } catch (e) {}
}

/** Ambil daftar share untuk kanvas tertentu */
export async function getCanvasShares(canvasId: string, client?: any): Promise<CanvasShare[]> {
  const sb = getClient(client);

  let dbShares: CanvasShare[] = [];
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
      dbShares = data as CanvasShare[];
    }
  } catch (err) {
    console.warn("Failed to get canvas shares from DB:", err);
  }

  // Merge dengan local shares fallback
  const localShares = getLocalSharesForCanvas(canvasId);
  const dbUserIds = new Set(dbShares.map((s) => s.user_id));
  const merged = [...dbShares];
  for (const loc of localShares) {
    if (!dbUserIds.has(loc.user_id)) {
      merged.push(loc);
    }
  }

  return merged;
}

/** Bagikan kanvas ke user via email */
export async function shareCanvasByEmail(
  canvasId: string,
  email: string,
  permission: "view" | "edit" = "view",
  client?: any
): Promise<{ success: boolean; error?: string; data?: any }> {
  const sb = getClient(client);
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data: userData } = await sb.auth.getUser();
    const currentUserId = userData?.user?.id;
    const currentUserEmail = (userData?.user?.email || "").toLowerCase();

    if (currentUserEmail === cleanEmail) {
      return { success: false, error: "Anda adalah pemilik kanvas ini" };
    }

    // 1. Coba via Supabase RPC share_canvas_by_email terlebih dahulu
    try {
      const { data: rpcData, error: rpcError } = await sb.rpc("share_canvas_by_email", {
        p_canvas_id: canvasId,
        p_email: cleanEmail,
        p_permission: permission,
      });

      if (!rpcError && rpcData?.success) {
        const shareObj: CanvasShare = {
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
        };
        const localList = getLocalSharesForCanvas(canvasId);
        saveLocalSharesForCanvas(canvasId, [
          ...localList.filter((s) => s.user_id !== rpcData.user_id),
          shareObj,
        ]);
        saveLocalShareForUser(cleanEmail, canvasId, permission);
        if (rpcData.user_id) saveLocalShareForUser(rpcData.user_id, canvasId, permission);

        return { success: true, data: rpcData };
      }
    } catch (e) {}

    // 2. Fallback: Cari user profil berdasarkan email atau query users
    let targetUser: { id: string; full_name?: string; avatar_url?: string } | null = null;

    try {
      const { data: usersList } = await sb.rpc("admin_get_users_with_email");
      if (usersList) {
        const found = (usersList as any[]).find(
          (u) => (u.email || "").toLowerCase() === cleanEmail
        );
        if (found) {
          targetUser = { id: found.id, full_name: found.full_name, avatar_url: found.avatar_url };
        }
      }
    } catch (e) {}

    if (!targetUser) {
      try {
        const { data: profiles } = await sb.from("profiles").select("id, full_name, avatar_url");
        if (profiles) {
          const found = profiles.find((p: any) =>
            (p.full_name || "").toLowerCase().includes(cleanEmail.split("@")[0])
          );
          if (found) {
            targetUser = found;
          }
        }
      } catch (e) {}
    }

    const targetUserId = targetUser?.id || `user-${cleanEmail.replace(/[^a-zA-Z0-9]/g, "-")}`;
    const targetName = targetUser?.full_name || cleanEmail.split("@")[0];

    // Coba simpan ke DB
    try {
      if (targetUser?.id) {
        await sb.from("canvas_shares").upsert({
          canvas_id: canvasId,
          user_id: targetUser.id,
          permission,
          shared_by: currentUserId,
        });
      }
    } catch (e) {}

    // Simpan ke local storage
    const shareObj: CanvasShare = {
      id: `share-${Date.now()}`,
      canvas_id: canvasId,
      user_id: targetUserId,
      permission,
      shared_by: currentUserId || null,
      created_at: new Date().toISOString(),
      user_profile: {
        id: targetUserId,
        full_name: targetName,
        avatar_url: targetUser?.avatar_url || null,
      },
    };

    const localList = getLocalSharesForCanvas(canvasId);
    saveLocalSharesForCanvas(canvasId, [
      ...localList.filter((s) => s.user_id !== targetUserId),
      shareObj,
    ]);
    saveLocalShareForUser(cleanEmail, canvasId, permission);
    saveLocalShareForUser(targetUserId, canvasId, permission);

    return {
      success: true,
      data: {
        share_id: shareObj.id,
        user_id: targetUserId,
        email: cleanEmail,
        full_name: targetName,
        permission,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal membagikan kanvas" };
  }
}

/** Hapus izin share kanvas */
export async function removeCanvasShare(
  shareId: string,
  canvasId?: string,
  client?: any
): Promise<boolean> {
  const sb = getClient(client);

  try {
    await sb.from("canvas_shares").delete().eq("id", shareId);
  } catch (err) {
    console.warn("Failed to delete canvas share in Supabase:", err);
  }

  // Hapus dari local storage
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_STORAGE_SHARES_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed: CanvasShare[] = JSON.parse(raw);
            const filtered = parsed.filter((s) => s.id !== shareId);
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      }
    } catch (e) {}
  }

  return true;
}

/** Update izin share kanvas (view / edit) */
export async function updateCanvasShare(
  shareId: string,
  permission: "view" | "edit",
  client?: any
): Promise<boolean> {
  const sb = getClient(client);

  try {
    await sb
      .from("canvas_shares")
      .update({ permission })
      .eq("id", shareId);
  } catch (err) {
    console.warn("Failed to update canvas share:", err);
  }

  // Update di local storage
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_STORAGE_SHARES_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed: CanvasShare[] = JSON.parse(raw);
            const updated = parsed.map((s) => (s.id === shareId ? { ...s, permission } : s));
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
    } catch (e) {}
  }

  return true;
}
