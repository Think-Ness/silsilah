"use server";

import { createClient } from "@/lib/supabase/server";
import type { Canvas, CreateCanvasInput, UpdateCanvasInput } from "@/types/genealogy";

/** Server Action: Buat Kanvas Baru */
export async function createCanvasAction(
  input: CreateCanvasInput
): Promise<{ success: boolean; data?: Canvas; error?: string }> {
  const supabase = await createClient();

  try {
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id || null;

    // Bersihkan settings dan masukkan included_person_ids jika ada
    const settings = {
      ...(input.settings || { displayMode: "branch" }),
      included_person_ids: input.included_person_ids ?? (input.root_person_id ? [input.root_person_id] : null),
    };

    const insertPayload: any = {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      root_person_id: input.root_person_id || null,
      is_default: input.is_default ?? false,
      owner_id: currentUserId,
      is_public: input.is_public ?? false,
      settings,
      custom_positions: {},
      created_by: currentUserId,
    };

    // Coba insert dengan included_person_ids jika kolom ada di DB
    let insertResult = await supabase
      .from("canvases")
      .insert({
        ...insertPayload,
        included_person_ids: settings.included_person_ids,
      })
      .select("*")
      .single();

    // Jika kolom included_person_ids belum ada di DB, fallback insert tanpa kolom tersebut
    if (insertResult.error) {
      insertResult = await supabase
        .from("canvases")
        .insert(insertPayload)
        .select("*")
        .single();
    }

    if (insertResult.error) {
      console.error("createCanvasAction error:", insertResult.error);
      return { success: false, error: insertResult.error.message };
    }

    const created = insertResult.data;

    // Ambil info root_person jika ada
    let rootPerson = null;
    if (created.root_person_id) {
      const { data: personData } = await supabase
        .from("people")
        .select(`
          id, full_name, display_name, gender, life_status,
          portrait:media!people_portrait_media_fk(id, storage_path, storage_bucket)
        `)
        .eq("id", created.root_person_id)
        .maybeSingle();

      rootPerson = personData;
    }

    const finalCanvas: Canvas = {
      ...created,
      root_person: rootPerson,
      user_permission: "owner",
    };

    return { success: true, data: finalCanvas };
  } catch (err: any) {
    console.error("createCanvasAction unexpected error:", err);
    return { success: false, error: err.message || "Gagal membuat kanvas baru" };
  }
}

/** Server Action: Update Kanvas */
export async function updateCanvasAction(
  id: string,
  input: UpdateCanvasInput
): Promise<{ success: boolean; data?: Canvas; error?: string }> {
  const supabase = await createClient();

  try {
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

    let updateResult = await supabase
      .from("canvases")
      .update({
        ...updatePayload,
        ...(input.included_person_ids !== undefined ? { included_person_ids: input.included_person_ids } : {}),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateResult.error) {
      updateResult = await supabase
        .from("canvases")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .single();
    }

    if (updateResult.error) {
      return { success: false, error: updateResult.error.message };
    }

    return { success: true, data: updateResult.data as Canvas };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal mengupdate kanvas" };
  }
}

/** Server Action: Hapus Kanvas */
export async function deleteCanvasAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.from("canvases").delete().eq("id", id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal menghapus kanvas" };
  }
}

/** Server Action: Simpan Posisi Node Kanvas */
export async function saveCanvasPositionsAction(
  canvasId: string,
  positions: Record<string, { x: number; y: number }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("canvases")
      .update({
        custom_positions: positions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", canvasId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
