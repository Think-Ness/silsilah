import { createClient } from "@/lib/supabase/server";
import { getAllMediaWithPeople } from "@/lib/genealogy/media";
import { getAllPeople } from "@/lib/genealogy/people";
import { DocumentsArchiveClient } from "./DocumentsArchiveClient";

export const metadata = {
  title: "Arsip Dokumen | Silsilah Keluarga",
};

export default async function DocumentsPage() {
  const supabase = await createClient();
  const [documents, people] = await Promise.all([
    getAllMediaWithPeople({ media_type: "document" }, supabase),
    getAllPeople(undefined, supabase),
  ]);

  return <DocumentsArchiveClient initialDocuments={documents} people={people} />;
}
