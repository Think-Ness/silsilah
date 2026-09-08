import { notFound, redirect } from "next/navigation";
import { getPerson } from "@/lib/genealogy/people";
import PersonEditForm from "./PersonEditForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cleanId = decodeURIComponent(id).trim().replace(/[\s_]+/g, "-");
  const supabase = await createClient();
  const person = await getPerson(cleanId, supabase);

  if (!person) {
    notFound();
  }

  return <PersonEditForm person={person} />;
}
