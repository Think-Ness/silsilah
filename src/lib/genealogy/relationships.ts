// ============================================================
// Genealogy Domain Layer — Relationships Service
// ============================================================

import { createClient } from "@/lib/supabase/client";
import type {
  Union,
  UnionMember,
  ParentChildRelationship,
  CreateUnionInput,
  CreateParentChildInput,
  PersonWithPortrait,
} from "@/types/genealogy";

export interface UnionMortalityInfo {
  isDivorced: boolean;
  isBothDeceased: boolean;
  isOneDeceased: boolean;
  statusLabel: string;
  statusBadgeColor: "rose" | "purple" | "red" | "zinc";
  survivingPartner?: PersonWithPortrait | null;
  deceasedPartner?: PersonWithPortrait | null;
  survivingTitle?: string;
  deceasedTitle?: string;
  doaText: string;
  shortDoa: string;
}

/** Hitung status ikatan perkawinan dan doa berdasarkan vitalitas / wafatnya pasangan */
export function getUnionMortalityInfo(
  members: Array<PersonWithPortrait | null | undefined>,
  union?: Partial<Union> | null
): UnionMortalityInfo {
  const isDivorced = union?.status === "divorced" || union?.status === "ended";
  const [p1, p2] = members;

  const p1Deceased = p1 ? (p1.life_status === "deceased" || !!p1.death_date) : false;
  const p2Deceased = p2 ? (p2.life_status === "deceased" || !!p2.death_date) : false;
  const isBothDeceased = p1Deceased && p2Deceased;
  const isOneDeceased = (p1Deceased || p2Deceased) && !isBothDeceased;

  if (isDivorced) {
    return {
      isDivorced: true,
      isBothDeceased,
      isOneDeceased,
      statusLabel: union?.status === "ended" ? "Berakhir / Pisah" : "Bercerai",
      statusBadgeColor: "red",
      doaText: "Semoga silaturahmi dan kebaikan senantiasa terjaga.",
      shortDoa: "",
    };
  }

  if (isBothDeceased) {
    return {
      isDivorced: false,
      isBothDeceased: true,
      isOneDeceased: false,
      statusLabel: "Keduanya Telah Wafat",
      statusBadgeColor: "zinc",
      doaText: "Semoga Allah SWT merahmati, mengampuni dosa-dosa keduanya, meluaskan kuburnya, dan mempertemukan mereka kembali di surga Firdaus-Nya. Aamiin.",
      shortDoa: "Rahimahumallah",
    };
  }

  if (isOneDeceased) {
    const deceased = p1Deceased ? p1 : p2;
    const survivor = p1Deceased ? p2 : p1;

    const deceasedName = deceased
      ? [deceased.prefix_title, deceased.display_name || deceased.full_name, deceased.suffix_title].filter(Boolean).join(" ")
      : "Pasangan";
    const survivorName = survivor
      ? [survivor.prefix_title, survivor.display_name || survivor.full_name, survivor.suffix_title].filter(Boolean).join(" ")
      : "Pasangan";

    let survivingTitle = "Duda / Janda";
    let deceasedTitle = "Almarhum / Almarhumah";
    let shortDoa = "Rahimahullah / Rahimahallah";
    let statusLabel = "Pasangan Wafat";

    if (survivor?.gender === "male" || deceased?.gender === "female") {
      survivingTitle = "Duda";
      deceasedTitle = "Almarhumah Istri";
      statusLabel = "Duda (Istri Wafat)";
      shortDoa = "Rahimahallah";
    } else if (survivor?.gender === "female" || deceased?.gender === "male") {
      survivingTitle = "Janda";
      deceasedTitle = "Almarhum Suami";
      statusLabel = "Janda (Suami Wafat)";
      shortDoa = "Rahimahullah";
    }

    const doaText = `Semoga ${deceasedTitle} (${deceasedName}) diampuni segala dosanya, diterima segala amal ibadahnya, serta ditempatkan di surga terbaik di sisi Allah SWT. Dan semoga ${survivorName} (${survivingTitle}) senantiasa diberi ketabahan, kekuatan, dan keberkahan hidup. Aamiin.`;

    return {
      isDivorced: false,
      isBothDeceased: false,
      isOneDeceased: true,
      statusLabel,
      statusBadgeColor: "purple",
      survivingPartner: survivor,
      deceasedPartner: deceased,
      survivingTitle,
      deceasedTitle,
      doaText,
      shortDoa,
    };
  }

  return {
    isDivorced: false,
    isBothDeceased: false,
    isOneDeceased: false,
    statusLabel: "Menikah (Aktif)",
    statusBadgeColor: "rose",
    doaText: "Semoga senantiasa menjadi keluarga yang sakinah, mawaddah, warahmah, serta penuh keberkahan.",
    shortDoa: "Sakinah Mawaddah Warahmah",
  };
}

const supabase = createClient();

function getClient(client?: any) {
  return client || supabase;
}

/** Ambil semua unions */
export async function getAllUnions(client?: any): Promise<Union[]> {
  const sb = getClient(client);
  const { data, error } = await sb
    .from("unions")
    .select("*")
    .order("created_at");

  if (error) throw error;
  return (data as Union[]) || [];
}

