// ============================================================
// Genealogy Domain Layer — People Service
// ============================================================

import { createClient } from "@/lib/supabase/client";
import type {
  Person,
  PersonWithPortrait,
  PersonProfile,
  CreatePersonInput,
} from "@/types/genealogy";

const supabase = createClient();

function getClient(client?: any) {
  return client || supabase;
}

/** Ambil satu person berdasarkan ID */
export async function getPerson(id: string, client?: any): Promise<PersonWithPortrait | null> {
  const sb = getClient(client);
  const cleanId = decodeURIComponent(id).trim().replace(/[\s_]+/g, "-");

  const { data, error } = await sb
    .from("people")
    .select(`
      *,
      portrait:media!people_portrait_media_fk(*)
    `)
    .eq("id", cleanId)
    .is("archived_at", null)
    .single();

  if (error || !data) return null;
  return data as PersonWithPortrait;
}

/** Ambil semua people (tidak diarchive) */
export async function getAllPeople(
  options?: {
    gender?: string;
    life_status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
  client?: any
): Promise<PersonWithPortrait[]> {
  const sb = getClient(client);
  let query = sb
    .from("people")
    .select(`
      *,
      portrait:media!people_portrait_media_fk(id, storage_path, storage_bucket)
    `)
    .is("archived_at", null)
    .order("full_name");

  if (options?.gender) query = query.eq("gender", options.gender);
  if (options?.life_status) query = query.eq("life_status", options.life_status);
  if (options?.search) {
    query = query.or(
      `full_name.ilike.%${options.search}%,display_name.ilike.%${options.search}%,nickname.ilike.%${options.search}%`
    );
  }
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data as PersonWithPortrait[]) || [];
}

/** Ambil full profile person (relasi, kontak, alamat, media) */
export async function getPersonProfile(id: string, client?: any): Promise<PersonProfile | null> {
  const sb = getClient(client);
  const cleanId = decodeURIComponent(id).trim().replace(/[\s_]+/g, "-");

  // Step 1: Eksekusi semua query tingkat pertama secara paralel
  const [
    person,
    parentRelsRes,
    unionMembershipsRes,
    childRelsRes,
    addressesRes,
    contactsRes,
    mediaRes,
  ] = await Promise.all([
    getPerson(cleanId, sb),
    sb.from("parent_child_relationships").select("parent_id").eq("child_id", cleanId),
    sb.from("union_members").select("union_id").eq("person_id", cleanId),
    sb.from("parent_child_relationships").select("child_id, sort_order, created_at").eq("parent_id", cleanId).order("sort_order", { ascending: true }),
    sb.from("addresses").select("*").eq("person_id", cleanId).order("is_current", { ascending: false }),
    sb.from("contacts").select("*").eq("person_id", cleanId),
    sb.from("person_media").select("*").eq("person_id", cleanId),
  ]);

  if (!person) return null;

  const parentIds = (parentRelsRes.data || []).map((r: any) => r.parent_id);
  const unionIds = (unionMembershipsRes.data || []).map((um: any) => um.union_id);
  const childRels = (childRelsRes.data || []) as Array<{ child_id: string; sort_order?: number | null; created_at?: string }>;
  const childIds = [...new Set(childRels.map((r) => r.child_id))];

  // Step 2: Eksekusi query relasi sekunder secara paralel
  const [parentsRes, unionsRes, spouseMembersRes, childrenRes] = await Promise.all([
    parentIds.length > 0
      ? sb
          .from("people")
          .select("*, portrait:media!people_portrait_media_fk(id, storage_path, storage_bucket)")
          .in("id", parentIds)
          .is("archived_at", null)
      : Promise.resolve({ data: [] }),
    unionIds.length > 0
      ? sb.from("unions").select("*").in("id", unionIds)
      : Promise.resolve({ data: [] }),
    unionIds.length > 0
      ? sb.from("union_members").select("union_id, person_id").in("union_id", unionIds).neq("person_id", cleanId)
      : Promise.resolve({ data: [] }),
    childIds.length > 0
      ? sb
          .from("people")
          .select("*, portrait:media!people_portrait_media_fk(id, storage_path, storage_bucket)")
          .in("id", childIds)
          .is("archived_at", null)
      : Promise.resolve({ data: [] }),
  ]);

  // Step 3: Ambil data spouse person dalam 1 query batch
  const spouseMemberPersonIds = [...new Set((spouseMembersRes.data || []).map((m: any) => m.person_id))];
  const spousePersonsRes = spouseMemberPersonIds.length > 0
    ? await sb
        .from("people")
        .select("*, portrait:media!people_portrait_media_fk(id, storage_path, storage_bucket)")
        .in("id", spouseMemberPersonIds)
        .is("archived_at", null)
    : { data: [] };

  const spousePersonMap = new Map((spousePersonsRes.data || []).map((p: any) => [p.id, p]));
  const unionMap = new Map((unionsRes.data || []).map((u: any) => [u.id, u]));

  const spouses: Array<{ person: PersonWithPortrait; union: import("@/types/genealogy").Union }> = [];
  for (const member of spouseMembersRes.data || []) {
    const spousePerson = spousePersonMap.get(member.person_id);
    const union = unionMap.get(member.union_id);
    if (spousePerson && union) {
      spouses.push({
        person: spousePerson as PersonWithPortrait,
        union: union as import("@/types/genealogy").Union,
      });
    }
  }

  // Map sort_order anak dari parent_child_relationships
  const childSortOrderMap = new Map<string, number>();
  for (const rel of childRels) {
    if (typeof rel.sort_order === "number") {
      childSortOrderMap.set(rel.child_id, rel.sort_order);
    }
  }

  // Urutkan daftar anak secara presisi berdasarkan sort_order atau tanggal lahir
  const sortedChildren = ((childrenRes.data as PersonWithPortrait[]) || []).sort((a, b) => {
    const orderA = childSortOrderMap.get(a.id);
    const orderB = childSortOrderMap.get(b.id);
    if (typeof orderA === "number" && typeof orderB === "number" && orderA !== orderB) {
      return orderA - orderB;
    }
    if (typeof orderA === "number") return -1;
    if (typeof orderB === "number") return 1;

    // Fallback: Tanggal lahir (tertua di atas)
    if (a.birth_date && b.birth_date) {
      return a.birth_date.localeCompare(b.birth_date);
    }
    if (a.birth_date) return -1;
    if (b.birth_date) return 1;

    return a.full_name.localeCompare(b.full_name);
  });

  return {
    ...person,
    parents: (parentsRes.data as PersonWithPortrait[]) || [],
    spouses,
    children: sortedChildren,
    addresses: addressesRes.data || [],
    contacts: contactsRes.data || [],
    media: mediaRes.data || [],
  };
}

