import { GedcomPageClient } from "./GedcomPageClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "GEDCOM Import/Export | Silsilah Keluarga",
};

export default async function GedcomPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <GedcomPageClient />;
}
