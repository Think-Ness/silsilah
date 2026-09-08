// ============================================================
// Genealogy Domain Layer — Canvases Service (Multi-Canvas)
// ============================================================

import { createClient } from "@/lib/supabase/client";
import type {
  Canvas,
  CreateCanvasInput,
  UpdateCanvasInput,
  PersonWithPortrait,
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

/** Ambil semua daftar kanvas */
export async function getAllCanvases(client?: any): Promise<Canvas[]> {
  const sb = getClient(client);

  try {
    const { data, error } = await sb
      .from("canvases")
      .select(`
        *,
        root_person:people!canvases_root_person_id_fkey(
          id, full_name, display_name, gender, life_status,
          portrait:media!people_portrait_media_fk(id, storage_path, storage_bucket)
        )
      `)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      const dbCanvases = data as Canvas[];
      saveLocalCanvases(dbCanvases);
      return dbCanvases;
    }
  } catch (err) {
    console.warn("Supabase canvases query failed, using local fallback:", err);
  }

  // Fallback: Local Storage atau Buat Default Canvas
  const localList = getLocalCanvases();
  if (localList.length > 0) {
    return localList;
  }

  // Initial default canvas fallback
  const defaultCanvas: Canvas = {
    id: "default-canvas",
    title: "Silsilah Zuriat Ahlan & Hj. Siti Maskah",
    description: "Pohon silsilah zuriat keluarga besar Ahlan & Hj. Siti Maskah beserta seluruh keturunan.",
    root_person_id: null,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveLocalCanvases([defaultCanvas]);
  return [defaultCanvas];
}

/** Ambil satu kanvas berdasarkan ID */
export async function getCanvas(id: string, client?: any): Promise<Canvas | null> {
  const sb = getClient(client);

  try {
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
      return data as Canvas;
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

  const newCanvasId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `canvas-${Date.now()}`;

  const payload = {
    id: newCanvasId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    root_person_id: input.root_person_id || null,
    is_default: input.is_default ?? false,
    settings: input.settings || { displayMode: "branch" },
    custom_positions: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
        settings: payload.settings,
        custom_positions: payload.custom_positions,
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
      createdCanvas = data as Canvas;
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
  if (input.custom_positions !== undefined) updatePayload.custom_positions = input.custom_positions;
  if (input.settings !== undefined) updatePayload.settings = input.settings;
  if (input.is_default !== undefined) updatePayload.is_default = input.is_default;

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

/** Hapus kanvas (kecuali kanvas default) */
export async function deleteCanvas(id: string, client?: any): Promise<boolean> {
  const sb = getClient(client);

  try {
    const { error } = await sb.from("canvases").delete().eq("id", id).eq("is_default", false);
    if (error) throw error;
  } catch (err) {
    console.warn("Supabase delete canvas failed:", err);
  }

  const localList = getLocalCanvases();
  const updatedList = localList.filter((c) => c.id !== id || c.is_default);
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