/** Buat person baru */
export async function createPerson(
  input: CreatePersonInput
): Promise<Person> {
  const { data: { user } } = await supabase.auth.getUser();

  const sanitizedInput: Record<string, any> = {};
  for (const [key, val] of Object.entries(input)) {
    if (val === "" || val === undefined) {
      sanitizedInput[key] = null;
    } else {
      sanitizedInput[key] = val;
    }
  }

  const { data, error } = await supabase
    .from("people")
    .insert({
      ...sanitizedInput,
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Person;
}

/** Update person */
export async function updatePerson(
  id: string,
  input: Partial<CreatePersonInput>,
  customClient?: any
): Promise<Person> {
  const sb = customClient || supabase;
  const { data: { user } } = await sb.auth.getUser();
  const cleanId = decodeURIComponent(id).trim().replace(/[\s_]+/g, "-");

  // Sanitasi input: ubah string kosong "" menjadi null agar kolom DATE dan enum tidak error di Postgres
  const sanitizedInput: Record<string, any> = {};
  for (const [key, val] of Object.entries(input)) {
    if (val === "" || val === undefined) {
      sanitizedInput[key] = null;
    } else {
      sanitizedInput[key] = val;
    }
  }

  // Hindari menimpa kolom immutable
  delete sanitizedInput.id;
  delete sanitizedInput.created_at;

  const { data, error } = await sb
    .from("people")
    .update({ ...sanitizedInput, updated_by: user?.id })
    .eq("id", cleanId)
    .select()
    .single();

  if (error) {
    console.error("Gagal update data anggota di database:", error.message || error.details || error);
    throw new Error(error.message || "Gagal memperbarui data anggota di Supabase");
  }
  return data as Person;
}

/** Archive person (soft delete) */
export async function archivePerson(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("people")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: user?.id,
    })
    .eq("id", id);

  if (error) throw error;
}

