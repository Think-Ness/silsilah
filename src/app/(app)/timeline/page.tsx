import { getTimelineEvents, groupByDecade } from "@/lib/genealogy/timeline";
import { TimelinePageClient } from "./TimelinePageClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Timeline | Silsilah Keluarga",
  description: "Garis waktu kronologis peristiwa penting keluarga",
};

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { person: personId } = await searchParams;

  const events = await getTimelineEvents(personId);
  const byDecade = groupByDecade(events);
  const decadesArr = Array.from(byDecade.entries()).sort((a, b) => a[0] - b[0]);

  // Fetch people list for filter dropdown
  const { data: people } = await supabase
    .from("people")
    .select("id, full_name, display_name, prefix_title, suffix_title, birth_date")
    .is("archived_at", null)
    .order("full_name");

  return (
    <TimelinePageClient
      events={events}
      decadesArr={decadesArr}
      people={people ?? []}
      selectedPersonId={personId}
    />
  );
}
