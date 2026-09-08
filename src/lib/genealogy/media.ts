// Media service — upload & manage media di Supabase Storage

import { createClient } from "@/lib/supabase/client";
import type { Media, PersonMediaRole } from "@/types/genealogy";

const supabase = createClient();

function getClient(client?: any) {
  return client || supabase;
}
const BUCKET = "media";

/** Upload foto/file ke Supabase Storage */
export async function uploadMedia(
  file: File,
  options?: {
    title?: string;
    description?: string;
  }
): Promise<Media> {
  const { data: { user } } = await supabase.auth.getUser();

  // Generate unique path
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const storagePath = `uploads/${fileName}`;

  // 1. Upload ke Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // 2. Simpan metadata ke tabel media
  const { data, error } = await supabase
    .from("media")
    .insert({
      title: options?.title || file.name,
      description: options?.description,
      storage_path: storagePath,
      storage_bucket: BUCKET,
      media_type: file.type.startsWith("image/") ? "photo" : "document",
      mime_type: file.type,
      file_size_bytes: file.size,
      uploaded_by: user?.id,
      visibility: "family",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Media;
}

/** Link media ke person */
export async function linkMediaToPerson(
  personId: string,
  mediaId: string,
  role: PersonMediaRole = "other",
  isPrimaryPortrait: boolean = false
): Promise<void> {
  // Jika ini portrait utama, reset yang lama
  if (isPrimaryPortrait) {
    await supabase
      .from("person_media")
      .update({ is_primary_portrait: false })
      .eq("person_id", personId)
      .eq("is_primary_portrait", true);

    // Update portrait_media_id di person
    await supabase
      .from("people")
      .update({ portrait_media_id: mediaId })
      .eq("id", personId);
  }

  const { error } = await supabase.from("person_media").upsert({
    person_id: personId,
    media_id: mediaId,
    role,
    is_primary_portrait: isPrimaryPortrait,
  });

  if (error) throw error;
}

/** Dapatkan public URL dari storage path */
export function getMediaUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/** Ambil semua media */
export async function getAllMedia(
  options?: {
    media_type?: string;
    limit?: number;
    offset?: number;
  },
  client?: any
): Promise<Media[]> {
  const sb = getClient(client);
  let query = sb
    .from("media")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.media_type) query = query.eq("media_type", options.media_type);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Media[]) || [];
}

/** Hapus media (file + record) */
export async function deleteMedia(media: Media): Promise<void> {
  const supabase = createClient();
  // 1. Hapus dari storage
  await supabase.storage.from(BUCKET).remove([media.storage_path]);

  // 2. Hapus record
  const { error } = await supabase.from("media").delete().eq("id", media.id);
  if (error) throw error;
}

/** Stats */
export async function getMediaStats(client?: any): Promise<{ total: number; photos: number; documents: number }> {
  const sb = getClient(client);
  const { data } = await sb.from("media").select("media_type");
  const items: Array<{ media_type: string }> = data || [];
  return {
    total: items.length,
    photos: items.filter((m) => m.media_type === "photo").length,
    documents: items.filter((m) => m.media_type === "document").length,
  };
}
