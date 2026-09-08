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
} from "@/types/genealogy";

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
