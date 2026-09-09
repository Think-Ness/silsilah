import { getAllUnions, getAllParentChildRelationships } from "@/lib/genealogy/relationships";
import { getAllPeople } from "@/lib/genealogy/people";
import { createClient } from "@/lib/supabase/server";
import { RelationshipsPageClient } from "./RelationshipsPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hubungan Keluarga | Silsilah",
};

export default async function RelationshipsPage() {
  const supabase = await createClient();
  const [unions, parentChildRels, people, unionMembersRes] = await Promise.all([
    getAllUnions(supabase),
    getAllParentChildRelationships(supabase),
    getAllPeople(undefined, supabase),
    supabase.from("union_members").select("*"),
  ]);

  const unionMembers = unionMembersRes.data || [];

  return (
    <RelationshipsPageClient
      unions={unions}
      parentChildRels={parentChildRels}
      people={people}
      unionMembers={unionMembers}
    />
  );
}