/** Hapus anggota silsilah (hard delete dengan fallback aman ke soft delete) */
export async function deletePerson(id: string, client?: any): Promise<void> {
  const sb = getClient(client);
  const cleanId = decodeURIComponent(id).trim().replace(/[\s_]+/g, "-");

  // 1. Coba hard delete (CASCADE di database akan membersihkan relasi terkait)
  const { error: deleteError } = await sb
    .from("people")
    .delete()
    .eq("id", cleanId);

  if (!deleteError) return;

  console.warn("Hard delete dibatasi, beralih ke soft delete arsip:", deleteError.message);

  // 2. Fallback ke arsip (soft delete)
  const { data: { user } } = await sb.auth.getUser();
  const { error: archiveError } = await sb
    .from("people")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: user?.id,
    })
    .eq("id", cleanId);

  if (archiveError) {
    console.error("Gagal menghapus anggota:", archiveError);
    throw new Error(archiveError.message || "Gagal menghapus anggota dari database");
  }
}

/** Restore archived person */
export async function restorePerson(id: string): Promise<void> {
  const { error } = await supabase
    .from("people")
    .update({ archived_at: null, archived_by: null })
    .eq("id", id);

  if (error) throw error;
}

/** Search people */
export async function searchPeople(query: string): Promise<PersonWithPortrait[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from("people")
    .select(`
      *,
      portrait:media!people_portrait_media_fk(id, storage_path, storage_bucket)
    `)
    .or(
      `full_name.ilike.%${query}%,display_name.ilike.%${query}%,nickname.ilike.%${query}%,prefix_title.ilike.%${query}%,occupation.ilike.%${query}%,birth_place.ilike.%${query}%`
    )
    .is("archived_at", null)
    .limit(20);

  if (error) throw error;
  return (data as PersonWithPortrait[]) || [];
}

/** Ambil ancestors dari person */
export async function getAncestors(
  personId: string,
  maxDepth: number = 5
): Promise<Map<string, PersonWithPortrait>> {
  const visited = new Map<string, PersonWithPortrait>();
  const queue: Array<{ id: string; depth: number }> = [
    { id: personId, depth: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;
    if (visited.has(current.id)) continue;

    // Ambil parents
    const { data: parentRels } = await supabase
      .from("parent_child_relationships")
      .select("parent_id")
      .eq("child_id", current.id);

    for (const rel of parentRels || []) {
      if (!visited.has(rel.parent_id)) {
        const parent = await getPerson(rel.parent_id);
        if (parent) {
          visited.set(parent.id, parent);
          queue.push({ id: parent.id, depth: current.depth + 1 });
        }
      }
    }
  }

  return visited;
}

/** Ambil descendants dari person */
export async function getDescendants(
  personId: string,
  maxDepth: number = 3
): Promise<Map<string, PersonWithPortrait>> {
  const visited = new Map<string, PersonWithPortrait>();
  const queue: Array<{ id: string; depth: number }> = [
    { id: personId, depth: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    // Ambil children
    const { data: childRels } = await supabase
      .from("parent_child_relationships")
      .select("child_id")
      .eq("parent_id", current.id);

    const childIds: string[] = [...new Set((childRels || []).map((r: any) => r.child_id as string))];

    for (const childId of childIds) {
      if (!visited.has(childId)) {
        const child = await getPerson(childId);
        if (child) {
          visited.set(child.id, child);
          queue.push({ id: child.id, depth: current.depth + 1 });
        }
      }
    }
  }

  return visited;
}

/** Hitung jumlah statistics */
export async function getPeopleStats(client?: any): Promise<{
  total: number;
  living: number;
  deceased: number;
  unknown: number;
}> {
  const sb = getClient(client);
  const { data, error } = await sb
    .from("people")
    .select("life_status")
    .is("archived_at", null);

  if (error) throw error;

  const people: Array<{ life_status: string }> = data || [];
  return {
    total: people.length,
    living: people.filter((p) => p.life_status === "living").length,
    deceased: people.filter((p) => p.life_status === "deceased").length,
    unknown: people.filter((p) => p.life_status === "unknown").length,
  };
}