/** Ambil union berdasarkan ID */
export async function getUnion(id: string): Promise<Union | null> {
  const { data, error } = await supabase
    .from("unions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Union;
}

/** Ambil semua union members untuk union tertentu */
export async function getUnionMembers(unionId: string): Promise<UnionMember[]> {
  const { data, error } = await supabase
    .from("union_members")
    .select("*")
    .eq("union_id", unionId);

  if (error) throw error;
  return (data as UnionMember[]) || [];
}

/** Ambil unions dari satu person */
export async function getPersonUnions(personId: string): Promise<Array<{ union: Union; members: UnionMember[] }>> {
  const { data: memberships, error } = await supabase
    .from("union_members")
    .select("union_id")
    .eq("person_id", personId);

  if (error) throw error;

  const result: Array<{ union: Union; members: UnionMember[] }> = [];

  for (const membership of memberships || []) {
    const union = await getUnion(membership.union_id);
    if (!union) continue;
    const members = await getUnionMembers(union.id);
    result.push({ union, members });
  }

  return result;
}

/** Ambil union antara dua orang jika ada */
export async function getUnionBetweenPeople(
  personAId: string,
  personBId: string
): Promise<Union | null> {
  const { data: memberA, error: errA } = await supabase
    .from("union_members")
    .select("union_id")
    .eq("person_id", personAId);

  if (errA || !memberA || memberA.length === 0) return null;

  const unionIdsA = memberA.map((m) => m.union_id);

  const { data: memberB, error: errB } = await supabase
    .from("union_members")
    .select("union_id")
    .eq("person_id", personBId)
    .in("union_id", unionIdsA);

  if (errB || !memberB || memberB.length === 0) return null;

  const matchedUnionId = memberB[0].union_id;
  return getUnion(matchedUnionId);
}

/** Buat union baru (pasangan) */
export async function createUnion(input: CreateUnionInput): Promise<Union> {
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Buat union
  const { data: union, error: unionError } = await supabase
    .from("unions")
    .insert({
      relationship_type: input.relationship_type,
      start_date: input.start_date,
      start_date_precision: input.start_date_precision || "unknown",
      end_date: input.end_date,
      end_date_precision: input.end_date_precision || "unknown",
      status: input.status || "unknown",
      notes: input.notes,
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select()
    .single();

  if (unionError) throw unionError;

  // 2. Tambahkan anggota
  const { error: membersError } = await supabase
    .from("union_members")
    .insert([
      { union_id: union.id, person_id: input.person_a_id, role: "spouse" },
      { union_id: union.id, person_id: input.person_b_id, role: "spouse" },
    ]);

  if (membersError) throw membersError;

  return union as Union;
}

/** Update union */
export async function updateUnion(
  id: string,
  input: Partial<Omit<CreateUnionInput, "person_a_id" | "person_b_id">>
): Promise<Union> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("unions")
    .update({ ...input, updated_by: user?.id })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Union;
}

/** Hapus union */
export async function deleteUnion(id: string): Promise<void> {
  const { error } = await supabase
    .from("unions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Ambil parent_child_relationships untuk parent tertentu */
export async function getChildRelationships(
  parentId: string
): Promise<ParentChildRelationship[]> {
  const { data, error } = await supabase
    .from("parent_child_relationships")
    .select("*")
    .eq("parent_id", parentId);

  if (error) throw error;
  return (data as ParentChildRelationship[]) || [];
}

/** Ambil parent_child_relationships untuk child tertentu */
export async function getParentRelationships(
  childId: string
): Promise<ParentChildRelationship[]> {
  const { data, error } = await supabase
    .from("parent_child_relationships")
    .select("*")
    .eq("child_id", childId);

  if (error) throw error;
  return (data as ParentChildRelationship[]) || [];
}

/** Ambil semua parent-child relationships */
export async function getAllParentChildRelationships(client?: any): Promise<ParentChildRelationship[]> {
  const sb = getClient(client);
  const { data, error } = await sb
    .from("parent_child_relationships")
    .select("*");

  if (error) throw error;
  return (data as ParentChildRelationship[]) || [];
}

/** Buat parent-child relationship */
export async function createParentChildRelationship(
  input: CreateParentChildInput
): Promise<ParentChildRelationship> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("parent_child_relationships")
    .insert({
      parent_id: input.parent_id,
      child_id: input.child_id,
      union_id: input.union_id,
      relationship_type: input.relationship_type || "parent",
      biological_status: input.biological_status || "biological",
      notes: input.notes,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ParentChildRelationship;
}

/** Hapus parent-child relationship */
export async function deleteParentChildRelationship(id: string): Promise<void> {
  const { error } = await supabase
    .from("parent_child_relationships")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Update union_id untuk parent-child relationship tertentu */
export async function updateParentChildUnion(
  childId: string,
  parentId: string,
  unionId: string
): Promise<void> {
  const { error } = await supabase
    .from("parent_child_relationships")
    .update({ union_id: unionId })
    .eq("child_id", childId)
    .eq("parent_id", parentId);

  if (error) {
    console.warn("Gagal update union_id parent_child_relationships:", error);
  }
}

/** Ambil stats relationships */
export async function getRelationshipStats(client?: any): Promise<{
  totalUnions: number;
  totalParentChild: number;
}> {
  const sb = getClient(client);
  const [unionsRes, pcrRes] = await Promise.all([
    sb.from("unions").select("id", { count: "exact", head: true }),
    sb.from("parent_child_relationships").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalUnions: unionsRes.count || 0,
    totalParentChild: pcrRes.count || 0,
  };
}

/** Update urutan anak untuk parent atau union tertentu */
export async function updateChildOrder(
  parentId: string,
  orderedChildIds: string[],
  coParentId?: string | null
): Promise<void> {
  try {
    const parentIds = [parentId];
    if (coParentId && !parentIds.includes(coParentId)) {
      parentIds.push(coParentId);
    }

    const promises = orderedChildIds.map((childId, idx) =>
      supabase
        .from("parent_child_relationships")
        .update({ sort_order: idx })
        .in("parent_id", parentIds)
        .eq("child_id", childId)
    );

    await Promise.all(promises);
  } catch (err) {
    console.warn("Gagal update sort_order ke Supabase (fallback lokal aktif):", err);
  }
}

