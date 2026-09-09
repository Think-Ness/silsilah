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
    mediaType?: "photo" | "document" | "video" | "other";
    takenAt?: string;
    personId?: string;
    role?: PersonMediaRole;
    isPrimaryPortrait?: boolean;
  }
): Promise<Media> {
  const { data: { user } } = await supabase.auth.getUser();

  // Generate unique path
  const fileExt = file.name.split(".").pop() || "bin";
  const detectedType = options?.mediaType || (file.type.startsWith("image/") ? "photo" : "document");
  const folder = detectedType === "document" ? "documents" : "uploads";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const storagePath = `${folder}/${fileName}`;

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
      media_type: detectedType,
      mime_type: file.type || (detectedType === "photo" ? "image/jpeg" : "application/octet-stream"),
      file_size_bytes: file.size,
      taken_at: options?.takenAt || null,
      uploaded_by: user?.id,
      visibility: "family",
    })
    .select()
    .single();

  if (error) throw error;
  const media = data as Media;

  // 3. Link ke person jika ada personId
  if (options?.personId) {
    await linkMediaToPerson(
      options.personId,
      media.id,
      options.role || (detectedType === "document" ? "document" : "other"),
      options.isPrimaryPortrait || false
    );
  }

  return media;
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

/** Lepaskan foto profil (portrait) dari person */
export async function removePersonPortrait(personId: string): Promise<void> {
  // 1. Set portrait_media_id ke null pada tabel people
  const { error: personErr } = await supabase
    .from("people")
    .update({ portrait_media_id: null })
    .eq("id", personId);

  if (personErr) throw personErr;

  // 2. Non-aktifkan primary portrait di person_media
  await supabase
    .from("person_media")
    .update({ is_primary_portrait: false })
    .eq("person_id", personId)
    .eq("is_primary_portrait", true);
}

/** Dapatkan public URL dari storage path */
export function getMediaUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function getUserIsolationContext(sb: any) {
  const { data: userData } = await sb.auth.getUser();
  const currentUserId = userData?.user?.id;

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

  // Jika Sigap, otomatis klaim data legacy media yang uploaded_by-nya masih NULL
  if (isSigap && currentUserId) {
    sb.from("media")
      .update({ uploaded_by: currentUserId })
      .is("uploaded_by", null)
      .then(() => {});
  }

  return { currentUserId, isSuperAdmin, isSigap };
}

/** Ambil semua media dengan isolasi kepemilikan user */
export async function getAllMedia(
  options?: {
    media_type?: string;
    limit?: number;
    offset?: number;
  },
  client?: any
): Promise<Media[]> {
  const sb = getClient(client);
  const { currentUserId, isSuperAdmin, isSigap } = await getUserIsolationContext(sb);

  let query = sb
    .from("media")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isSuperAdmin && !isSigap && currentUserId) {
    query = query.eq("uploaded_by", currentUserId);
  }

  if (options?.media_type) query = query.eq("media_type", options.media_type);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Media[]) || [];
}

export interface MediaWithPerson extends Media {
  person_media?: Array<{
    id?: string;
    person_id?: string;
    media_id?: string;
    role: PersonMediaRole;
    is_primary_portrait: boolean;
    created_at?: string;
    person?: {
      id: string;
      full_name: string;
      display_name?: string | null;
      gender?: string | null;
    } | null;
  }>;
}

/** Ambil semua media dengan relasi person dan isolasi kepemilikan user */
export async function getAllMediaWithPeople(
  options?: {
    media_type?: string;
    limit?: number;
    offset?: number;
  },
  client?: any
): Promise<MediaWithPerson[]> {
  const sb = getClient(client);
  const { currentUserId, isSuperAdmin, isSigap } = await getUserIsolationContext(sb);

  try {
    let query = sb
      .from("media")
      .select(`
        *,
        person_media (
          role,
          is_primary_portrait,
          person:people (
            id,
            full_name,
            display_name,
            gender
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (!isSuperAdmin && !isSigap && currentUserId) {
      query = query.eq("uploaded_by", currentUserId);
    }

    if (options?.media_type) query = query.eq("media_type", options.media_type);
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);

    const { data, error } = await query;
    if (error) {
      console.warn("getAllMediaWithPeople joined query error, fallback to simple select:", error);
      return (await getAllMedia(options, client)) as MediaWithPerson[];
    }
    return (data as MediaWithPerson[]) || [];
  } catch (err) {
    console.error("Error in getAllMediaWithPeople:", err);
    return (await getAllMedia(options, client)) as MediaWithPerson[];
  }
}

/** Hapus media (file + record) */
export async function deleteMedia(media: Media | { id: string; storage_path: string }): Promise<void> {
  const supabase = createClient();
  // 1. Hapus dari storage jika ada storage_path
  if (media.storage_path) {
    await supabase.storage.from(BUCKET).remove([media.storage_path]);
  }

  // 2. Hapus record
  const { error } = await supabase.from("media").delete().eq("id", media.id);
  if (error) throw error;
}

/** Hapus media berdasarkan ID dan storage path */
export async function deleteMediaById(id: string, storagePath: string): Promise<void> {
  return deleteMedia({ id, storage_path: storagePath });
}

/** Stats dengan isolasi kepemilikan user */
export async function getMediaStats(client?: any): Promise<{ total: number; photos: number; documents: number }> {
  const sb = getClient(client);
  const { currentUserId, isSuperAdmin, isSigap } = await getUserIsolationContext(sb);

  let query = sb.from("media").select("media_type");
  if (!isSuperAdmin && !isSigap && currentUserId) {
    query = query.eq("uploaded_by", currentUserId);
  }

  const { data } = await query;
  const items: Array<{ media_type: string }> = data || [];
  return {
    total: items.length,
    photos: items.filter((m) => m.media_type === "photo").length,
    documents: items.filter((m) => m.media_type === "document").length,
  };
}
